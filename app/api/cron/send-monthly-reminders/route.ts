import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = getAdminDb()
    const today = new Date()
    const oneMonthFromNow = new Date(today)
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1)

    // Get all upcoming bookings in the next month
    const bookingsSnapshot = await db
      .collection("bookings")
      .where("status", "in", ["paid", "confirmed"])
      .where("checkIn", ">=", today.toISOString().split("T")[0])
      .where("checkIn", "<=", oneMonthFromNow.toISOString().split("T")[0])
      .get()

    let emailsSent = 0

    for (const doc of bookingsSnapshot.docs) {
      const booking = doc.data()

      // Check if user wants monthly reminders
      if (booking.userId) {
        const userDoc = await db.collection("users").doc(booking.userId).get()
        const userData = userDoc.data()

        if (userData?.notifications?.checkinReminders === false) {
          continue // Skip if user disabled reminders
        }
      }

      // Send monthly reminder email
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "noreply@al22suite.com",
          to: booking.email,
          subject: `Promemoria: La tua prenotazione ad AL 22 Suite`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #8B4513;">Ciao ${booking.firstName}!</h2>
              
              <p>Ti ricordiamo che hai una prenotazione confermata presso <strong>AL 22 Suite & Spa</strong>.</p>

              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Camera:</strong> ${booking.roomName}</p>
                <p><strong>Check-in:</strong> ${new Date(booking.checkIn).toLocaleDateString("it-IT", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                <p><strong>Check-out:</strong> ${new Date(booking.checkOut).toLocaleDateString("it-IT", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                <p><strong>Numero conferma:</strong> ${doc.id.slice(0, 12).toUpperCase()}</p>
              </div>

              <p>Non vediamo l'ora di darti il benvenuto!</p>

              <a href="https://al22suite.com/user/booking/${doc.id}" style="display: inline-block; background: #8B4513; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
                Visualizza Prenotazione
              </a>

              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                Se non desideri più ricevere questi promemoria, puoi disattivarli nelle <a href="https://al22suite.com/user">impostazioni del tuo account</a>.
              </p>
            </div>
          `,
        })

        emailsSent++
      } catch (emailError) {
        console.error(`Error sending email to ${booking.email}:`, emailError)
      }
    }

    console.log(`[Cron] Monthly reminders sent: ${emailsSent}`)

    return NextResponse.json({
      success: true,
      emailsSent,
    })
  } catch (error: any) {
    console.error("[Cron] Error sending monthly reminders:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
