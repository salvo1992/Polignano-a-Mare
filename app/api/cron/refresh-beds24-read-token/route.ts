import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // --- AUTH CRON ---
    const authHeader = request.headers.get('authorization') ?? ''
    const cronSecret = process.env.CRON_SECRET ?? ''

    const [, token] = authHeader.split(' ')

    if (!token || !cronSecret || token.trim() !== cronSecret.trim()) {
      console.log('[CRON READ] Unauthorized', {
        authHeader,
        hasEnv: !!cronSecret,
      })

      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      )
    }

    console.log('[CRON READ] Starting Beds24 read token refresh check')

    const storedRefreshToken = process.env.BEDS24_REFRESH_TOKEN
    if (!storedRefreshToken) {
      throw new Error('BEDS24_REFRESH_TOKEN not found in environment variables')
    }

    const tokenDoc = await getDoc(doc(db, 'system', 'beds24_tokens'))
    const tokenData = tokenDoc.data()

    const now = Date.now()
    const lastRefresh = tokenData?.readTokenRefreshedAt || 0
    const daysSinceRefresh = (now - lastRefresh) / (1000 * 60 * 60 * 24)

    console.log(
      '[CRON READ] Days since last read token refresh:',
      Math.floor(daysSinceRefresh),
    )

    if (daysSinceRefresh < 55) {
      console.log('[CRON READ] Read token still valid, no refresh needed')
      return NextResponse.json({
        success: true,
        message: 'Read token still valid',
        daysSinceRefresh: Math.floor(daysSinceRefresh),
        nextRefreshIn: Math.floor(55 - daysSinceRefresh),
      })
    }

    console.log('[CRON READ] Read token needs refresh, calling Beds24 API')

    const response = await fetch(
      'https://beds24.com/api/v2/authentication/setup',
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          refreshToken: storedRefreshToken,
        },
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(
        '[CRON READ] Beds24 read token refresh failed:',
        response.status,
        errorText,
      )
      throw new Error(`Beds24 API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    if (!data.token) {
      throw new Error('No read token in Beds24 response')
    }

    await setDoc(
      doc(db, 'system', 'beds24_tokens'),
      {
        readToken: data.token,
        readTokenRefreshedAt: now,
        readTokenExpiresIn: data.expiresIn || 5184000,
      },
      { merge: true },
    )

    console.log('[CRON READ] Read token refreshed and saved successfully')

    return NextResponse.json({
      success: true,
      message: 'Read token refreshed successfully',
      expiresIn: data.expiresIn,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[CRON READ] Error refreshing read token:', error)

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



