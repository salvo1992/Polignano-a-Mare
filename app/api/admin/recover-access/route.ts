import { NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"

const RECOVERY_ADMIN_EMAIL = "al22suite@gmail.com"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization")
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Autenticazione richiesta" }, { status: 401 })
  }

  try {
    const token = authorization.slice("Bearer ".length).trim()
    const decodedToken = await getAdminAuth().verifyIdToken(token)
    const email = decodedToken.email?.trim().toLowerCase()

    if (email !== RECOVERY_ADMIN_EMAIL) {
      return NextResponse.json({ error: "Account non autorizzato al recupero admin" }, { status: 403 })
    }

    await getAdminDb().collection("users").doc(decodedToken.uid).set(
      {
        uid: decodedToken.uid,
        email,
        role: "admin",
        adminRecoveredAt: new Date(),
      },
      { merge: true },
    )

    return NextResponse.json(
      { success: true, role: "admin" },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("[Admin Recovery] Recupero fallito:", error)
    return NextResponse.json({ error: "Sessione non valida o recupero non disponibile" }, { status: 401 })
  }
}
