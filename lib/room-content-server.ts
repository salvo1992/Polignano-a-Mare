import "server-only"
import { getAdminDb } from "./firebase-admin"
import { ROOM_IDS, resolveRoomContent } from "./room-content"

export async function getRoomContents() {
  const db = getAdminDb()
  const snapshots = await db.getAll(...ROOM_IDS.map(id => db.collection("rooms").doc(id)))
  return snapshots.map((snapshot, i) => resolveRoomContent(ROOM_IDS[i], snapshot.data()?.content))
}
