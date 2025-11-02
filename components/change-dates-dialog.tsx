"use client"

import { useState, useEffect } from "react"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { Loader2, AlertTriangle } from "lucide-react"
import {
  calculateNights,
  calculatePriceByGuests,
  calculateDaysUntilCheckIn,
  calculateChangeDatesPenalty,
} from "@/lib/pricing"

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
  const [bookingData, setBookingData] = useState<any>(null)
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([])

  const daysUntilCheckIn = calculateDaysUntilCheckIn(currentCheckIn)
  const isWithinSevenDays = daysUntilCheckIn < 7

  useEffect(() => {
    if (open) {
      loadUnavailableDates()
    }
  }, [open])

  const loadUnavailableDates = async () => {
    try {
      const response = await fetch("/api/bookings/unavailable-dates")
      const data = await response.json()
      if (data.dates) {
        setUnavailableDates(data.dates.map((d: string) => new Date(d)))
      }
    } catch (error) {
      console.error("[v0] Error loading unavailable dates:", error)
    }
  }

  const isDateUnavailable = (date: Date) => {
    return unavailableDates.some(
      (unavailableDate) =>
        unavailableDate.getFullYear() === date.getFullYear() &&
        unavailableDate.getMonth() === date.getMonth() &&
        unavailableDate.getDate() === date.getDate(),
    )
  }

  const handleCalculatePrice = async () => {
    if (!checkIn || !checkOut) {
      toast.error("Seleziona entrambe le date")
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/bookings/${bookingId}`)
      const data = await response.json()

      if (!response.ok) throw new Error(data.error)

      setBookingData(data)

      const nights = calculateNights(checkIn.toISOString().split("T")[0], checkOut.toISOString().split("T")[0])
      const newBasePrice = calculatePriceByGuests(data.guests || 2, nights)

      const penalty = isWithinSevenDays ? calculateChangeDatesPenalty(data.totalAmount, daysUntilCheckIn) : 0
      const newTotalPrice = newBasePrice + penalty

      setBookingData({
        ...data,
        newPrice: newTotalPrice,
        penalty,
        nights,
      })

      toast.success(`Nuovo prezzo calcolato: €${(newTotalPrice / 100).toFixed(2)}`)
    } catch (error: any) {
      toast.error(error.message || "Errore nel calcolo del prezzo")
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!checkIn || !checkOut || !bookingData) {
      toast.error("Calcola prima il nuovo prezzo")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/bookings/change-dates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          checkIn: checkIn.toISOString().split("T")[0],
          checkOut: checkOut.toISOString().split("T")[0],
          newPrice: bookingData.newPrice,
          penalty: bookingData.penalty,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        toast.success("Date modificate con successo!")
        onSuccess()
        onOpenChange(false)
      }
    } catch (error: any) {
      toast.error(error.message || "Errore nella modifica delle date")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cambia le date della prenotazione</DialogTitle>
          <DialogDescription>
            Seleziona le nuove date. Ti verrà mostrato il nuovo prezzo prima di confermare.
          </DialogDescription>
        </DialogHeader>

        {isWithinSevenDays && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-1">⚠ Penale del 50%</p>
              <p className="text-sm">
                Stai modificando le date a meno di 7 giorni dal check-in. Verrà applicata una penale del 50%
                dell'importo originale.
              </p>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-2 gap-4 py-4">
          <div>
            <Label>Check-in</Label>
            <Calendar
              mode="single"
              selected={checkIn}
              onSelect={setCheckIn}
              disabled={(date) => date < new Date() || isDateUnavailable(date)}
              className="rounded-md border"
            />
          </div>
          <div>
            <Label>Check-out</Label>
            <Calendar
              mode="single"
              selected={checkOut}
              onSelect={setCheckOut}
              disabled={(date) => !checkIn || date <= checkIn || isDateUnavailable(date)}
              className="rounded-md border"
            />
          </div>
        </div>

        {bookingData && (
          <div className="space-y-3 bg-secondary/50 rounded-lg p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Nuovo prezzo base ({bookingData.nights} notti)</span>
              <span className="font-semibold">€{((bookingData.newPrice - bookingData.penalty) / 100).toFixed(2)}</span>
            </div>
            {bookingData.penalty > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>Penale (50%)</span>
                <span className="font-semibold">+€{(bookingData.penalty / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t">
              <span className="font-semibold">Totale</span>
              <span className="text-2xl font-bold text-primary">€{(bookingData.newPrice / 100).toFixed(2)}</span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annulla
          </Button>
          <Button onClick={handleCalculatePrice} disabled={loading} variant={bookingData ? "outline" : "default"}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {bookingData ? "Ricalcola prezzo" : "Calcola nuovo prezzo"}
          </Button>
          {bookingData && (
            <Button onClick={handleConfirm} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Conferma e paga
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


