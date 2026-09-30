"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { auth } from "@/lib/firebase"
import type { RoomContent } from "@/lib/room-content"
import type { StorageDiagnostics } from "@/lib/storage-diagnostics"
import { RoomContentEditor, type SaveRoom } from "@/components/room-content-editor"
import { useRoomContent } from "@/components/room-content-provider"
import { ImagePlus, Loader2 } from "lucide-react"

async function adminRequest(path: string, options: RequestInit = {}) {
  const user = auth.currentUser
  if (!user) throw new Error("Accedi come amministratore per gestire le camere.")
  const token = await user.getIdToken()
  const response = await fetch(path, { ...options, cache: "no-store", headers: { ...options.headers, Authorization: `Bearer ${token}` } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || "Operazione non riuscita. Riprova.")
  return data
}

export function RoomContentManagement() {
  const [rooms, setRooms] = useState<RoomContent[]>([])
  const [selected, setSelected] = useState<RoomContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [storage, setStorage] = useState<StorageDiagnostics | null>(null)
  const [checkingStorage, setCheckingStorage] = useState(false)
  const [storageError, setStorageError] = useState("")
  const { refresh } = useRoomContent()
  const load = useCallback(async () => {
    setLoading(true); setError("")
    try { setRooms((await adminRequest("/api/admin/rooms")).rooms) }
    catch (e) { setError(e instanceof Error ? e.message : "Impossibile caricare le camere") }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const saveRoom: SaveRoom = async (id, form) => (await adminRequest(`/api/admin/rooms/${id}`, { method: "PUT", body: form })).room
  const checkStorage = async () => {
    setCheckingStorage(true); setStorageError(""); setStorage(null)
    try { setStorage(await adminRequest("/api/admin/storage-diagnostics")) }
    catch (e) { setStorageError(e instanceof Error ? e.message : "Verifica non disponibile. Riprova.") }
    finally { setCheckingStorage(false) }
  }
  const blobMessages = {
    oidc: "Configurazione Blob presente tramite collegamento Vercel (OIDC).",
    read_write_token: "Configurazione Blob presente tramite token server.",
    incomplete: "Configurazione Blob incompleta: identificativo archivio presente, ma credenziali non disponibili.",
    not_configured: "Blob non configurato nelle variabili standard di questo ambiente.",
  }

  return <section className="space-y-4" aria-labelledby="room-content-heading">
    <div><h2 id="room-content-heading" className="text-2xl font-semibold">Foto e descrizioni delle camere</h2>
      <p className="text-muted-foreground">Aggiorna le schede visibili nella home, nell’elenco camere e nelle pagine di dettaglio.</p></div>
    <Card>
      <CardHeader><CardTitle>Verifica archivio foto</CardTitle>
        <CardDescription>Controllo riservato all’admin. Non salva modifiche, non carica foto e non mostra chiavi segrete.</CardDescription></CardHeader>
      <CardContent className="space-y-3">
        <Button variant="outline" onClick={checkStorage} disabled={checkingStorage}>
          {checkingStorage && <Loader2 aria-hidden="true" className="w-4 h-4 mr-2 animate-spin" />}
          {checkingStorage ? "Verifica in corso…" : "Verifica configurazione foto"}
        </Button>
        {storageError && <p role="alert" className="text-red-700">{storageError}</p>}
        {storage && <div role="status" className="rounded border bg-muted/40 p-4 space-y-2 text-sm">
          <p className="font-medium">{blobMessages[storage.blob.configuration]}</p>
          <p>Il caricamento delle nuove foto usa ancora Firebase Storage, non Blob.</p>
          <p>{storage.firebase.bucketConfigured
            ? `Archivio Firebase indicato nella configurazione ${storage.firebase.bucketSource === "server" ? "server" : "pubblica"}. Esistenza e permessi non verificati.`
            : "Archivio Firebase non indicato: manca la configurazione per caricare nuove foto."}</p>
          <p>Questo controllo rileva solo la presenza delle variabili. Accesso e caricamento su Blob non sono stati provati: non conferma che il problema di salvataggio sia risolto.</p>
        </div>}
      </CardContent>
    </Card>
    {loading && <p role="status" className="flex gap-2 items-center"><Loader2 className="w-4 h-4 animate-spin" />Caricamento camere…</p>}
    {error && <div role="alert" className="rounded border border-red-300 p-4"><p>{error}</p><Button className="mt-2" variant="outline" onClick={load}>Riprova</Button></div>}
    {message && <p role="status" className="rounded bg-green-50 border border-green-200 p-3 text-green-800">{message}</p>}
    <div className="grid md:grid-cols-2 gap-4">{rooms.map(room => <Card key={room.id}>
      <CardHeader><CardTitle>{room.name}</CardTitle><CardDescription>{room.photos.length} foto · {room.size} m² · {room.beds} letti · {room.bathrooms} bagni</CardDescription></CardHeader>
      <CardContent className="space-y-4"><div className="relative aspect-[16/9] rounded overflow-hidden"><Image src={room.photos[0].src} alt={room.photos[0].alt || room.name} fill sizes="(max-width: 768px) 90vw, 550px" className="object-cover" /></div>
        <p className="text-sm text-muted-foreground line-clamp-2">{room.description}</p>
        <div className="flex flex-wrap gap-2"><Button onClick={() => { setMessage(""); setSelected(room) }}><ImagePlus className="w-4 h-4 mr-2" />Modifica camera e foto</Button><Button variant="outline" asChild><a href={`/camere/${room.id}`} target="_blank" rel="noopener noreferrer">Vedi sul sito</a></Button></div>
      </CardContent></Card>)}</div>
    {selected && <RoomContentEditor key={selected.id} room={selected} saveRoom={saveRoom} onClose={() => setSelected(null)} onSaved={room => {
      setRooms(prev => prev.map(item => item.id === room.id ? room : item)); setSelected(null); setMessage(`“${room.name}” salvata. Foto e testi sono aggiornati sul sito.`); void refresh()
    }} />}
  </section>
}
