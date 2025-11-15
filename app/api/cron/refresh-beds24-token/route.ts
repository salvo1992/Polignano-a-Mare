import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log('[v0] Running scheduled Beds24 token refresh...')

    // Chiama l'API per refreshare il write token
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/beds24/refresh-token`, {
      method: 'POST',
    })

    if (!response.ok) {
      // Token refresh fallito - notifica l'admin
      console.error('[v0] Token refresh failed, notifying admin...')
      
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: process.env.RESEND_FROM_EMAIL!,
        subject: '⚠️ Beds24 Token Refresh Fallito',
        html: `
          <h2>Attenzione: Problema con Beds24 Token</h2>
          <p>Il refresh automatico del write token Beds24 è fallito.</p>
          
          <h3>Possibili Cause:</h3>
          <ul>
            <li>Il refresh token è scaduto o è stato revocato</li>
            <li>Problemi di connessione con l'API Beds24</li>
            <li>Permessi insufficienti sul token</li>
          </ul>
          
          <h3>Azione Richiesta:</h3>
          <ol>
            <li>Accedi al pannello Beds24: <a href="https://beds24.com/control2.php">beds24.com/control2.php</a></li>
            <li>Vai su Settings → API</li>
            <li>Genera un nuovo Refresh Token con permessi <strong>READ AND WRITE</strong></li>
            <li>Aggiorna la variabile d'ambiente <code>BEDS24_REFRESH_TOKEN</code> nella sezione Vars di Vercel</li>
          </ol>

          <p style="color: #666; margin-top: 24px;">
            <strong>Importante:</strong> Senza un token valido, le prenotazioni dal sito non bloccheranno automaticamente 
            le date su Booking.com e Airbnb. Riceverai comunque email di notifica per gestire manualmente le prenotazioni.
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 32px;">
            Questo è un messaggio automatico dal sistema di gestione AL 22 Suite.
          </p>
        `
      })

      console.error('[v0] Token refresh failed, admin notified')
      return NextResponse.json({ success: false, notified: true }, { status: 500 })
    }

    console.log('[v0] Token refresh successful')
    return NextResponse.json({ success: true })
    
  } catch (error: any) {
    console.error('[v0] Error in token refresh cron:', error)
    
    // Tenta di notificare l'admin anche in caso di errore critico
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: process.env.RESEND_FROM_EMAIL!,
        subject: '🚨 Errore Critico Cron Job Beds24',
        html: `
          <h2>Errore nel Cron Job di Refresh Token</h2>
          <p>Si è verificato un errore critico durante l'esecuzione del cron job:</p>
          <pre style="background: #f5f5f5; padding: 16px; border-radius: 4px;">${error.message}</pre>
          <p>Verifica i log del sistema per maggiori dettagli.</p>
        `
      })
    } catch (emailError) {
      console.error('[v0] Failed to send error notification email:', emailError)
    }
    
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}

