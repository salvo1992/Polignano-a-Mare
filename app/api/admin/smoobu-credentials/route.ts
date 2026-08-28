import { NextResponse } from "next/server"
import { AdminApiAuthError, requireAdminIdToken } from "@/lib/admin-api-auth"
import {
  getSmoobuCredentialsStatus,
  saveSmoobuCredentials,
} from "@/lib/smoobu-credentials"

export const dynamic = "force-dynamic"

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init)
  response.headers.set("Cache-Control", "no-store")
  return response
}

function errorResponse(error: unknown) {
  if (error instanceof AdminApiAuthError) {
    return noStoreJson({ error: error.message }, { status: error.status })
  }

  console.error("[Smoobu Config] Errore:", error)
  return noStoreJson({ error: "Impossibile gestire la configurazione Smoobu" }, { status: 500 })
}

export async function GET(request: Request) {
  try {
    await requireAdminIdToken(request)
    return noStoreJson(await getSmoobuCredentialsStatus())
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const adminUid = await requireAdminIdToken(request)
    const body = (await request.json()) as { apiKey?: unknown; apiSecret?: unknown }
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : ""
    const apiSecret = typeof body.apiSecret === "string" ? body.apiSecret.trim() : ""

    if (!apiKey || !apiSecret) {
      return noStoreJson(
        { error: "API Key e Secret Smoobu sono entrambi obbligatori" },
        { status: 400 },
      )
    }

    if (apiKey.length > 512 || apiSecret.length > 1024) {
      return noStoreJson({ error: "Credenziali Smoobu non valide" }, { status: 400 })
    }

    await saveSmoobuCredentials(apiKey, apiSecret, adminUid)
    return noStoreJson({
      success: true,
      ...(await getSmoobuCredentialsStatus()),
    })
  } catch (error) {
    return errorResponse(error)
  }
}
