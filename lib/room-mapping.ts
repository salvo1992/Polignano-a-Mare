/**
 * Centralized room mapping between the site and Smoobu.
 * 
 * Site rooms:
 *   ID "1" = "Suite Acies con Balcone"      -> Smoobu name: "Acies"
 *   ID "2" = "Suite Acquaroom con Idromassaggio" -> Smoobu name: "Aquarum"
 *
 * All files MUST import from here instead of duplicating mappings.
 */

export interface RoomMapping {
  localId: string
  localName: string
  smoobuName: string
  smoobuApartmentId?: string // populated at runtime from Smoobu API
}

export const ROOM_MAPPINGS: RoomMapping[] = [
  {
    localId: "1",
    localName: "Suite Acies con Balcone",
    smoobuName: "Acies",
  },
  {
    localId: "2",
    localName: "Suite Acquaroom con Idromassaggio",
    smoobuName: "Aquarum",
  },
]

// --- Lookup helpers ---

/** Get local room name from local ID */
export function getRoomName(localId: string): string {
  const room = ROOM_MAPPINGS.find((r) => r.localId === localId)
  return room?.localName || `Camera ${localId}`
}

/** Get local room ID from local room name */
export function getRoomIdByName(name: string): string {
  const lower = name.toLowerCase()
  const room = ROOM_MAPPINGS.find(
    (r) => r.localName.toLowerCase() === lower || r.smoobuName.toLowerCase() === lower,
  )
  return room?.localId || ""
}

/** Get Smoobu apartment name from local ID */
export function getSmoobuName(localId: string): string {
  const room = ROOM_MAPPINGS.find((r) => r.localId === localId)
  return room?.smoobuName || ""
}

/**
 * Convert a Smoobu apartment ID (numeric) to our local room ID.
 * We match by checking the apartment name returned by Smoobu against our mapping.
 * If the Smoobu apartment ID was cached via setSmoobuApartmentIds(), use direct mapping.
 */
const smoobuIdToLocalId: Record<string, string> = {}

/** Call this once after fetching Smoobu apartments to populate the ID mapping */
export function setSmoobuApartmentIds(apartments: { id: number; name: string }[]): void {
  for (const apt of apartments) {
    const aptNameLower = apt.name.toLowerCase()
    const match = ROOM_MAPPINGS.find((r) => aptNameLower.includes(r.smoobuName.toLowerCase()))
    if (match) {
      smoobuIdToLocalId[apt.id.toString()] = match.localId
      match.smoobuApartmentId = apt.id.toString()
    }
  }
}

/** Convert Smoobu apartment ID to local room ID */
export function convertSmoobuApartmentIdToLocal(smoobuApartmentId: string | undefined): string {
  if (!smoobuApartmentId) return ""

  // Direct mapping (populated after setSmoobuApartmentIds)
  if (smoobuIdToLocalId[smoobuApartmentId]) {
    return smoobuIdToLocalId[smoobuApartmentId]
  }

  // Fallback: return as-is (might already be a local ID)
  const isLocalId = ROOM_MAPPINGS.some((r) => r.localId === smoobuApartmentId)
  if (isLocalId) return smoobuApartmentId

  return smoobuApartmentId
}

/** Convert local room ID to Smoobu apartment ID (if known) */
export function convertLocalIdToSmoobuApartmentId(localId: string): string | null {
  const room = ROOM_MAPPINGS.find((r) => r.localId === localId)
  return room?.smoobuApartmentId || null
}

/**
 * Smart room matching: given any identifier (local ID, Smoobu ID, name),
 * returns the local room ID.
 */
export function resolveToLocalRoomId(identifier: string | undefined): string {
  if (!identifier) return ""

  // 1. Direct local ID
  const byId = ROOM_MAPPINGS.find((r) => r.localId === identifier)
  if (byId) return byId.localId

  // 2. Smoobu apartment ID
  const fromSmoobu = convertSmoobuApartmentIdToLocal(identifier)
  if (fromSmoobu && ROOM_MAPPINGS.some((r) => r.localId === fromSmoobu)) return fromSmoobu

  // 3. Name match (case-insensitive, partial)
  const lower = identifier.toLowerCase()
  const byName = ROOM_MAPPINGS.find(
    (r) =>
      r.localName.toLowerCase().includes(lower) ||
      lower.includes(r.localName.toLowerCase()) ||
      r.smoobuName.toLowerCase().includes(lower) ||
      lower.includes(r.smoobuName.toLowerCase()),
  )
  if (byName) return byName.localId

  return identifier
}

/** Booking form select options */
export const ROOM_SELECT_OPTIONS = ROOM_MAPPINGS.map((r) => ({
  value: r.localId,
  label: r.localName,
}))
