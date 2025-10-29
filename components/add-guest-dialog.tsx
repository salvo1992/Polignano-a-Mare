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
  const [guestName, setGuestName] = useState("")
  const [loading, setLoading] = useState(false)

  const canAddGuest = currentGuests < maxGuests

  const handleAdd = async () => {
    if (!guestName.trim()) {
      toast.error("Inserisci il nome dell'ospite")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/bookings/add-guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          guestName: guestName.trim(),
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      toast.success("Ospite aggiunto con successo!")
      setGuestName("")
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || "Errore nell'aggiunta dell'ospite")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aggiungi ospite</DialogTitle>
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
                <Label htmlFor="guestName">Nome completo ospite</Label>
                <Input
                  id="guestName"
                  placeholder="Mario Rossi"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
              </div>

              <div className="bg-secondary/50 rounded-lg p-4 text-sm">
                <p className="text-muted-foreground mb-1">Ospiti attuali / Massimo</p>
                <p className="text-xl font-bold">
                  {currentGuests} / {maxGuests}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Annulla
              </Button>
              <Button onClick={handleAdd} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Aggiungi ospite
              </Button>
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
