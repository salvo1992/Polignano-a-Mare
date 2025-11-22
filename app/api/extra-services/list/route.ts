import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get("bookingId")
    const userEmail = searchParams.get("userEmail")

    const db = getAdminDb()

    try {
      let query: any = db.collection("extra_services_requests")

      if (bookingId) {
        query = query.where("bookingId", "==", bookingId)
      } else if (userEmail) {
        query = query.where("userEmail", "==", userEmail)
      }

      query = query.orderBy("createdAt", "desc")

      const snapshot = await query.limit(50).get()
      const requests = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      return NextResponse.json({ requests })
    } catch (indexError: any) {
      if (indexError.code === 9) {
        console.log("[v0] Firestore index missing, using fallback without ordering")

        let query: any = db.collection("extra_services_requests")

        if (bookingId) {
          query = query.where("bookingId", "==", bookingId)
        } else if (userEmail) {
          query = query.where("userEmail", "==", userEmail)
        }

        const snapshot = await query.limit(50).get()
        const requests = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .sort((a: any, b: any) => {
            const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt)
            const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt)
            return dateB.getTime() - dateA.getTime()
          })

        return NextResponse.json({ requests })
      }
      throw indexError
    }
  } catch (error) {
    console.error("Error fetching service requests:", error)
    return NextResponse.json({ error: "Errore durante il caricamento" }, { status: 500 })
  }
}
