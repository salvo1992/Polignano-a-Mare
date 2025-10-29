"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, Send } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { toast } from "sonner"

const AVAILABLE_SERVICES = [
  { id: "massage", name: "Massaggio Rilassante Romano", price: 80 },
  { id: "dinner", name: "Cena Romantica Imperiale", price: 120 },
  { id: "wine-tour", name: "Tour Enogastronomico dei Castelli", price: 95 },
  { id: "facial", name: "Trattamento Viso alle Terme", price: 65 },
  { id: "horseback", name: "Passeggiata a Cavallo", price: 75 },
  { id: "cooking", name: "Corso di Cucina Romana", price: 85 },
  { id: "photo-tour", name: "Tour Fotografico Roma Antica", price: 110 },
  { id: "yoga", name: "Yoga al Tramonto", price: 45 },
]

interface ServicesRequestCardProps {
  bookingId: string
}

export function ServicesRequestCard({ bookingId }: ServicesRequestCardProps) {
  const { t } = useLanguage()
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [notes, setNotes] = useState("")
  const [sending, setSending] = useState(false)

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

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    toast.success("Richiesta inviata! Ti contatteremo presto per confermare la disponibilità.")
    setSelectedServices([])
    setNotes("")
    setSending(false)
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
          Richiedi Servizi Extra
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Seleziona i servizi che desideri aggiungere al tuo soggiorno. Ti contatteremo per confermare la disponibilità.
        </p>

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
                <div className="text-muted-foreground">€{service.price}</div>
              </label>
            </div>
          ))}
        </div>

        {selectedServices.length > 0 && (
          <>
            <div className="bg-secondary/50 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Totale stimato:</span>
                <span className="text-xl font-bold text-primary">€{totalPrice}</span>
              </div>
            </div>

            <Textarea
              placeholder="Note aggiuntive o preferenze orarie..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />

            <Button onClick={handleSubmit} disabled={sending} className="w-full">
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Invio in corso...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Richiedi Disponibilità
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
