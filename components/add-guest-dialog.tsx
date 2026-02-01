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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { calculatePriceByGuests, calculateNights } from "@/lib/pricing"

interface AddGuestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  currentGuests: number
  maxGuests: number
  onSuccess: () => void
}

export function AddGuestDialog({
  open,
  onOpenChange,
  bookingId,
  currentGuests,
  maxGuests,
  onSuccess,
}: AddGuestDialogProps) {
  const [newGuestsCount, setNewGuestsCount] = useState(currentGuests + 1)
  const [loading, setLoading] = useState(false)
  const [priceDifference, setPriceDifference] = useState<number | null>(null)
  const [bookingData, setBookingData] = useState<any>(null)

  const canAddGuest = currentGuests < maxGuests

  const handleCalculatePrice = async () => {
    if (newGuestsCount <= currentGuests) {
      toast.error("Il numero di ospiti deve essere maggiore di quello attuale")
      return
    }

    if (newGuestsCount > maxGuests) {
      toast.error(`Numero massimo di ospiti: ${maxGuests}`)
      return
    }

    setLoading(true)
    try {
      // Get booking data
      const response = await fetch(`/api/bookings/${bookingId}`)
      const data = await response.json()

      if (!response.ok) throw new Error(data.error)

      setBookingData(data)

      const nights = calculateNights(data.checkIn, data.checkOut)
      const currentPrice = calculatePriceByGuests(currentGuests, nights)
      const newPrice = calculatePriceByGuests(newGuestsCount, nights)
      const difference = newPrice - currentPrice

      setPriceDifference(difference)
      toast.success(`Differenza prezzo: €${(difference / 100).toFixed(2)}`)
    } catch (error: any) {
      toast.error(error.message || "Errore nel calcolo del prezzo")
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (priceDifference === null || !bookingData) {
      toast.error("Calcola prima la differenza di prezzo")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/bookings/add-guest", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          newGuestsCount,
          priceDifference,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      // If there's a price difference, redirect to Stripe payment
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        toast.success("Ospiti aggiunti con successo!")
        onSuccess()
        onOpenChange(false)
      }
    } catch (error: any) {
      toast.error(error.message || "Errore nell'aggiunta degli ospiti")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aggiungi ospiti</DialogTitle>
          <DialogDescription>
            {canAddGuest
              ? `Puoi aggiungere fino a ${maxGuests - currentGuests} ospite/i aggiuntivo/i.`
              : "Hai raggiunto il numero massimo di ospiti per questa camera."}
          </DialogDescription>
        </DialogHeader>

        {canAddGuest ? (
          <>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="guestsCount">Nuovo numero di ospiti</Label>
                <Input
                  id="guestsCount"
                  type="number"
                  min={currentGuests + 1}
                  max={maxGuests}
                  value={newGuestsCount}
                  onChange={(e) => setNewGuestsCount(Number.parseInt(e.target.value) || currentGuests + 1)}
                />
                <p className="text-sm text-muted-foreground mt-1">Attualmente: {currentGuests} ospite/i</p>
              </div>

              {priceDifference !== null && (
                <div className="bg-secondary/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Differenza prezzo</p>
                  <p className="text-2xl font-bold text-primary">+€{(priceDifference / 100).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Calcolato secondo lo schema prezzi per {newGuestsCount} ospiti
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Annulla
              </Button>
              {priceDifference === null ? (
                <Button onClick={handleCalculatePrice} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Calcola differenza
                </Button>
              ) : (
                <Button onClick={handleConfirm} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Conferma e paga
                </Button>
              )}
            </DialogFooter>
          </>
        ) : (
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Chiudi</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
