"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { useLanguage } from "@/components/language-provider"
import { toast } from "sonner"
import { Sparkles, Clock, CheckCircle2, XCircle, Send } from "lucide-react"

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

interface ServicesRequestCardProps {
  bookingId: string
}

export function ServicesRequestCard({ bookingId }: ServicesRequestCardProps) {
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [notes, setNotes] = useState("")
  const [sending, setSending] = useState(false)

  const { t } = useLanguage()

  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId],
    )
  }

  const handleSubmit = async () => {
    if (selectedServices.length === 0) {
      toast.error("Seleziona almeno un servizio")
      return
    }

    setSending(true)

    try {
      const services = selectedServices.map((id) => AVAILABLE_SERVICES.find((s) => s.id === id)).filter(Boolean)

      const response = await fetch("/api/request-extra-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          services,
          notes,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to send request")
      }

      toast.success("Richiesta inviata! Ti contatteremo presto per confermare la disponibilità.")
      setSelectedServices([])
      setNotes("")
    } catch (error: any) {
      toast.error(error.message || "Errore nell'invio della richiesta")
    } finally {
      setSending(false)
    }
  }

  const totalPrice = selectedServices.reduce((sum, serviceId) => {
    const service = AVAILABLE_SERVICES.find((s) => s.id === serviceId)
    return sum + (service?.price || 0)
  }, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-cinzel text-primary flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          {t("extraServicesRequests")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Seleziona i servizi che desideri aggiungere al tuo soggiorno. Ti contatteremo per confermare la disponibilita'.
        </p>
        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            I servizi selezionati verranno confermati dalla struttura in base alla disponibilita' prima di essere definitivamente accettati.
          </p>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {AVAILABLE_SERVICES.map((service) => (
            <div
              key={service.id}
              className="flex items-start space-x-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <Checkbox
                id={service.id}
                checked={selectedServices.includes(service.id)}
                onCheckedChange={() => toggleService(service.id)}
              />
              <label htmlFor={service.id} className="flex-1 text-sm cursor-pointer">
                <div className="font-medium">{service.name}</div>
                {service.detail && <div className="text-xs text-muted-foreground">{service.detail}</div>}
                <div className="text-muted-foreground font-medium">
                  {service.price > 0 ? `€${service.price}` : "Su richiesta"}
                </div>
              </label>
            </div>
          ))}
        </div>

        {selectedServices.length > 0 && (
          <>
            <div className="bg-secondary/50 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold">{t("estimatedTotal")}</span>
                <span className="text-xl font-bold text-primary">€{totalPrice}</span>
              </div>
            </div>

            <Textarea
              placeholder={t("additionalNotesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />

            <Button onClick={handleSubmit} disabled={sending} className="w-full">
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t("sending")}...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t("requestAvailability")}
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
