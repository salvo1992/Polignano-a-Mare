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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { Loader2, AlertTriangle } from "lucide-react"

interface CancelBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  checkIn: string
  totalAmount: number
  onSuccess: () => void
}

export function CancelBookingDialog({
  open,
  onOpenChange,
  bookingId,
  checkIn,
  totalAmount,
  onSuccess,
}: CancelBookingDialogProps) {
  const [loading, setLoading] = useState(false)

  const daysUntilCheckIn = Math.ceil((new Date(checkIn).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  const isFullRefund = daysUntilCheckIn >= 7
  const refundAmount = isFullRefund ? totalAmount : 0
  const penalty = isFullRefund ? 0 : totalAmount

  const handleCancel = async () => {
    const confirmed = confirm(
      `Sei sicuro di voler cancellare questa prenotazione? ${
        isFullRefund
          ? `Riceverai un rimborso completo di €${refundAmount.toFixed(2)}.`
          : `Non riceverai alcun rimborso e dovrai pagare una penale di €${penalty.toFixed(2)}.`
      }`,
    )

    if (!confirmed) return

    setLoading(true)

    // Use requestIdleCallback to prevent blocking UI
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      window.requestIdleCallback(async () => {
        await performCancellation()
      })
    } else {
      await performCancellation()
    }
  }

  const performCancellation = async () => {
    try {
      const response = await fetch("/api/bookings/cancel", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      toast.success("Prenotazione cancellata con successo!")
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || "Errore nella cancellazione")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancella prenotazione</DialogTitle>
          <DialogDescription>
            Sei sicuro di voler cancellare questa prenotazione? Questa azione non può essere annullata.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isFullRefund ? (
            <Alert>
              <AlertDescription>
                <p className="font-semibold mb-2">✓ Rimborso completo</p>
                <p className="text-sm">
                  Cancellando ora (più di 7 giorni prima del check-in), riceverai un rimborso completo di{" "}
                  <span className="font-bold">€{refundAmount.toFixed(2)}</span> entro 3 giorni lavorativi.
                </p>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-2">⚠ Penale di cancellazione</p>
                <p className="text-sm">
                  Cancellando ora (meno di 7 giorni prima del check-in), non riceverai alcun rimborso e dovrai pagare
                  una penale di <span className="font-bold">€{penalty.toFixed(2)}</span>.
                </p>
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-secondary/50 rounded-lg p-4 text-sm">
            <p className="text-muted-foreground mb-1">Giorni mancanti al check-in</p>
            <p className="text-2xl font-bold">{daysUntilCheckIn} giorni</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annulla
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Conferma cancellazione
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
