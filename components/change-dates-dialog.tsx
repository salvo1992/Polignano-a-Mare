"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface ChangeDatesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  currentCheckIn: string
  currentCheckOut: string
  onSuccess: () => void
}

export function ChangeDatesDialog({
  open,
  onOpenChange,
  bookingId,
  currentCheckIn,
  currentCheckOut,
  onSuccess,
}: ChangeDatesDialogProps) {
  const [checkIn, setCheckIn] = useState<Date | undefined>(new Date(currentCheckIn))
  const [checkOut, setCheckOut] = useState<Date | undefined>(new Date(currentCheckOut))
  const [loading, setLoading] = useState(false)
  const [newPrice, setNewPrice] = useState<number | null>(null)

  const handleCalculatePrice = async () => {
    if (!checkIn || !checkOut) {
      toast.error("Seleziona entrambe le date")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/bookings/calculate-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          checkIn: checkIn.toISOString().split("T")[0],
          checkOut: checkOut.toISOString().split("T")[0],
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      setNewPrice(data.newPrice)
      toast.success(`Nuovo prezzo: €${(data.newPrice / 100).toFixed(2)}`)
    } catch (error: any) {
      toast.error(error.message || "Errore nel calcolo del prezzo")
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!checkIn || !checkOut || newPrice === null) {
      toast.error("Calcola prima il nuovo prezzo")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/bookings/change-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          checkIn: checkIn.toISOString().split("T")[0],
          checkOut: checkOut.toISOString().split("T")[0],
          newPrice,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      toast.success("Date modificate con successo!")
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || "Errore nella modifica delle date")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cambia le date della prenotazione</DialogTitle>
          <DialogDescription>
            Seleziona le nuove date. Ti verrà mostrato il nuovo prezzo prima di confermare.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 py-4">
          <div>
            <Label>Check-in</Label>
            <Calendar
              mode="single"
              selected={checkIn}
              onSelect={setCheckIn}
              disabled={(date) => date < new Date()}
              className="rounded-md border"
            />
          </div>
          <div>
            <Label>Check-out</Label>
            <Calendar
              mode="single"
              selected={checkOut}
              onSelect={setCheckOut}
              disabled={(date) => !checkIn || date <= checkIn}
              className="rounded-md border"
            />
          </div>
        </div>

        {newPrice !== null && (
          <div className="bg-secondary/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Nuovo prezzo totale</p>
            <p className="text-2xl font-bold text-primary">€{(newPrice / 100).toFixed(2)}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annulla
          </Button>
          {newPrice === null ? (
            <Button onClick={handleCalculatePrice} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Calcola nuovo prezzo
            </Button>
          ) : (
            <Button onClick={handleConfirm} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Conferma modifica
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
