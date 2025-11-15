import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log('[v0] Starting Beds24 read token refresh check')

    const storedRefreshToken = process.env.BEDS24_REFRESH_TOKEN
    if (!storedRefreshToken) {
      throw new Error('BEDS24_REFRESH_TOKEN not found in environment variables')
    }

    const tokenDoc = await getDoc(doc(db, 'system', 'beds24_tokens'))
    const tokenData = tokenDoc.data()
    
    const now = Date.now()
    const lastRefresh = tokenData?.readTokenRefreshedAt || 0
    const daysSinceRefresh = (now - lastRefresh) / (1000 * 60 * 60 * 24)
    
    console.log('[v0] Days since last read token refresh:', daysSinceRefresh)

    if (daysSinceRefresh < 55) {
      console.log('[v0] Read token still valid, no refresh needed')
      return NextResponse.json({ 
        success: true, 
        message: 'Read token still valid',
        daysSinceRefresh: Math.floor(daysSinceRefresh),
        nextRefreshIn: Math.floor(55 - daysSinceRefresh)
      })
    }

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
      throw new Error(`Beds24 API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.token) {
      throw new Error('No read token in Beds24 response')
    }

    await setDoc(doc(db, 'system', 'beds24_tokens'), {
      readToken: data.token,
      readTokenRefreshedAt: now,
      readTokenExpiresIn: data.expiresIn || 5184000,
    }, { merge: true })

    console.log('[v0] Read token refreshed and saved successfully')

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: 'salvo.dauria92@gmail.com',
        subject: '✅ Beds24 Read Token Refreshed',
        html: `
          <h2>Read Token Aggiornato</h2>
          <p>Il read token di Beds24 è stato refreshato automaticamente.</p>
          <p><strong>Prossimo refresh previsto:</strong> tra 55 giorni</p>
        `
      })
    } catch (emailError) {
      console.error('[v0] Failed to send success email:', emailError)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Read token refreshed successfully',
      expiresIn: data.expiresIn
    })

  } catch (error) {
    console.error('[v0] Error refreshing Beds24 read token:', error)

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: 'salvo.dauria92@gmail.com',
        subject: '⚠️ Errore Refresh Read Token Beds24',
        html: `
          <h2>Errore nel Refresh del Read Token</h2>
          <p><strong>Errore:</strong> ${error instanceof Error ? error.message : 'Unknown error'}</p>
          <p>Verifica BEDS24_REFRESH_TOKEN nelle variabili d'ambiente.</p>
        `
      })
    } catch (emailError) {
      console.error('[v0] Failed to send error email:', emailError)
    }

    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

