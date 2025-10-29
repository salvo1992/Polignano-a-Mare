"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Calendar, Users, Mail, Phone, CreditCard, FileText, ArrowLeft, Copy, Check, UserPlus } from "lucide-react"
import { getBookingById } from "@/lib/firebase"
import { useLanguage } from "@/components/language-provider"
import Image from "next/image"
import { ServicesRequestCard } from "@/components/services-request-card"
import { ChangeDatesDialog } from "@/components/change-dates-dialog"
import { CancelBookingDialog } from "@/components/cancel-booking-dialog"
import { AddGuestDialog } from "@/components/add-guest-dialog"

export default function BookingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useLanguage()
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const [changeDatesOpen, setChangeDatesOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [addGuestOpen, setAddGuestOpen] = useState(false)

  const loadBooking = async () => {
    if (!params.id) return
    const data = await getBookingById(params.id as string)
    setBooking(data)
    setLoading(false)
  }

  useEffect(() => {
    loadBooking()
  }, [params.id])

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2)
  }

  const getRoomImage = (roomName: string) => {
    if (!roomName) {
      return "/images/room-1.jpg"
    }
    if (roomName.toLowerCase().includes("familiare") || roomName.toLowerCase().includes("balcone")) {
      return "/images/room-2.jpg"
    }
    return "/images/room-1.jpg"
  }

  const CONTACT_PHONE = "+39 375 701 7689"
  const CONTACT_EMAIL = "info@AL22Suite&SPALUXURYEXPERIENCE.it"

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="pt-32 pb-16 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        <Footer />
      </main>
    )
  }

  if (!booking) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="pt-32 pb-16 text-center">
          <p className="text-muted-foreground">Prenotazione non trovata</p>
          <Button onClick={() => router.push("/user")} className="mt-4">
            Torna al profilo
          </Button>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Back Button */}
          <Button variant="ghost" onClick={() => router.push("/user")} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna al profilo
          </Button>

          {/* Status Badge */}
          <div className="mb-6">
            <Badge variant={booking.status === "confirmed" ? "default" : "secondary"} className="text-lg px-4 py-2">
              {booking.status === "confirmed" ? "✓ Confermata" : booking.status === "paid" ? "✓ Pagata" : "In attesa"}
            </Badge>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Room Image and Info */}
              <Card>
                <CardContent className="p-0">
                  <div className="relative h-64 w-full">
                    <Image
                      src={getRoomImage(booking.roomName) || "/placeholder.svg"}
                      alt={booking.roomName}
                      fill
                      className="object-cover rounded-t-lg"
                    />
                  </div>
                  <div className="p-6">
                    <h1 className="text-3xl font-cinzel font-bold text-roman-gradient mb-2">{booking.roomName}</h1>
                    <p className="text-muted-foreground mb-4">AL 22 Suite & Spa - Polignano a Mare</p>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="font-semibold">
                        Ospite: {booking.firstName} {booking.lastName}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Booking Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-cinzel text-primary flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Dettagli Prenotazione
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Confirmation Number */}
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Numero di conferma</p>
                        <p className="text-2xl font-bold">{booking.id.slice(0, 12).toUpperCase()}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(booking.id, "confirmation")}>
                        {copiedField === "confirmation" ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Dates */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-primary mt-1" />
                      <div>
                        <p className="text-sm text-muted-foreground">Check-in</p>
                        <p className="font-semibold">
                          {new Date(booking.checkIn).toLocaleDateString("it-IT", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">dalle ore 15:00</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-primary mt-1" />
                      <div>
                        <p className="text-sm text-muted-foreground">Check-out</p>
                        <p className="font-semibold">
                          {new Date(booking.checkOut).toLocaleDateString("it-IT", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">fino alle ore 10:00</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Guest Info */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Ospiti</p>
                        <p className="font-semibold">
                          {booking.guests} {booking.guests === 1 ? "persona" : "persone"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-semibold">{booking.email}</p>
                      </div>
                    </div>
                    {booking.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Telefono</p>
                          <p className="font-semibold">{booking.phone}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {booking.notes && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Richieste speciali</p>
                        <p className="text-sm bg-secondary/50 rounded-lg p-3">{booking.notes}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Payment Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-cinzel text-primary flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Informazioni sul Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Costo totale</span>
                    <span className="font-bold text-xl">€{formatPrice(booking.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Totale prossimi pagamenti</span>
                    <span className="font-semibold">€{formatPrice(booking.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Totale pagato</span>
                    <span className="font-semibold">€ 0</span>
                  </div>
                  <Separator />
                  <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 text-sm">
                    <p className="font-semibold mb-1">💳 Pagamento online</p>
                    <p className="text-muted-foreground">
                      Il pagamento è effettuato online al momento della prenotazione.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Manage Booking */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-cinzel text-primary">Gestisci la prenotazione</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent"
                    onClick={() => setChangeDatesOpen(true)}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Cambia le date
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent"
                    onClick={() => setAddGuestOpen(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Aggiungi ospite
                  </Button>
                  <Button variant="destructive" className="w-full justify-start" onClick={() => setCancelOpen(true)}>
                    Cancella la prenotazione
                  </Button>
                </CardContent>
              </Card>

              {/* Contact */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-cinzel text-primary">Contatta la struttura</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-primary" />
                    <a href={`tel:${CONTACT_PHONE}`} className="hover:text-primary transition-colors">
                      {CONTACT_PHONE}
                    </a>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={() => window.open(`https://wa.me/${CONTACT_PHONE.replace(/\s/g, "")}`, "_blank")}
                  >
                    Invia un messaggio
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={() => (window.location.href = `mailto:${CONTACT_EMAIL}`)}
                  >
                    Invia un'e-mail
                  </Button>
                </CardContent>
              </Card>

              {/* Services Request Card */}
              <ServicesRequestCard bookingId={booking.id} />
            </div>
          </div>
        </div>
      </div>

      <ChangeDatesDialog
        open={changeDatesOpen}
        onOpenChange={setChangeDatesOpen}
        bookingId={booking.id}
        currentCheckIn={booking.checkIn}
        currentCheckOut={booking.checkOut}
        onSuccess={loadBooking}
      />

      <CancelBookingDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        bookingId={booking.id}
        checkIn={booking.checkIn}
        totalAmount={booking.totalAmount}
        onSuccess={() => router.push("/user")}
      />

      <AddGuestDialog
        open={addGuestOpen}
        onOpenChange={setAddGuestOpen}
        bookingId={booking.id}
        currentGuests={booking.guests || 1}
        maxGuests={booking.maxGuests || 2}
        onSuccess={loadBooking}
      />

      <Footer />
    </main>
  )
}


