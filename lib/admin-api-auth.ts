import "server-only"

import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"

export async function requireAdminIdToken(request: Request): Promise<string> {
  const authorization = request.headers.get("authorization")

  if (!authorization?.startsWith("Bearer ")) {
    throw new AdminApiAuthError("Autenticazione richiesta", 401)
  }

  const token = authorization.slice("Bearer ".length).trim()
  if (!token) {
    throw new AdminApiAuthError("Autenticazione richiesta", 401)
  }

  let uid: string
  try {
    const decodedToken = await getAdminAuth().verifyIdToken(token)
    uid = decodedToken.uid
  } catch {
    throw new AdminApiAuthError("Sessione non valida o scaduta", 401)
  }

  const adminUser = await getAdminDb().collection("users").doc(uid).get()
  if (!adminUser.exists || adminUser.data()?.role !== "admin") {
    throw new AdminApiAuthError("Accesso riservato agli amministratori", 403)
  }

  return uid
}

export class AdminApiAuthError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = "AdminApiAuthError"
  }
}
