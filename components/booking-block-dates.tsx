"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Ban, CheckCircle2, AlertCircle, Unlock, RefreshCw, CloudOff, Cloud } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getRoomName as centralGetRoomName, resolveToLocalRoomId } from "@/lib/room-mapping"

interface BlockedDate {
  id: string
  roomId: string
  from: string
  to: string
  reason: string
  createdAt: any
  syncedToSmoobu?: boolean
  smoobuReservationId?: string | number | null
}

interface SmoobuApartment {
  id: number
  name: string
  type?: string
  maxOccupancy?: number
}

export function BookingBlockDates() {
  const [roomId, setRoomId] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [reason, setReason] = useState("maintenance")
  const [blocking, setBlocking] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])
  const [unblocking, setUnblocking] = useState<string | null>(null)
  const [loadingBlocked, setLoadingBlocked] = useState(true)

  // Smoobu apartments for dynamic room selection
  const [apartments, setApartments] = useState<SmoobuApartment[]>([])
  const [loadingApartments, setLoadingApartments] = useState(true)

  useEffect(() => {
    loadBlockedDates()
    loadSmoobuApartments()
  }, [])

  const loadSmoobuApartments = async () => {
    try {
      setLoadingApartments(true)
      const response = await fetch("/api/smoobu/apartments")
      const data = await response.json()

      if (response.ok && data.apartments) {
        setApartments(data.apartments)
        // Auto-select first apartment if none selected
        if (!roomId && data.apartments.length > 0) {
          setRoomId(data.apartments[0].id.toString())
        }
      } else {
        // Fallback to local rooms if Smoobu is not available
        setApartments([
          { id: 1, name: "Suite Acies con Balcone" },
          { id: 2, name: "Suite Acquaroom con Idromassaggio" },
        ])
      }
    } catch (err) {
      console.error("[BlockDates] Error loading Smoobu apartments:", err)
      // Fallback
      setApartments([
        { id: 1, name: "Suite Acies con Balcone" },
        { id: 2, name: "Suite Acquaroom con Idromassaggio" },
      ])
    } finally {
      setLoadingApartments(false)
    }
  }

  const loadBlockedDates = async () => {
    try {
      setLoadingBlocked(true)
      const response = await fetch("/api/smoobu/blocked-dates")
      const data = await response.json()

      if (response.ok) {
        setBlockedDates(data.blockedDates || [])
      }
    } catch (err) {
      console.error("[BlockDates] Error loading blocked dates:", err)
    } finally {
      setLoadingBlocked(false)
    }
  }

  const blockDates = async () => {
    if (!roomId || !from || !to) {
      setError("Compila tutti i campi")
      return
    }

    if (new Date(from) >= new Date(to)) {
      setError("La data di inizio deve essere prima della data di fine")
      return
    }

    setBlocking(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch("/api/smoobu/block-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, from, to, reason }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Errore nel blocco delle date")
      }

      setSuccess(true)
      setRoomId(apartments.length > 0 ? apartments[0].id.toString() : "")
      setFrom("")
      setTo("")
      setReason("maintenance")

      await loadBlockedDates()

      setTimeout(() => setSuccess(false), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto")
    } finally {
      setBlocking(false)
    }
  }

  const unblockDates = async (blockId: string) => {
    setUnblocking(blockId)
    setError(null)

    try {
      const response = await fetch("/api/smoobu/unblock-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Errore nello sblocco delle date")
      }

      await loadBlockedDates()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto")
    } finally {
      setUnblocking(null)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    } catch {
      return dateStr
    }
  }

  const getRoomName = (id: string) => {
    // Resolve any ID (Smoobu or local) to local room name
    const localId = resolveToLocalRoomId(id)
    const name = centralGetRoomName(localId)
    if (name !== `Camera ${localId}`) return name
    // Fallback to apartment list
    const apt = apartments.find((a) => a.id.toString() === id)
    return apt?.name || `Camera ${id}`
  }

  // Filter out auto-generated past-dates blocks
  const visibleBlocks = blockedDates.filter(
    (b) => b.reason !== "past-dates"
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ban className="w-5 h-5" />
          Blocca Date (Piattaforma + Smoobu)
        </CardTitle>
        <CardDescription>
          Blocca le date su questa piattaforma e su Smoobu contemporaneamente per
          evitare doppie prenotazioni su Booking.com, Airbnb e Expedia
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="room">Camera</Label>
          {loadingApartments ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Caricamento camere da Smoobu...
            </div>
          ) : (
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger id="room">
                <SelectValue placeholder="Seleziona camera" />
              </SelectTrigger>
              <SelectContent>
                {apartments.map((apt) => (
                  <SelectItem key={apt.id} value={apt.id.toString()}>
                    {apt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="from">Da</Label>
            <Input
              id="from"
              type="date"
              value={from}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to">A</Label>
            <Input
              id="to"
              type="date"
              value={to}
              min={from || new Date().toISOString().split("T")[0]}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">Motivo</Label>
          <Textarea
            id="reason"
            placeholder="Es: Manutenzione programmata, pulizia straordinaria..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        {success && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              Date bloccate con successo su piattaforma e Smoobu!
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button onClick={blockDates} disabled={blocking} className="w-full">
          <Ban className="w-4 h-4 mr-2" />
          {blocking
            ? "Blocco in corso su piattaforma e Smoobu..."
            : "Blocca Date (Piattaforma + Smoobu)"}
        </Button>

        {visibleBlocks.length > 0 && (
          <div className="pt-4 border-t space-y-3">
            <h4 className="font-medium text-sm">
              Date Bloccate ({visibleBlocks.length})
            </h4>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {visibleBlocks.map((blocked) => (
                <div
                  key={blocked.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {getRoomName(blocked.roomId)}
                      </p>
                      {blocked.syncedToSmoobu ? (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-green-100 text-green-800"
                        >
                          <Cloud className="w-3 h-3 mr-1" />
                          Smoobu
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-amber-100 text-amber-800"
                        >
                          <CloudOff className="w-3 h-3 mr-1" />
                          Solo locale
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {formatDate(blocked.from)} - {formatDate(blocked.to)}
                    </p>
                    {blocked.reason &&
                      !blocked.reason.startsWith("auto-booking") && (
                        <p className="text-muted-foreground text-xs italic mt-1">
                          {blocked.reason}
                        </p>
                      )}
                    {blocked.reason?.startsWith("auto-booking") && (
                      <p className="text-xs text-blue-600 mt-1">
                        Blocco automatico da prenotazione
                      </p>
                    )}
                  </div>
                  {!blocked.reason?.startsWith("auto-booking") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => unblockDates(blocked.id)}
                      disabled={unblocking === blocked.id}
                    >
                      <Unlock className="w-3 h-3 mr-1" />
                      {unblocking === blocked.id ? "..." : "Sblocca"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {loadingBlocked && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Caricamento date bloccate...
          </p>
        )}

        <div className="pt-4 border-t">
          <Alert className="bg-blue-50 border-blue-200">
            <Cloud className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900 text-xs">
              <p className="font-medium mb-1">Sincronizzazione bidirezionale</p>
              <ul className="space-y-0.5 list-disc list-inside">
                <li>Il blocco viene inviato a Smoobu che lo propaga a Booking.com, Airbnb ed Expedia</li>
                <li>Lo sblocco rimuove il blocco sia dalla piattaforma che da Smoobu</li>
                <li>Le prenotazioni confermate bloccano automaticamente le date su tutte le piattaforme</li>
                <li>Il cron job (ogni 2 ore) verifica e ripara eventuali blocchi mancanti</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  )
}
