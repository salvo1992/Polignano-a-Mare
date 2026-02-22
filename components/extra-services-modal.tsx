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
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const AVAILABLE_SERVICES = [
  { id: "massage", name: "Massaggio Rilassante - 50 min", price: 80, detail: "a persona" },
  { id: "romantic-dinner", name: "Cena Romantica - Villa degli Aranci", price: 120, detail: "a coppia, bevande escluse" },
  { id: "boat-tour", name: "Tour in Barca a Polignano - 1.30h/2h", price: 40, detail: "a persona (Exclusive da 400 EUR)" },
  { id: "transfer", name: "Trasferimento Aeroporto Bari/Brindisi", price: 130, detail: "per 2 persone" },
  { id: "berlucchi", name: "Bottiglia Berlucchi 61 Pas Dose", price: 75, detail: "in camera" },
  { id: "berlucchi-rose", name: "Bottiglia Berlucchi Rose'", price: 70, detail: "in camera" },
  { id: "champagne", name: "Bottiglia Champagne", price: 129, detail: "in camera" },
  { id: "special", name: "Richiesta Speciale (compleanni, anniversari, proposte)", price: 0, detail: "da concordare" },
]

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
  bookingData?: {
    roomId: string
    checkIn: string
    checkOut: string
    guests: number
    userEmail: string
    userName: string
  }
}

export function ExtraServicesModal({ open, onOpenChange, onComplete, bookingData }: Props) {
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId],
    )
  }

  const handleSkip = () => {
    onOpenChange(false)
    onComplete()
  }

  const handleSubmit = async () => {
    if (selectedServices.length === 0) {
      toast({
        title: "Nessun servizio selezionato",
        description: "Seleziona almeno un servizio o clicca 'Salta' per continuare.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const selectedServiceDetails = AVAILABLE_SERVICES.filter((s) => selectedServices.includes(s.id))

      const response = await fetch("/api/extra-services/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...bookingData,
          services: selectedServiceDetails,
          notes,
        }),
      })

      if (!response.ok) {
        throw new Error("Errore durante l'invio della richiesta")
      }

      toast({
        title: "Richiesta inviata!",
        description:
          "Il gestore ti risponderà via email per confermare la disponibilità e fornire i dettagli di pagamento.",
      })

      onOpenChange(false)
      onComplete()
    } catch (error) {
      console.error("Error requesting services:", error)
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'invio della richiesta. Riprova.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalPrice = selectedServices.reduce((sum, id) => {
    const service = AVAILABLE_SERVICES.find((s) => s.id === id)
    return sum + (service?.price || 0)
  }, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Servizi Extra Disponibili
          </DialogTitle>
          <DialogDescription>
            Seleziona i servizi extra che desideri aggiungere al tuo soggiorno.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {AVAILABLE_SERVICES.map((service) => (
              <div
                key={service.id}
                className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => handleServiceToggle(service.id)}
              >
                <Checkbox
                  id={service.id}
                  checked={selectedServices.includes(service.id)}
                  onCheckedChange={() => handleServiceToggle(service.id)}
                />
                <div className="flex-1">
                  <label htmlFor={service.id} className="text-sm font-medium cursor-pointer">
                    {service.name}
                  </label>
                  {service.detail && (
                    <p className="text-xs text-muted-foreground">{service.detail}</p>
                  )}
                  <p className="text-sm text-primary font-semibold">
                    {service.price > 0 ? `€${service.price}` : "Su richiesta"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
              I servizi selezionati verranno confermati dalla struttura in base alla disponibilita' prima di essere definitivamente accettati. Riceverai una email di conferma.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Note aggiuntive (opzionale)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Aggiungi eventuali richieste o preferenze specifiche..."
              className="min-h-[80px]"
            />
          </div>

          {selectedServices.length > 0 && (
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm font-semibold">
                Totale stimato: <span className="text-primary text-lg">€{totalPrice}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Prezzo indicativo. La conferma definitiva e il pagamento avverranno dopo la verifica di disponibilita' da parte della struttura.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleSkip} disabled={isSubmitting}>
            Salta
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || selectedServices.length === 0}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Invio in corso...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Invia Richiesta
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
