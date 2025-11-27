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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { Loader2, AlertTriangle } from "lucide-react"
import { calculateDaysUntilCheckIn } from "@/lib/pricing"
import { BookingCalendarPicker, type DateRange } from "@/components/booking-calendar-picker"

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
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(currentCheckIn),
    to: new Date(currentCheckOut),
  })
  const [loading, setLoading] = useState(false)
  const [priceData, setPriceData] = useState<any>(null)
  const [bookingData, setBookingData] = useState<any>(null)

  const daysUntilCheckIn = calculateDaysUntilCheckIn(currentCheckIn)
  const isWithinSevenDays = daysUntilCheckIn < 7

  // Load booking data
  useEffect(() => {
    if (open) {
      loadBookingData()
    }
  }, [open, bookingId])

  const loadBookingData = async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setBookingData(data)
    } catch (error: any) {
      console.error("[v0] Error loading booking:", error)
      toast.error("Errore nel caricamento della prenotazione")
    }
  }

  const handleCalculatePrice = async () => {
    if (!range?.from || !range?.to) {
      toast.error("Seleziona entrambe le date")
      return
    }

    setLoading(true)
    try {
      const checkIn = range.from.toISOString().split("T")[0]
      const checkOut = range.to.toISOString().split("T")[0]

      const response = await fetch("/api/bookings/change-dates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          checkIn,
          checkOut,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.details)

      // If payment is required, the API returns payment info
      if (data.paymentRequired) {
        setPriceData(data)
        toast.success("Prezzo calcolato con successo!")
      } else {
        // No payment needed (price decreased or same)
        toast.success(data.message || "Date modificate con successo!")
        onSuccess()
        onOpenChange(false)
      }
    } catch (error: any) {
      toast.error(error.message || "Errore nel calcolo del prezzo")
      console.error("[v0] Error calculating price:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!priceData || !priceData.paymentUrl) {
      toast.error("Calcola prima il nuovo prezzo")
      return
    }

    // Redirect to Stripe checkout
    window.location.href = priceData.paymentUrl
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cambia le date della prenotazione</DialogTitle>
          <DialogDescription>
            Seleziona le nuove date. Ti verrà mostrato il prezzo da pagare prima di confermare.
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

        <div className="py-4">
          <BookingCalendarPicker value={range} onChange={setRange} roomId={bookingData?.roomId || "2"} />
        </div>

        {priceData && (
          <div className="space-y-3 bg-secondary/50 rounded-lg p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Prezzo originale</span>
              <span className="font-semibold">€{bookingData?.totalAmount?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Nuovo prezzo totale</span>
              <span className="font-semibold">€{priceData.newTotalAmount?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-3 border-t">
              <span className="font-semibold">Differenza da pagare</span>
              <span className="text-2xl font-bold text-primary">€{priceData.paymentAmount?.toFixed(2)}</span>
            </div>
            {priceData.priceDifference && priceData.priceDifference > 0 && (
              <p className="text-xs text-muted-foreground">Include eventuali penali per modifica date</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annulla
          </Button>
          <Button onClick={handleCalculatePrice} disabled={loading} variant={priceData ? "outline" : "default"}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {priceData ? "Ricalcola prezzo" : "Calcola nuovo prezzo"}
          </Button>
          {priceData && (
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
