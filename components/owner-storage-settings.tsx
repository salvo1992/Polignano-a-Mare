"use client"

import { useId, useState } from "react"
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { BlobStorageSettings } from "@/components/blob-storage-settings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { auth } from "@/lib/firebase"
import { isStorageOwnerEmail } from "@/lib/storage-owner"
import type { StorageDiagnostics } from "@/lib/storage-diagnostics"

const blobMessages = {
  saved_token: "Blob collegato tramite il token salvato nel pannello admin.",
  oidc: "Configurazione Blob presente tramite collegamento Vercel (OIDC).",
  read_write_token: "Configurazione Blob presente tramite token server.",
  incomplete: "Configurazione Blob incompleta: identificativo archivio presente, ma credenziali non disponibili.",
  not_configured: "Blob non configurato nelle variabili standard di questo ambiente.",
}

export function OwnerStorageSettings() {
  const { user } = useAuth()
  if (user?.role !== "admin" || !isStorageOwnerEmail(user.email)) return null
  return <StorageSettingsPanel key={user.uid} />
}

function StorageSettingsPanel() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const contentId = useId()
  return <section aria-label="Archivio foto personale" className="space-y-4">
    <Card>
    <CardHeader>
      <CardTitle>Archivio foto — area personale</CardTitle>
      <CardDescription>Configurazione tecnica riservata al tuo account. Gli altri admin continuano a gestire le foto da Camere.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <Button type="button" variant="outline" aria-expanded={open} aria-controls={contentId}
        className="h-auto min-h-9 max-w-full whitespace-normal"
        disabled={busy} onClick={() => setOpen(value => !value)}>
        {open ? <ChevronUp aria-hidden="true" className="mr-2 h-4 w-4" /> : <ChevronDown aria-hidden="true" className="mr-2 h-4 w-4" />}
        {open ? "Nascondi configurazione Blob" : "Mostra configurazione Blob"}
      </Button>
      {busy && <p role="status" className="text-sm text-muted-foreground">Attendi la fine dell’operazione prima di nascondere il riquadro.</p>}
    </CardContent>
    </Card>
    <div id={contentId} hidden={!open}>
      {/* Unmount on close: discard unsent tokens and avoid background requests. */}
      {open && <StorageSettingsContent onBusyChange={setBusy} />}
    </div>
  </section>
}

function StorageSettingsContent({ onBusyChange }: { onBusyChange: (busy: boolean) => void }) {
  const [storage, setStorage] = useState<StorageDiagnostics | null>(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState("")
  const checkStorage = async () => {
    setChecking(true); setError(""); setStorage(null)
    try {
      const user = auth.currentUser
      if (!user) throw new Error("Accedi nuovamente con il tuo account.")
      const token = await user.getIdToken()
      const response = await fetch("/api/admin/storage-diagnostics", {
        cache: "no-store", headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Verifica non disponibile. Riprova.")
      setStorage(data)
    } catch (e) { setError(e instanceof Error ? e.message : "Verifica non disponibile. Riprova.") }
    finally { setChecking(false) }
  }

  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">Puoi richiudere questo riquadro quando hai finito. Un token non ancora inviato viene cancellato dal campo quando lo nascondi.</p>
    <BlobStorageSettings onConfigured={() => setStorage(null)} onBusyChange={onBusyChange} />
    <Card>
      <CardHeader><CardTitle>Verifica archivio foto</CardTitle>
        <CardDescription>Controllo riservato al tuo account. Non salva modifiche, non carica foto e non mostra chiavi segrete.</CardDescription></CardHeader>
      <CardContent className="space-y-3">
        <Button type="button" variant="outline" className="h-auto min-h-9 max-w-full whitespace-normal" onClick={checkStorage} disabled={checking}>
          {checking && <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />}
          {checking ? "Verifica in corso…" : "Verifica configurazione foto"}
        </Button>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        {storage && <div role="status" className="space-y-2 rounded border bg-muted/40 p-4 text-sm">
          <p className="font-medium">{blobMessages[storage.blob.configuration]}</p>
          <p>{storage.uploadProvider === "vercel-blob" ? "Le nuove foto vengono caricate su Vercel Blob." : "Le nuove foto usano ancora Firebase Storage: collega Blob nel riquadro qui sopra."}</p>
          {storage.uploadProvider === "firebase-storage" && <p>{storage.firebase.bucketConfigured
            ? `Archivio Firebase indicato nella configurazione ${storage.firebase.bucketSource === "server" ? "server" : "pubblica"}. Esistenza e permessi non verificati.`
            : "Archivio Firebase non indicato: manca la configurazione per caricare nuove foto."}</p>}
          <p>{storage.blob.verifiedAt ? `Prova di caricamento completata al collegamento: ${new Date(storage.blob.verifiedAt).toLocaleString("it-IT")}. Per un controllo attuale premi “Prova caricamento foto”.`
            : "Questo controllo rileva solo la configurazione. Per verificare un caricamento reale usa il collegamento Blob qui sopra."}</p>
        </div>}
      </CardContent>
    </Card>
  </div>
}
