"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode, useRef } from "react"
import { onIdTokenChanged, type User as FirebaseUser } from "firebase/auth"
import {
  auth,
  db,
  registerWithEmail,
  loginWithEmail,
  loginWithGoogle,
  handleGoogleRedirect,
  logout as fbLogout,
} from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

export type AppRole = "user" | "admin"

export interface AppUser {
  uid: string
  email: string
  displayName?: string | null
  photoURL?: string | null
  role: AppRole
  idToken?: string
}

interface AuthContextType {
  user: AppUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  loginWithGoogleProvider: () => Promise<{ success: boolean; error?: any }>
  register: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  isCheckingRedirect: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ---------- HELPERS ----------
async function readUserRole(uid: string): Promise<AppRole> {
  try {
    const snap = await getDoc(doc(db, "users", uid))
    if (!snap.exists()) return "user"
    const raw = (snap.data()?.role as string | undefined) ?? "user"
    return raw === "admin" ? "admin" : "user"
  } catch {
    return "user"
  }
}

function firebaseToAppUser(fbUser: FirebaseUser, idToken: string, role: AppRole): AppUser {
  return {
    uid: fbUser.uid,
    email: fbUser.email ?? "",
    displayName: fbUser.displayName,
    photoURL: fbUser.photoURL,
    role,
    idToken,
  }
}

// Imposta i cookie httpOnly lato server per la middleware
async function setSessionCookies(token: string, role: AppRole) {
  await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, role }),
  })
}

// Pulisce i cookie httpOnly lato server
async function clearSessionCookies() {
  await fetch("/api/session", { method: "DELETE" })
}

// ---------- PROVIDER ----------
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingRedirect, setIsCheckingRedirect] = useState(true)
  const hasCheckedRedirectRef = useRef(false)

  // Gestione redirect Google (una sola volta)
  useEffect(() => {
    if (hasCheckedRedirectRef.current) return
    hasCheckedRedirectRef.current = true

    ;(async () => {
      try {
        const fbUser = await handleGoogleRedirect()
        if (fbUser) {
          const [idToken, role] = await Promise.all([fbUser.getIdToken(true), readUserRole(fbUser.uid)])
          await setSessionCookies(idToken, role)
          setUser(firebaseToAppUser(fbUser, idToken, role))
          sessionStorage.removeItem("google_auth_error")
        }
      } catch (error: any) {
        if (error?.code) sessionStorage.setItem("google_auth_error", error.code)
        console.error("[auth] google redirect error", error)
      } finally {
        setIsCheckingRedirect(false)
      }
    })()
  }, [])

  // Sottoscrizione token/utente
  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (fbUser) => {
      try {
        if (!fbUser) {
          setUser(null)
          await clearSessionCookies()
          setIsLoading(false)
          return
        }
        const [idToken, role] = await Promise.all([fbUser.getIdToken(false), readUserRole(fbUser.uid)])
        await setSessionCookies(idToken, role)
        setUser(firebaseToAppUser(fbUser, idToken, role))
      } catch (e) {
        console.error("onIdTokenChanged error", e)
        setUser(null)
        await clearSessionCookies()
      } finally {
        setIsLoading(false)
      }
    })
    return () => unsub()
  }, [])

  const refreshToken = async () => {
    if (!auth.currentUser) return
    const [idToken, role] = await Promise.all([
      auth.currentUser.getIdToken(true),
      readUserRole(auth.currentUser.uid),
    ])
    await setSessionCookies(idToken, role)
    setUser(firebaseToAppUser(auth.currentUser, idToken, role))
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      const fbUser = await loginWithEmail(email, password)
      const [idToken, role] = await Promise.all([fbUser.getIdToken(true), readUserRole(fbUser.uid)])
      await setSessionCookies(idToken, role)
      setUser(firebaseToAppUser(fbUser, idToken, role))
      return true
    } catch (e) {
      console.error("login error", e)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const loginWithGoogleProvider = async (): Promise<{ success: boolean; error?: any }> => {
    try {
      sessionStorage.removeItem("google_auth_error")
      const fbUser = await loginWithGoogle() // in dev popup → ritorna user; in prod redirect → ritorna null
      if (fbUser) {
        const [idToken, role] = await Promise.all([fbUser.getIdToken(true), readUserRole(fbUser.uid)])
        await setSessionCookies(idToken, role)
        setUser(firebaseToAppUser(fbUser, idToken, role))
      }
      return { success: true }
    } catch (e: any) {
      if (e?.code) sessionStorage.setItem("google_auth_error", e.code)
      console.error("[auth] Google login error:", e)
      return { success: false, error: e }
    }
  }

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      const fbUser = await registerWithEmail(email, password)
      const [idToken, role] = await Promise.all([fbUser.getIdToken(true), readUserRole(fbUser.uid)])
      await setSessionCookies(idToken, role)
      setUser(firebaseToAppUser(fbUser, idToken, role))
      return true
    } catch (e) {
      console.error("register error", e)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    await fbLogout()
    await clearSessionCookies()
    setUser(null)
  }

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      login,
      loginWithGoogleProvider,
      register,
      logout,
      refreshToken,
      isCheckingRedirect,
    }),
    [user, isLoading, isCheckingRedirect],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}

