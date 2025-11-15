import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { beds24Client } from '@/lib/beds24-client'

export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: Request) {
  try {
    // --- AUTH CRON ---
    const authHeader = request.headers.get('authorization') ?? ''
    const cronSecret = process.env.CRON_SECRET ?? ''

    // authHeader es: "Bearer 8721..."
    const [, token] = authHeader.split(' ') // ["Bearer", "8721..."]

    if (!token || !cronSecret || token.trim() !== cronSecret.trim()) {
      console.log('[CRON WRITE] Unauthorized', {
        authHeader,
        hasEnv: !!cronSecret,
      })

      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      )
    }

    console.log('[CRON WRITE] Starting Beds24 write token refresh')

    // --- REFRESH WRITE TOKEN ---
    await beds24Client.forceRefreshWriteToken()

    console.log('[CRON WRITE] Write token refreshed successfully')

    return NextResponse.json({
      success: true,
      message: 'Write token refreshed successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[CRON WRITE] Error refreshing write token:', error)

    // Prova a mandare l’email di errore (se configurato Resend)
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: 'salvatoredimaria92@gmail.com',
        subject: '⚠️ Beds24 Write Token Refresh Fallito',
        html: `
          <h2>Attenzione: Problema con Beds24 Write Token</h2>
          <p>Il refresh automatico del write token Beds24 è fallito.</p>
          <p><strong>Errore:</strong> ${JSON.stringify(error)}</p>
          <h3>Azione Richiesta:</h3>
          <ol>
            <li>Verifica che BEDS24_REFRESH_TOKEN sia valido nelle variabili d'ambiente</li>
            <li>Se necessario, rigenera il token su Beds24</li>
          </ol>
        `,
      })
    } catch (emailError) {
      console.error('[CRON WRITE] Failed to send error email:', emailError)
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}



