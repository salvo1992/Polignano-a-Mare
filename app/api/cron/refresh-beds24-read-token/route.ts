import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import nodemailer from 'nodemailer'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log('[v0] Starting Beds24 read token refresh check')

    // Get current read token from Firestore
    const tokenDoc = await getDoc(doc(db, 'system', 'beds24_tokens'))
    const tokenData = tokenDoc.data()
    
    const currentReadToken = process.env.BEDS24_READ_TOKEN
    const storedRefreshToken = process.env.BEDS24_REFRESH_TOKEN

    if (!storedRefreshToken) {
      throw new Error('BEDS24_REFRESH_TOKEN not found in environment variables')
    }

    // Check if read token needs refresh (older than 55 days to be safe)
    const now = Date.now()
    const lastRefresh = tokenData?.readTokenRefreshedAt || 0
    const daysSinceRefresh = (now - lastRefresh) / (1000 * 60 * 60 * 24)
    
    console.log('[v0] Days since last read token refresh:', daysSinceRefresh)

    if (daysSinceRefresh < 55) {
      console.log('[v0] Read token still valid, no refresh needed')
      return NextResponse.json({ 
        success: true, 
        message: 'Read token still valid',
        daysSinceRefresh,
        nextRefreshIn: 55 - daysSinceRefresh
      })
    }

    // Need to refresh - call Beds24 authentication/setup with refresh token
    console.log('[v0] Read token needs refresh, calling Beds24 API')

    const response = await fetch('https://beds24.com/api/v2/authentication/setup', {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'refreshToken': storedRefreshToken
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[v0] Beds24 read token refresh failed:', response.status, errorText)
      throw new Error(`Beds24 API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('[v0] Beds24 read token refresh response:', data)

    if (!data.token) {
      throw new Error('No read token in Beds24 response')
    }

    // Save new read token to Firestore with timestamp
    await setDoc(doc(db, 'system', 'beds24_tokens'), {
      readToken: data.token,
      readTokenRefreshedAt: now,
      readTokenExpiresIn: data.expiresIn || 5184000, // 60 days default
    }, { merge: true })

    console.log('[v0] Read token refreshed and saved successfully')

    // Send success email to admin
    await sendAdminEmail(
      'Beds24 Read Token Refreshed Successfully',
      `
        <h2>Read Token Aggiornato</h2>
        <p>Il read token di Beds24 è stato refreshato automaticamente con successo.</p>
        <p><strong>Prossimo refresh previsto:</strong> tra 55 giorni</p>
        <p><strong>Nota:</strong> Se vuoi aggiornare manualmente la variabile d'ambiente BEDS24_READ_TOKEN su Vercel con il nuovo token, puoi farlo, ma non è necessario perché il sistema usa automaticamente il token salvato in Firestore.</p>
        <hr>
        <p><small>Nuovo token salvato in Firestore: ${data.token.substring(0, 20)}...</small></p>
      `
    )

    return NextResponse.json({ 
      success: true, 
      message: 'Read token refreshed successfully',
      expiresIn: data.expiresIn
    })

  } catch (error) {
    console.error('[v0] Error refreshing Beds24 read token:', error)

    // Send error email to admin
    await sendAdminEmail(
      '⚠️ ATTENZIONE: Errore Refresh Read Token Beds24',
      `
        <h2 style="color: #dc2626;">Errore nel Refresh del Read Token</h2>
        <p>Il sistema non è riuscito a refreshare il read token di Beds24.</p>
        <p><strong>Errore:</strong> ${error instanceof Error ? error.message : 'Unknown error'}</p>
        
        <h3>Cosa fare:</h3>
        <ol>
          <li>Vai al pannello Beds24: <a href="https://beds24.com/control2.php">https://beds24.com/control2.php</a></li>
          <li>Vai su Settings → API</li>
          <li>Clicca "Generate invite code" e seleziona tutti i permessi READ</li>
          <li>Copia il nuovo invite code</li>
          <li>Usa questo endpoint per generare nuovo token: <code>GET https://beds24.com/api/v2/authentication/setup</code> con header <code>code: [invite-code]</code></li>
          <li>Aggiorna le variabili d'ambiente su Vercel:
            <ul>
              <li><code>BEDS24_READ_TOKEN</code> - il nuovo token</li>
              <li><code>BEDS24_REFRESH_TOKEN</code> - il nuovo refresh token</li>
            </ul>
          </li>
        </ol>
        
        <p><strong>URGENTE:</strong> Senza un read token valido, la sincronizzazione con Booking e Airbnb non funzionerà!</p>
      `
    )

    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

async function sendAdminEmail(subject: string, html: string) {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY,
      },
    })

    await transporter.sendMail({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@al22suite.com',
      to: 'salvo.dauria92@gmail.com',
      subject,
      html,
    })
  } catch (error) {
    console.error('[v0] Failed to send admin email:', error)
  }
}
