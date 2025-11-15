import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Leggiamo l'header inviato
  const authHeader = request.headers.get('authorization') ?? null

  // Leggiamo la variabile d’ambiente CRON_SECRET
  const cronEnv = process.env.CRON_SECRET ?? null

  // Token estratto dall’header (seconda parte dopo "Bearer")
  const headerToken = authHeader?.split(' ')[1] ?? null

  // Risposta DEBUG
  return NextResponse.json({
    debug: true,
    message: "DEBUG MODE - RIMUOVI DOPO IL TEST",
    authHeader,          // quello che Postman/cron-job.org sta inviando
    cronEnv,             // quello che Next/Vercel vede come variabile d'ambiente
    headerToken,         // token estratto da "Bearer xxx"
    equal_raw: authHeader === `Bearer ${cronEnv}`,
    equal_token: headerToken === cronEnv,

    lengths: {
      authHeader: authHeader?.length ?? 0,
      cronEnv: cronEnv?.length ?? 0,
      headerToken: headerToken?.length ?? 0,
    }
  })
}




