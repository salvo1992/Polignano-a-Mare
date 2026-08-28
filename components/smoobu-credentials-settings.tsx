"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import { AlertTriangle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getCurrentIdToken } from "@/lib/firebase"

interface CredentialsStatus {
  configured: boolean
  hmacEnabled: boolean
  maskedApiKey: string | null
  source: "firestore" | "environment" | null
  updatedAt: string | null
}

async function authenticatedRequest(url: string, init?: RequestInit) {
  const token = await getCurrentIdToken(true)
  if (!token) throw new Error("Sessione admin scaduta: accedi nuovamente")

  const headers = new Headers(init?.headers)
  headers.set("Content-Type", "application/json")
  headers.set("Authorization", `Bearer ${token}`)

  return fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  })
}

export function SmoobuCredentialsSettings() {
  const [apiKey, setApiKey] = useState("")
  const [apiSecret, setApiSecret] = useState("")
  const [showSecret, setShowSecret] = useState(false)
  const [status, setStatus] = useState<CredentialsStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true)
      setMessage(null)
      const response = await authenticatedRequest("/api/admin/smoobu-credentials")
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Impossibile leggere la configurazione")
      setStatus(data)
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Errore durante il controllo della configurazione",
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)

    if (!apiKey.trim() || !apiSecret.trim()) {
      setMessage({ type: "error", text: "Inserisci sia l’API Key sia il Secret Smoobu" })
      return
    }

    try {
      setSaving(true)
      const response = await authenticatedRequest("/api/admin/smoobu-credentials", {
        method: "POST",
        body: JSON.stringify({ apiKey: apiKey.trim(), apiSecret: apiSecret.trim() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Salvataggio non riuscito")

      setStatus(data)
      setApiKey("")
      setApiSecret("")
      setShowSecret(false)
      setMessage({ type: "success", text: "Credenziali Smoobu salvate in modo server-side" })
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Errore durante il salvataggio",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-cinzel text-primary flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Autenticazione API Smoobu
        </CardTitle>
        <CardDescription>
          Configura la firma HMAC richiesta da Smoobu senza pubblicare le credenziali nel repository.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-5 rounded-md border p-3 text-sm">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Controllo configurazione…
            </div>
          ) : status?.hmacEnabled ? (
            <div className="flex items-start gap-2 text-green-700">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Firma HMAC configurata</p>
                {status.maskedApiKey && <p className="text-xs mt-1">API Key: {status.maskedApiKey}</p>}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-amber-700">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Firma HMAC non ancora configurata</p>
                <p className="text-xs mt-1">Fino al salvataggio il sito continuerà a usare la chiave legacy, se presente.</p>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="smoobu-api-key">Smoobu API Key</Label>
            <Input
              id="smoobu-api-key"
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              autoComplete="new-password"
              spellCheck={false}
              placeholder="Incolla la chiave API attuale"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="smoobu-api-secret">Smoobu API Secret</Label>
            <div className="relative">
              <Input
                id="smoobu-api-secret"
                type={showSecret ? "text" : "password"}
                value={apiSecret}
                onChange={(event) => setApiSecret(event.target.value)}
                autoComplete="new-password"
                spellCheck={false}
                placeholder="Incolla il Secret mostrato da Smoobu"
                className="pr-11"
                disabled={saving}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setShowSecret((value) => !value)}
                aria-label={showSecret ? "Nascondi Secret" : "Mostra Secret"}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {message && (
            <div
              className={`rounded-md px-3 py-2 text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
              role={message.type === "error" ? "alert" : "status"}
            >
              {message.text}
            </div>
          )}

          <Button type="submit" disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {status?.hmacEnabled ? "Aggiorna credenziali" : "Salva credenziali"}
          </Button>
        </form>

        <p className="mt-4 text-xs text-muted-foreground">
          I valori non vengono mai restituiti al browser dopo il salvataggio. Per sostituirli è necessario inserirli entrambi nuovamente.
        </p>
      </CardContent>
    </Card>
  )
}
