"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { auth } from "@/lib/firebase"
import { ROOM_BLOB_GUIDE_URL, ROOM_BLOB_STORE_ID, type RoomBlobStatus } from "@/lib/room-blob-store"

async function blobRequest(body?: { action: "connect" | "verify"; token?: string }): Promise<RoomBlobStatus> {
  const user = auth.currentUser
  if (!user) throw new Error("Accedi nuovamente come amministratore.")
  const idToken = await user.getIdToken()
  const response = await fetch("/api/admin/blob-storage", {
    method: body ? "POST" : "GET", cache: "no-store",
    headers: { Authorization: `Bearer ${idToken}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || "Configurazione foto non disponibile. Riprova.")
  return data
}

export function BlobStorageSettings({ onConfigured, onBusyChange }: {
  onConfigured: () => void
  onBusyChange: (busy: boolean) => void
}) {
  const [token, setToken] = useState("")
  const [status, setStatus] = useState<RoomBlobStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const load = useCallback(async () => {
    setLoading(true); setError("")
    try { setStatus(await blobRequest()) }
    catch (e) { setError(e instanceof Error ? e.message : "Stato non disponibile.") }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const connect = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); onBusyChange(true); setError(""); setMessage("")
    // Never store the token in localStorage, URLs or a GET response.
    const submittedToken = token.trim(); setToken("")
    try {
      setStatus(await blobRequest({ action: "connect", token: submittedToken }))
      setMessage("Blob collegato. Prova di caricamento, lettura pubblica e rimozione riuscita. Ora puoi salvare le nuove foto delle camere.")
      onConfigured()
    } catch (e) { setError(e instanceof Error ? e.message : "Collegamento non riuscito.") }
    finally { setBusy(false); onBusyChange(false) }
  }
  const verify = async () => {
    setBusy(true); onBusyChange(true); setError(""); setMessage("")
    try {
      setStatus(await blobRequest({ action: "verify" }))
      setMessage("Prova foto riuscita: Blob accetta il caricamento e la foto è visibile pubblicamente. Il file di prova è stato rimosso.")
    } catch (e) { setError(e instanceof Error ? e.message : "Prova non riuscita.") }
    finally { setBusy(false); onBusyChange(false) }
  }

  return <Card>
    <CardHeader><CardTitle>Collegamento foto a Vercel Blob</CardTitle>
      <CardDescription>Archivio dedicato al22suite. Il token resta sul server e non viene pubblicato in GitHub.</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm" role="status">{loading ? "Controllo collegamento…" : status?.configured ? "Blob configurato per le nuove foto." : status ? "Blob non ancora collegato." : "Stato del collegamento non disponibile."}</p>
      {status?.verifiedAt && <p className="text-sm text-muted-foreground">Prova completata il {new Date(status.verifiedAt).toLocaleString("it-IT")}. Non è un controllo continuo.</p>}
      <p className="text-sm">Apri lo <a className="underline" href={ROOM_BLOB_GUIDE_URL} target="_blank" rel="noopener noreferrer">storage al22suite su Vercel</a> e copia il valore di BLOB_READ_WRITE_TOKEN.</p>
      <p className="text-xs text-muted-foreground break-all">Archivio: {ROOM_BLOB_STORE_ID}</p>
      <form onSubmit={connect} className="space-y-3">
        <Label htmlFor="room-blob-token">Token Blob (BLOB_READ_WRITE_TOKEN)</Label>
        <Input id="room-blob-token" type="password" value={token} onChange={event => setToken(event.target.value)} autoComplete="new-password" spellCheck={false} maxLength={2048} placeholder="Incolla soltanto il valore del token" disabled={busy} required />
        <p className="text-xs text-muted-foreground">Il collegamento esegue una prova con una piccola immagine temporanea, poi la rimuove. Non modifica le gallerie.</p>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy || loading || !token.trim()}>{busy ? "Operazione in corso…" : status?.configured ? "Verifica e sostituisci token" : "Verifica e collega Blob"}</Button>
          {status?.configured && <Button type="button" variant="outline" onClick={verify} disabled={busy || loading}>Prova caricamento foto</Button>}
          <Button type="button" variant="outline" onClick={load} disabled={busy || loading}>Ricarica stato</Button>
        </div>
      </form>
      {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</p>}
      <p className="text-xs text-muted-foreground">Le foto già presenti restano invariate. La credenziale viene cifrata nel database esistente: chi amministra hosting e database mantiene comunque il controllo tecnico del sito.</p>
    </CardContent>
  </Card>
}
