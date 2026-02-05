import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { bookingId, roomName, checkIn, checkOut, guestName } = await request.json()

    const smoobuCalendarUrl = `https://login.smoobu.com/en/cockpit/calendar`

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: process.env.RESEND_FROM_EMAIL!,
      subject: `Nuova Prenotazione Sito - Verifica su Smoobu`,
      html: `
        <h2>Nuova Prenotazione dal Sito Web</h2>
        <p><strong>INFO:</strong> Le date vengono bloccate automaticamente su Smoobu. Verifica che tutto sia sincronizzato correttamente.</p>
        
        <h3>Dettagli Prenotazione:</h3>
        <ul>
          <li><strong>ID Prenotazione:</strong> ${bookingId}</li>
          <li><strong>Camera:</strong> ${roomName}</li>
          <li><strong>Ospite:</strong> ${guestName}</li>
          <li><strong>Check-in:</strong> ${checkIn}</li>
          <li><strong>Check-out:</strong> ${checkOut}</li>
        </ul>

        <p><a href="${smoobuCalendarUrl}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
          Vai al Calendario Smoobu
        </a></p>

        <hr style="margin: 24px 0;">
        <p style="color: #666; font-size: 14px;">
          <strong>Nota:</strong> Le date sono state bloccate automaticamente tramite l'API Smoobu.<br>
          La sincronizzazione con Booking.com e Airbnb avviene automaticamente tramite Smoobu.
        </p>
      `
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Error sending admin notification:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}
