"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import Image from "next/image"
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MAX_ROOM_PHOTOS, MAX_PHOTO_BYTES, MAX_UPLOAD_BYTES, roomDraftSchema, type RoomContent } from "@/lib/room-content"

type EditorPhoto = { key: string; src: string; alt: string; file?: File }
export type SaveRoom = (id: string, form: FormData) => Promise<RoomContent>

async function preparePhoto(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error(`${file.name}: scegli una foto JPG, PNG o WebP.`)
  if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name}: la foto supera 20 MB.`)
  const bitmap = await createImageBitmap(file)
  try {
    const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio))
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio))
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Il browser non riesce a preparare le foto.")
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Impossibile preparare la foto.")), "image/jpeg", .85))
    if (blob.size > MAX_PHOTO_BYTES) throw new Error(`${file.name}: prova una versione più piccola della foto.`)
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" })
  } finally { bitmap.close() }
}

export function RoomContentEditor({ room, saveRoom, onSaved, onClose }: {
  room: RoomContent; saveRoom: SaveRoom; onSaved: (room: RoomContent) => void; onClose: () => void
}) {
  const [fields, setFields] = useState({ name: room.name, description: room.description, longDescription: room.longDescription,
    beds: room.beds, bathrooms: room.bathrooms, size: room.size, amenities: room.amenities.join("\n") })
  const [photos, setPhotos] = useState<EditorPhoto[]>(room.photos.map((photo, i) => ({ ...photo, key: `existing-${i}` })))
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [error, setError] = useState("")
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrls = useRef(new Set<string>())

  useEffect(() => {
    const urls = objectUrls.current
    return () => { urls.forEach(url => URL.revokeObjectURL(url)) }
  }, [])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty || busy) { event.preventDefault(); event.returnValue = "" } }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty, busy])

  const close = () => {
    if (busy || preparing) return
    if (dirty) setConfirmDiscard(true)
    else onClose()
  }
  const update = (key: keyof typeof fields, value: string | number) => { setFields(prev => ({ ...prev, [key]: value })); setDirty(true) }
  const reorder = (from: number, to: number) => {
    setPhotos(previous => { const next = [...previous]; const [photo] = next.splice(from, 1); next.splice(to, 0, photo); return next })
    setDirty(true)
  }
  const addPhotos = async (files: File[]) => {
    if (!files.length) return
    setError("")
    if (photos.length + files.length > MAX_ROOM_PHOTOS) { setError(`Puoi avere al massimo ${MAX_ROOM_PHOTOS} foto per camera.`); return }
    setPreparing(true)
    try {
      const prepared: File[] = []
      for (const file of files) prepared.push(await preparePhoto(file))
      const pendingBytes = photos.reduce((sum, photo) => sum + (photo.file?.size || 0), 0)
      if (pendingBytes + prepared.reduce((sum, file) => sum + file.size, 0) > MAX_UPLOAD_BYTES) throw new Error("Aggiungi meno foto per volta: salva quelle selezionate e poi aggiungi le altre.")
      const additions = prepared.map(file => {
        const src = URL.createObjectURL(file); objectUrls.current.add(src)
        return { key: `photo-${crypto.randomUUID()}`, src, alt: "", file }
      })
      setPhotos(previous => [...previous, ...additions]); setDirty(true)
    } catch (e) { setError(e instanceof Error ? e.message : "Non è stato possibile leggere le foto.") }
    finally { setPreparing(false); if (inputRef.current) inputRef.current.value = "" }
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError("")
    const draft = { ...fields, revision: room.revision,
      amenities: fields.amenities.split("\n").map(value => value.trim()).filter(Boolean),
      photos: photos.map(photo => ({ ...(photo.file ? { upload: photo.key } : { src: photo.src }), alt: photo.alt })),
    }
    const parsed = roomDraftSchema.safeParse(draft)
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || "Controlla i campi evidenziati."); return }
    setBusy(true)
    try {
      const form = new FormData(); form.set("room", JSON.stringify(parsed.data))
      photos.forEach(photo => { if (photo.file) form.append(photo.key, photo.file) })
      const saved = await saveRoom(room.id, form)
      setDirty(false); onSaved(saved)
    } catch (e) { setError(e instanceof Error ? e.message : "Salvataggio non riuscito. Riprova.") }
    finally { setBusy(false) }
  }

  return <Dialog open onOpenChange={open => { if (!open) close() }}>
    <DialogContent className="max-w-5xl w-[95vw] max-h-[92vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Modifica camera</DialogTitle>
        <DialogDescription>{room.name}. Le modifiche compariranno sul sito dopo il salvataggio.</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="space-y-6">
        <fieldset disabled={busy || preparing} className="space-y-6 disabled:opacity-70">
          <section className="space-y-4" aria-labelledby="room-texts-title">
            <h3 id="room-texts-title" className="text-lg font-semibold">Testi e caratteristiche</h3>
            <div className="space-y-2"><Label htmlFor="room-name">Nome camera</Label><Input id="room-name" value={fields.name} maxLength={120} required onChange={e => update("name", e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="room-description">Descrizione breve</Label><Textarea id="room-description" value={fields.description} maxLength={1200} required rows={3} onChange={e => update("description", e.target.value)} /><p className="text-sm text-muted-foreground">Visibile nella home e nell’elenco camere.</p></div>
            <div className="space-y-2"><Label htmlFor="room-long-description">Descrizione completa</Label><Textarea id="room-long-description" value={fields.longDescription} maxLength={10000} rows={5} onChange={e => update("longDescription", e.target.value)} /></div>
            <div className="grid grid-cols-3 gap-3">{([['beds', 'Letti', 10], ['bathrooms', 'Bagni', 10], ['size', 'Superficie (m²)', 1000]] as const).map(([key,label,max]) =>
              <div key={key} className="space-y-2"><Label htmlFor={`room-${key}`}>{label}</Label><Input id={`room-${key}`} type="number" required min={1} max={max} step={1} value={fields[key]} onChange={e => update(key, Number(e.target.value))} /></div>)}</div>
            <div className="space-y-2"><Label htmlFor="room-amenities">Servizi della camera (uno per riga)</Label><Textarea id="room-amenities" value={fields.amenities} rows={5} onChange={e => update("amenities", e.target.value)} /></div>
          </section>
          <section className="space-y-4" aria-labelledby="room-photos-title">
            <div className="flex flex-wrap justify-between gap-3 items-center"><div><h3 id="room-photos-title" className="text-lg font-semibold">Foto della camera</h3><p className="text-sm text-muted-foreground">{photos.length}/{MAX_ROOM_PHOTOS} foto. La prima è la copertina.</p></div>
              <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={photos.length >= MAX_ROOM_PHOTOS}><ImagePlus className="w-4 h-4 mr-2" />Carica foto</Button>
              <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" aria-label="Seleziona foto della camera" onChange={e => void addPhotos(Array.from(e.target.files || []))} /></div>
            <p className="text-sm text-muted-foreground">JPG, PNG o WebP. Puoi selezionare più foto insieme; vengono adattate automaticamente al sito.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{photos.map((photo, index) => <article key={photo.key} className="rounded-lg border bg-card overflow-hidden">
              <div className="relative aspect-[4/3]"><Image src={photo.src} alt={photo.alt || `Foto ${index + 1} di ${fields.name}`} fill sizes="(max-width: 640px) 85vw, 300px" className="object-cover" unoptimized />
                <span className="absolute top-2 left-2 rounded bg-black/75 text-white px-2 py-1 text-xs">{index === 0 ? "Copertina" : `Foto ${index + 1}`}{photo.file ? " · Nuova" : ""}</span></div>
              <div className="p-3 space-y-3"><div className="flex flex-wrap gap-1">
                <Button type="button" size="sm" variant="outline" disabled={index === 0} onClick={() => reorder(index,0)} aria-label={`Imposta foto ${index + 1} come copertina`}><Star className="w-4 h-4 mr-1" />Copertina</Button>
                <Button type="button" size="icon" variant="outline" disabled={index === 0} aria-label={`Sposta foto ${index + 1} prima`} onClick={() => reorder(index,index-1)}><ArrowLeft className="w-4 h-4" /></Button>
                <Button type="button" size="icon" variant="outline" disabled={index === photos.length-1} aria-label={`Sposta foto ${index + 1} dopo`} onClick={() => reorder(index,index+1)}><ArrowRight className="w-4 h-4" /></Button>
                <Button type="button" size="icon" variant="outline" disabled={photos.length === 1} aria-label={`Rimuovi foto ${index + 1} dalla galleria`} onClick={() => { setPhotos(prev => prev.filter(p => p.key !== photo.key)); setDirty(true) }}><Trash2 className="w-4 h-4" /></Button>
              </div><Label htmlFor={`alt-${photo.key}`} className="text-xs">Descrizione foto (facoltativa)</Label><Input id={`alt-${photo.key}`} value={photo.alt} maxLength={160} onChange={e => { setPhotos(prev => prev.map(p => p.key === photo.key ? { ...p, alt: e.target.value } : p)); setDirty(true) }} /></div>
            </article>)}</div>
            <p className="text-sm text-muted-foreground">Le foto rimosse scompariranno dalla galleria soltanto quando premi Salva modifiche.</p>
          </section>
        </fieldset>
        {error && <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-red-800">{error}</p>}
        {confirmDiscard && <div role="alert" className="sticky bottom-20 z-10 rounded border bg-background p-4 shadow-lg space-y-3">
          <p>Uscire senza salvare le modifiche alla camera?</p>
          <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => setConfirmDiscard(false)}>Continua a modificare</Button><Button type="button" variant="destructive" onClick={onClose}>Esci senza salvare</Button></div>
        </div>}
        <div className="sticky -bottom-6 bg-background border-t py-4 flex flex-wrap justify-between gap-3 items-center">
          <p role="status" className="text-sm text-muted-foreground">{preparing ? "Preparazione foto…" : busy ? "Caricamento foto e salvataggio…" : dirty ? "Modifiche non salvate" : "Nessuna modifica"}</p>
          <div className="flex gap-2"><Button type="button" variant="outline" onClick={close} disabled={busy || preparing}>Annulla</Button>
            <Button type="submit" disabled={!dirty || busy || preparing}>{(busy || preparing) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salva modifiche</Button></div>
        </div>
      </form>
    </DialogContent>
  </Dialog>
}
