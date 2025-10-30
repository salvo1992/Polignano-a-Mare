"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Ban, CheckCircle2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function BookingBlockDates() {
  const [roomId, setRoomId] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [reason, setReason] = useState("maintenance")
  const [blocking, setBlocking] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const blockDates = async () => {
    if (!roomId || !from || !to) {
      setError("Compila tutti i campi")
      return
    }

    setBlocking(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch("/api/beds24/block-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, from, to, reason }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Errore nel blocco delle date")
      }

      setSuccess(true)
      setRoomId("")
      setFrom("")
      setTo("")
      setReason("maintenance")

      setTimeout(() => setSuccess(false), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto")
    } finally {
      setBlocking(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ban className="w-5 h-5" />
          Blocca Date per Manutenzione
        </CardTitle>
        <CardDescription>Blocca le date per manutenzione o altri motivi</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="room">Camera</Label>
          <Select value={roomId} onValueChange={setRoomId}>
            <SelectTrigger id="room">
              <SelectValue placeholder="Seleziona camera" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Camera Familiare</SelectItem>
              <SelectItem value="2">Camera Matrimoniale</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="from">Da</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to">A</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
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
            <AlertDescription className="text-green-900">Date bloccate con successo!</AlertDescription>
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
          {blocking ? "Blocco in corso..." : "Blocca Date"}
        </Button>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Le date bloccate non saranno disponibili per le prenotazioni e verranno sincronizzate con Beds24.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
