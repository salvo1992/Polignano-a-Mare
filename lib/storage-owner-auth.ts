import "server-only"

import { AdminApiAuthError, requireAdminIdToken } from "@/lib/admin-api-auth"
import { getAdminAuth } from "@/lib/firebase-admin"
import { isStorageOwnerEmail } from "@/lib/storage-owner"

export async function requireStorageOwner(request: Request): Promise<string> {
  const uid = await requireAdminIdToken(request)
  // Trust Firebase Auth, never the editable email in the Firestore user profile.
  const account = await getAdminAuth().getUser(uid)
  if (account.disabled || !isStorageOwnerEmail(account.email)) {
    throw new AdminApiAuthError("Configurazione archivio riservata al titolare del sito.", 403)
  }
  return uid
}
