import { initializeApp, getApps, getApp } from "firebase/app"
import {
  getAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  onIdTokenChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  type User,
} from "firebase/auth"
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  type Timestamp,
} from "firebase/firestore"
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions"
import { getStorage } from "firebase/storage"

// ---------- INIT ----------
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const functions = getFunctions(app)

if (process.env.NEXT_PUBLIC_USE_FUNCTIONS_EMULATOR === "true") {
  connectFunctionsEmulator(functions, "127.0.0.1", 5001)
}

// ---------- USER DOC ----------
export type UserDoc = {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  provider: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
  role: "user" | "admin"
  firstName?: string
  lastName?: string
  phone?: string
  notifications?: {
    confirmEmails?: boolean
    promos?: boolean
    checkinReminders?: boolean
  }
}

export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const ref = doc(db, "users", uid)
  const snap = await getDoc(ref)
  return snap.exists() ? (snap.data() as UserDoc) : null
}

async function ensureUserDoc(user: User) {
  const ref = doc(db, "users", user.uid)
  const snap = await getDoc(ref)

  const base = {
    uid: user.uid,
    email: user.email ?? "",
    displayName: user.displayName ?? "",
    photoURL: user.photoURL ?? "",
    provider: user.providerData?.[0]?.providerId ?? "password",
    updatedAt: serverTimestamp(),
  }

  if (!snap.exists()) {
    await setDoc(ref, {
      ...base,
      role: "user",
      createdAt: serverTimestamp(),
      notifications: {
        confirmEmails: true,
        promos: false,
        checkinReminders: true,
      },
    })
  } else {
    await updateDoc(ref, base)
  }
}

// ---------- AUTH ----------
const googleProvider = new GoogleAuthProvider()

export async function registerWithEmail(email: string, password: string, displayName?: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  if (displayName) {
    await ensureUserDoc({ ...cred.user, displayName } as User)
    await updateDoc(doc(db, "users", cred.user.uid), { displayName })
  } else {
    await ensureUserDoc(cred.user)
  }
  return cred.user
}

export async function loginWithEmail(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  await ensureUserDoc(cred.user)
  return cred.user
}

export async function loginWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider)
  await ensureUserDoc(cred.user)
  return cred.user
}

export async function logout() {
  await signOut(auth)
}

export function onToken(cb: (token: string | null, user: User | null) => void) {
  return onIdTokenChanged(auth, async (user) => {
    if (!user) return cb(null, null)
    const token = await user.getIdToken(true)
    cb(token, user)
  })
}

export async function getCurrentIdToken(forceRefresh = false) {
  const user = auth.currentUser
  if (!user) return null
  return user.getIdToken(forceRefresh)
}

export async function secureChangePassword(email: string, currentPassword: string, newPassword: string) {
  const user = auth.currentUser
  if (!user || !user.email) throw new Error("Nessun utente autenticato")
  if (user.email !== email) throw new Error("Email non corrispondente all'utente attuale")
  const cred = EmailAuthProvider.credential(email, currentPassword)
  await reauthenticateWithCredential(user, cred)
  await updatePassword(user, newPassword)
}

export async function secureDeleteAccount(email: string, currentPassword: string) {
  const user = auth.currentUser
  if (!user || !user.email) throw new Error("Nessun utente autenticato")
  if (user.email !== email) throw new Error("Email non corrispondente all'utente attuale")
  const cred = EmailAuthProvider.credential(email, currentPassword)
  await reauthenticateWithCredential(user, cred)
  await deleteDoc(doc(db, "users", user.uid)).catch(() => {})
  await user.delete()
}

// ---------- BOOKINGS ----------
export type BookingPayload = {
  checkIn: string
  checkOut: string
  guests: number
  firstName: string
  lastName: string
  email: string
  phone?: string
  notes?: string
  roomId: string
  roomName: string
  pricePerNight: number
  currency?: "EUR"
  totalAmount?: number
  nights?: number
  status?: "pending" | "paid" | "confirmed" | "cancelled"
  origin?: "site" | "booking" | "airbnb" | "manual"
  paymentId?: string
  paymentProvider?: "stripe" | "paypal" | "satispay" | "unicredit"
}

const BOOKINGS_COL = "bookings"

export function computeNights(checkInISO: string, checkOutISO: string) {
  const inD = new Date(checkInISO + "T00:00:00")
  const outD = new Date(checkOutISO + "T00:00:00")
  const ms = outD.getTime() - inD.getTime()
  const nights = Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)))
  return nights
}

export function computeTotalEUR(pricePerNight: number, nights: number, taxes = 0, serviceFee = 0) {
  const subtotal = pricePerNight * nights
  return Math.max(0, Math.round((subtotal + taxes + serviceFee) * 100) / 100)
}

export async function createBooking(payload: BookingPayload) {
  if (!payload.checkIn || !payload.checkOut) throw new Error("Date mancanti")
  const nights = computeNights(payload.checkIn, payload.checkOut)
  if (nights <= 0) throw new Error("Intervallo date non valido")

  const total = payload.totalAmount ?? computeTotalEUR(payload.pricePerNight, nights)

  const colRef = collection(db, BOOKINGS_COL)
  const docRef = await addDoc(colRef, {
    ...payload,
    nights,
    totalAmount: total,
    currency: payload.currency ?? "EUR",
    status: payload.status ?? "pending",
    origin: payload.origin ?? "site",
    userId: auth.currentUser?.uid ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateBooking(
  id: string,
  patch: Partial<BookingPayload> & { status?: BookingPayload["status"] },
) {
  await updateDoc(doc(db, BOOKINGS_COL, id), {
    ...patch,
    updatedAt: serverTimestamp(),
  })
}

export async function getBookingById(id: string) {
  const snap = await getDoc(doc(db, BOOKINGS_COL, id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function listMyBookings(limitN = 50) {
  const uid = auth.currentUser?.uid
  if (!uid) return []
  const q = query(collection(db, BOOKINGS_COL), where("userId", "==", uid), orderBy("createdAt", "desc"), limit(limitN))
  const s = await getDocs(q)
  return s.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function listAllBookingsForAdmin(limitN = 100) {
  const qy = query(collection(db, BOOKINGS_COL), orderBy("createdAt", "desc"), limit(limitN))
  const s = await getDocs(qy)
  return s.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function cancelBooking(id: string) {
  await updateDoc(doc(db, BOOKINGS_COL, id), {
    status: "cancelled",
    updatedAt: serverTimestamp(),
  })
}

export async function confirmBooking(id: string) {
  await updateDoc(doc(db, BOOKINGS_COL, id), {
    status: "confirmed",
    updatedAt: serverTimestamp(),
  })
}

// ---------- ROOMS MANAGEMENT ----------
export type RoomData = {
  id: string
  name: string
  description: string
  price: number
  capacity: number
  beds: number
  bathrooms: number
  size: number
  status: "available" | "booked" | "maintenance"
  amenities: string[]
  images: string[]
}

export async function getRoomById(roomId: string): Promise<RoomData | null> {
  const snap = await getDoc(doc(db, "rooms", roomId))
  return snap.exists() ? (snap.data() as RoomData) : null
}

export async function getAllRooms(): Promise<RoomData[]> {
  const snap = await getDocs(collection(db, "rooms"))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RoomData)
}

export async function updateRoomPrice(roomId: string, newPrice: number) {
  await updateDoc(doc(db, "rooms", roomId), {
    price: newPrice,
    updatedAt: serverTimestamp(),
  })
}

export async function updateRoomStatus(roomId: string, status: "available" | "booked" | "maintenance") {
  await updateDoc(doc(db, "rooms", roomId), {
    status,
    updatedAt: serverTimestamp(),
  })
}

// ---------- PAYMENTS ----------
type CreateCheckoutArgs = {
  bookingId: string
  amount: number
  currency: string
  successUrl: string
  cancelUrl: string
  customerEmail?: string
  metadata?: Record<string, string>
}

export async function createStripeCheckout(args: CreateCheckoutArgs): Promise<{ url: string }> {
  const response = await fetch("/api/payments/stripe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Stripe checkout creation failed")
  }

  return response.json()
}

export async function createPayPalOrder(args: CreateCheckoutArgs): Promise<{ id: string; approveUrl: string }> {
  const response = await fetch("/api/payments/paypal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "PayPal order creation failed")
  }

  return response.json()
}

export async function capturePayPalOrder(orderId: string): Promise<{ status: string }> {
  const callable = httpsCallable(functions, "payments-capturePayPalOrder")
  const res = await callable({ orderId })
  return res.data as { status: "pending" | "succeeded" | "failed" | "canceled" | "requires_action" }
}

export async function createSatispayPayment(args: CreateCheckoutArgs): Promise<{ redirectUrl: string; id: string }> {
  const response = await fetch("/api/payments/satispay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Satispay payment creation failed")
  }

  return response.json()
}

export async function createUniCreditPayment(args: CreateCheckoutArgs): Promise<{ redirectUrl: string; id: string }> {
  const response = await fetch("/api/payments/unicredit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "UniCredit payment creation failed")
  }

  return response.json()
}

export async function checkPaymentStatus(provider: "stripe" | "paypal" | "satispay" | "unicredit", paymentId: string) {
  const callable = httpsCallable(functions, "payments-checkPaymentStatus")
  const res = await callable({ provider, paymentId })
  return res.data as { status: "pending" | "succeeded" | "failed" | "canceled" | "requires_action" }
}

export async function processPaymentAndCreateBooking(
  bookingPayload: BookingPayload,
  paymentProvider: "stripe" | "paypal" | "satispay" | "unicredit",
  paymentId: string,
): Promise<{ success: boolean; bookingId?: string; error?: string }> {
  try {
    // Check payment status
    const paymentStatus = await checkPaymentStatus(paymentProvider, paymentId)

    if (paymentStatus.status !== "succeeded") {
      return { success: false, error: "Pagamento non confermato" }
    }

    // Payment successful, create booking
    const bookingId = await createBooking({
      ...bookingPayload,
      status: "paid",
      paymentId,
      paymentProvider,
    })

    // Confirm booking
    await confirmBooking(bookingId)

    return { success: true, bookingId }
  } catch (error) {
    console.error("Error processing payment and booking:", error)
    return { success: false, error: "Errore durante la creazione della prenotazione" }
  }
}
