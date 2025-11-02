import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const today = new Date()
    const todayStr = today.toISOString().split("T")[0]

    // Calculate dates for reminders
    const in7Days = new Date(today)
    in7Days.setDate(today.getDate() + 7)
    const in7DaysStr = in7Days.toISOString().split("T")[0]

    const in30Days = new Date(today)
    in30Days.setDate(today.getDate() + 30)
    const in30DaysStr = in30Days.toISOString().split("T")[0]

    const db = getAdminDb()

    // Get all bookings
    const bookingsSnapshot = await db.collection("bookings").get()
    const bookings = bookingsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    let checkinRemindersSent = 0
    let monthlyRemindersSent = 0

    // Process each booking
    for (const booking of bookings) {
      if (booking.status !== "paid" && booking.status !== "confirmed") {
        continue
      }

      // Get user data
      const userDoc = await db.collection("users").doc(booking.userId).get()
      const userData = userDoc.data()

      if (!userData || !userData.email) {
        continue
      }

      // Check if user wants reminders
      const wantsCheckinReminders = userData.notificationPreferences?.checkinReminders !== false
      const wantsMonthlyReminders = userData.notificationPreferences?.confirmEmails !== false

      // Send check-in reminder (7 days before)
      if (wantsCheckinReminders && booking.checkIn === in7DaysStr) {
        try {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL!,
            to: userData.email,
            subject: `Promemoria: Check-in tra 7 giorni - ${booking.roomName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #0ea5e9;">Promemoria Check-in</h2>
                <p>Ciao ${userData.firstName || ""},</p>
                <p>Ti ricordiamo che il tuo check-in è previsto tra <strong>7 giorni</strong>:</p>
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Camera:</strong> ${booking.roomName}</p>
                  <p><strong>Check-in:</strong> ${new Date(booking.checkIn).toLocaleDateString("it-IT")}</p>
                  <p><strong>Check-out:</strong> ${new Date(booking.checkOut).toLocaleDateString("it-IT")}</p>
                  <p><strong>Numero prenotazione:</strong> ${booking.id}</p>
                </div>
                <p>Non vediamo l'ora di darti il benvenuto!</p>
                <p>Per qualsiasi domanda, contattaci a ${process.env.NEXT_PUBLIC_PRIVACY_EMAIL}</p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px;">Al 22 Suite & Spa Luxury Experience</p>
              </div>
            `,
          })
          checkinRemindersSent++
        } catch (error) {
          console.error(`Failed to send check-in reminder to ${userData.email}:`, error)
        }
      }

      // Send monthly reminder (30 days before)
      if (wantsMonthlyReminders && booking.checkIn === in30DaysStr) {
        try {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL!,
            to: userData.email,
            subject: `Promemoria: La tua prenotazione è tra un mese - ${booking.roomName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #0ea5e9;">Promemoria Prenotazione</h2>
                <p>Ciao ${userData.firstName || ""},</p>
                <p>Ti ricordiamo che la tua prenotazione è prevista tra <strong>un mese</strong>:</p>
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Camera:</strong> ${booking.roomName}</p>
                  <p><strong>Check-in:</strong> ${new Date(booking.checkIn).toLocaleDateString("it-IT")}</p>
                  <p><strong>Check-out:</strong> ${new Date(booking.checkOut).toLocaleDateString("it-IT")}</p>
                  <p><strong>Numero prenotazione:</strong> ${booking.id}</p>
                  <p><strong>Totale:</strong> €${booking.totalPrice?.toFixed(2) || "0.00"}</p>
                </div>
                <p>Se hai bisogno di modificare la tua prenotazione, puoi farlo dal tuo account.</p>
                <p>Per qualsiasi domanda, contattaci a ${process.env.NEXT_PUBLIC_PRIVACY_EMAIL}</p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px;">Al 22 Suite & Spa Luxury Experience</p>
              </div>
            `,
          })
          monthlyRemindersSent++
        } catch (error) {
          console.error(`Failed to send monthly reminder to ${userData.email}:`, error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      checkinRemindersSent,
      monthlyRemindersSent,
      totalSent: checkinRemindersSent + monthlyRemindersSent,
    })
  } catch (error) {
    console.error("Error sending reminders:", error)
    return NextResponse.json({ error: "Failed to send reminders" }, { status: 500 })
  }
}
