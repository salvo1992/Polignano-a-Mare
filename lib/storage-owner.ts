// UI eligibility only. The API also verifies the authenticated account server-side.
export const STORAGE_OWNER_EMAIL = "al22suite@gmail.com"

export function isStorageOwnerEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === STORAGE_OWNER_EMAIL
}
