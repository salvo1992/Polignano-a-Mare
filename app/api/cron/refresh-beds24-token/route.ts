import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { beds24Client } from '@/lib/beds24-client'

export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log('[CRON] Starting Beds24 write token refresh')

    await beds24Client.forceRefreshWriteToken()

    console.log('[CRON] Write token refreshed successfully')
    
    return NextResponse.json({ 
      success: true,
      message: 'Write token refreshed successfully',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[CRON] Error refreshing write token:', error)
    
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: 'salvo.dauria92@gmail.com',
        subject: '⚠️ Beds24 Write Token Refresh Fallito',
        html: `
          <h2>Attenzione: Problema con Beds24 Write Token</h2>
          <p>Il refresh automatico del write token Beds24 è fallito.</p>
          
          <p><strong>Errore:</strong> ${JSON.stringify(error)}</p>
          
          <h3>Azione Richiesta:</h3>
          <ol>
            <li>Verifica che BEDS24_REFRESH_TOKEN sia valido nelle variabili d'ambiente</li>
            <li>Se necessario, rigenera il token su <a href="https://beds24.com/control2.php">Beds24</a></li>
          </ol>
        `
      })
    } catch (emailError) {
      console.error('[CRON] Failed to send error email:', emailError)
    }

    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}



