"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users, Euro, Phone, Mail, MessageCircle } from "lucide-react"
import { toast } from "sonner"

// Sample pricing data - in a real app this would come from props or API
const roomPricing = {
  basePrice: 180,
  originalPrice: 220,
  currency: "€",
  taxes: 15,
  serviceFee: 10,
  discount: 40,
  available: true,
}

interface BookingWidgetProps {
  roomId: string
}

export function BookingWidget({ roomId }: BookingWidgetProps) {
  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [guests, setGuests] = useState(2)
  const [nights, setNights] = useState(1)

  const calculateTotal = () => {
    const subtotal = roomPricing.basePrice * nights
    const total = subtotal + roomPricing.taxes + roomPricing.serviceFee
    return { subtotal, total }
  }

  const handleBooking = () => {
    if (!checkIn || !checkOut) {
      toast.error("Seleziona le date di soggiorno")
      return
    }

    toast.success("Richiesta di prenotazione inviata!")
    // In a real app, this would redirect to booking confirmation
  }

  const handleQuickContact = (method: string) => {
    toast.success(`Contatto via ${method} avviato`)
  }

  const { subtotal, total } = calculateTotal()

  return (
    <div className="space-y-6">
      {/* Main Booking Card */}
      <Card className="sticky top-24">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Prenota Ora</span>
            <div className="text-right">
              {roomPricing.originalPrice > roomPricing.basePrice && (
                <div className="text-sm line-through text-muted-foreground">
                  {roomPricing.currency}
                  {roomPricing.originalPrice}/notte
                </div>
              )}
              <div className="text-2xl font-bold text-primary">
                {roomPricing.currency}
                {roomPricing.basePrice}
                <span className="text-sm font-normal text-muted-foreground">/notte</span>
              </div>
            </div>
          </CardTitle>
          {roomPricing.originalPrice > roomPricing.basePrice && (
            <Badge className="w-fit bg-green-600 text-white">
              Risparmia {roomPricing.currency}
              {roomPricing.discount}
            </Badge>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Date Selection */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="checkin">Check-in</Label>
              <div className="relative">
                <Input
                  id="checkin"
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="pl-10"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div>
              <Label htmlFor="checkout">Check-out</Label>
              <div className="relative">
                <Input
                  id="checkout"
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="pl-10"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Guests Selection */}
          <div>
            <Label htmlFor="guests">Ospiti</Label>
            <div className="relative">
              <Input
                id="guests"
                type="number"
                min="1"
                max="4"
                value={guests}
                onChange={(e) => setGuests(Number.parseInt(e.target.value))}
                className="pl-10"
              />
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {/* Nights Selection */}
          <div>
            <Label htmlFor="nights">Notti</Label>
            <Input
              id="nights"
              type="number"
              min="1"
              max="30"
              value={nights}
              onChange={(e) => setNights(Number.parseInt(e.target.value))}
            />
          </div>

          <Separator />

          {/* Price Breakdown */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>
                {roomPricing.currency}
                {roomPricing.basePrice} × {nights} notti
              </span>
              <span>
                {roomPricing.currency}
                {subtotal}
              </span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Tasse e imposte</span>
              <span>
                {roomPricing.currency}
                {roomPricing.taxes}
              </span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Commissione servizio</span>
              <span>
                {roomPricing.currency}
                {roomPricing.serviceFee}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Totale</span>
              <span className="text-primary">
                {roomPricing.currency}
                {total}
              </span>
            </div>
          </div>

          {/* Booking Button */}
          <Button onClick={handleBooking} className="w-full" size="lg" disabled={!roomPricing.available}>
            {roomPricing.available ? "Prenota Ora" : "Non Disponibile"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">Non verrai addebitato subito</p>
        </CardContent>
      </Card>

      {/* Quick Contact Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contatto Rapido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start bg-transparent"
            onClick={() => handleQuickContact("telefono")}
          >
            <Phone className="w-4 h-4 mr-2" />
            Chiama Ora
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start bg-transparent"
            onClick={() => handleQuickContact("email")}
          >
            <Mail className="w-4 h-4 mr-2" />
            Invia Email
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start bg-transparent"
            onClick={() => handleQuickContact("chat")}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Chat Live
          </Button>
        </CardContent>
      </Card>

      {/* Special Offers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Euro className="w-5 h-5" />
            Offerte Speciali
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-medium text-green-800">Soggiorno Lungo</div>
              <div className="text-sm text-green-600">10% di sconto per soggiorni di 7+ notti</div>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="font-medium text-blue-800">Prenotazione Anticipata</div>
              <div className="text-sm text-blue-600">15% di sconto prenotando 30 giorni prima</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
