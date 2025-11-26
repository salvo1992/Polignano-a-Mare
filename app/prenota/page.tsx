"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CalendarIcon, Users, MapPin, Clock, AlertCircle } from "lucide-react"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import { createBooking, type BookingPayload, getAllRooms } from "@/lib/firebase"
import { checkRoomAvailability } from "@/lib/booking-utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { BookingCalendarPicker, type DateRange } from "@/components/booking-calendar-picker"
import { useLanguage } from "@/components/language-provider"
import { useDynamicPrice } from "@/hooks/use-dynamic-price"

const ROOM_IDS: Record<string, string> = { deluxe: "1", suite: "2" }
const ROOM_NAMES: Record<string, string> = {
  deluxe: "Camera Familiare con Balcone",
  suite: "Camera Matrimoniale con Vasca Idromassaggio",
}

const AVAILABLE_SERVICES = [
  { name: "Massaggio Rilassante Romano", price: 80 },
  { name: "Cena Romantica Imperiale", price: 120 },
  { name: "Tour Enogastronomico dei Castelli", price: 95 },
  { name: "Trattamento Viso alle Terme", price: 65 },
  { name: "Passeggiata a Cavallo", price: 75 },
  { name: "Corso di Cucina Romana", price: 85 },
  { name: "Tour Fotografico Roma Antica", price: 110 },
  { name: "Yoga al Tramonto", price: 45 },
]

export default function PrenotaPage() {
  const router = useRouter()
  const search = useSearchParams()
  const { language, t } = useLanguage()
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation()

  // ---- Prezzi / form ----
  const [roomPrices, setRoomPrices] = useState<Record<string, number>>({ deluxe: 120, suite: 180 })
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    checkIn: "",
    checkOut: "",
    guests: "2", // Now represents adults only
    children: "0", // Added children field
    roomType: "",
    specialRequests: "",
  })

  // ---- Date range (unico comando) ----
  const [range, setRange] = useState<DateRange | undefined>(undefined)

  // ---- Pagamenti / UI ----
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [availabilityStatus, setAvailabilityStatus] = useState<{ available: boolean; message: string } | null>(null)

  const hasError = search.get("error") === "payment_failed"

  // Utils
  const toInputDate = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
  }
  const parseInputDate = (s: string) => {
    const d = new Date(s)
    return isNaN(d.getTime()) ? undefined : d
  }

  // ---- Fetch prezzi camere ----
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const rooms = await getAllRooms()
        const prices: Record<string, number> = {}
        rooms.forEach((room) => {
          if (room.id === "1") prices.deluxe = room.price
          if (room.id === "2") prices.suite = room.price
        })
        setRoomPrices((prev) => ({ ...prev, ...prices }))
      } catch (error) {
        console.error("[booking] Error fetching room prices:", error)
      }
    }
    fetchPrices()
  }, [])

  // ---- Payment error da QS ----
  useEffect(() => {
    if (hasError) {
      setErrorMessage(
        t("bookingErrorDescription") || "Si è verificato un problema con la transazione. Riprova tra 5 minuti.",
      )
      setShowErrorModal(true)
    }
  }, [hasError, t])

  // ---- Sync calendar -> form ----
  useEffect(() => {
    if (range?.from) {
      setFormData((s) => ({ ...s, checkIn: toInputDate(range.from!) }))
    } else {
      setFormData((s) => ({ ...s, checkIn: "" }))
    }
    if (range?.to) {
      setFormData((s) => ({ ...s, checkOut: toInputDate(range.to!) }))
    } else {
      setFormData((s) => ({ ...s, checkOut: "" }))
    }
  }, [range])

  // ---- Sync form (input nascosti) -> calendar (se arrivano valori da QS/SSR) ----
  useEffect(() => {
    const from = parseInputDate(formData.checkIn)
    const to = parseInputDate(formData.checkOut)
    if (from && to) setRange({ from, to })
    else if (from && !to) setRange({ from, to: undefined })
  }, [formData.checkIn, formData.checkOut])

  // ---- Availability check ----
  useEffect(() => {
    const checkAvailability = async () => {
      if (formData.checkIn && formData.checkOut && formData.roomType) {
        setIsCheckingAvailability(true)
        try {
          const roomId = ROOM_IDS[formData.roomType]
          const isAvailable = await checkRoomAvailability(roomId, formData.checkIn, formData.checkOut)
          setAvailabilityStatus({
            available: isAvailable,
            message: isAvailable
              ? t("roomAvailable") || "Camera disponibile per le date selezionate."
              : t("roomNotAvailable") || "La camera non è disponibile per le date selezionate.",
          })
        } catch (error) {
          console.error("[booking] Error checking availability:", error)
          setAvailabilityStatus(null)
        } finally {
          setIsCheckingAvailability(false)
        }
      } else {
        setAvailabilityStatus(null)
      }
    }
    checkAvailability()
  }, [formData.checkIn, formData.checkOut, formData.roomType, t])

  // ---- Calculate dynamic price based on selected dates and room ----
  const { pricePerNight: dynamicPrice, loading: priceLoading } = useDynamicPrice(
    ROOM_IDS[formData.roomType] || "",
    formData.checkIn,
    formData.checkOut,
    Number(formData.guests || "2"),
  )

  // ---- Notti e totale ----
  const nights = useMemo(() => {
    const ci = formData.checkIn ? new Date(formData.checkIn) : null
    const co = formData.checkOut ? new Date(formData.checkOut) : null
    if (!ci || !co || isNaN(ci.getTime()) || isNaN(co.getTime())) return 0
    const diff = Math.ceil((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  }, [formData.checkIn, formData.checkOut])

  const basePrice = dynamicPrice || roomPrices[formData.roomType] || 0
  const adults = Number(formData.guests || "1")
  const children = Number(formData.children || "0")
  const totalGuests = adults + children

  const extraAdults = Math.max(0, adults - 2)
  const extraChildren = totalGuests <= 2 ? 0 : Math.max(0, children - Math.max(0, 2 - adults))
  const extraFeePerNight = extraAdults * 60 + extraChildren * 48
  const total = nights * (basePrice + extraFeePerNight)

  // ---- Submit ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.checkIn || !formData.checkOut) {
      setErrorMessage(t("pleaseSelectDates") || "Seleziona le date di check-in e check-out.")
      setShowErrorModal(true)
      return
    }
    const checkInDate = new Date(formData.checkIn)
    const checkOutDate = new Date(formData.checkOut)
    if (checkOutDate <= checkInDate) {
      setErrorMessage(t("invalidDateRange") || "La data di check-out deve essere successiva al check-in.")
      setShowErrorModal(true)
      return
    }
    if (!availabilityStatus?.available) {
      setErrorMessage(t("roomNotAvailableError") || "La camera selezionata non è disponibile in queste date.")
      setShowErrorModal(true)
      return
    }

    handleProceedToCheckout()
  }

  const handleProceedToCheckout = async () => {
    proceedToPayment()
  }

  const proceedToPayment = async () => {
    const payload: BookingPayload = {
      checkIn: formData.checkIn,
      checkOut: formData.checkOut,
      guests: Number(formData.guests || "1"),
      children: Number(formData.children || "0"),
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      notes: formData.specialRequests,
      pricePerNight: basePrice,
      totalAmount: Math.round(total * 100),
      currency: "EUR",
      status: "pending",
      origin: "site",
      roomId: ROOM_IDS[formData.roomType],
      roomName: ROOM_NAMES[formData.roomType],
    }

    try {
      const bookingId = await createBooking(payload)
      const qs = new URLSearchParams({ bookingId, method: "stripe" }).toString()
      router.push(`/checkout?${qs}`)
    } catch (err) {
      console.error("[booking] Create booking error:", err)
      setErrorMessage(t("bookingErrorDescription") || "Si è verificato un problema con la prenotazione.")
      setShowErrorModal(true)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target

    // If changing adults or children, validate total doesn't exceed 4
    if (name === "guests" || name === "children") {
      const newAdults = name === "guests" ? Number(value) : adults
      const newChildren = name === "children" ? Number(value) : children
      const newTotal = newAdults + newChildren

      if (newTotal > 4) {
        // Don't allow change if it would exceed 4 total guests
        return
      }
    }

    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <>
      <main className="min-h-screen">
        <Header />

        <div className="pt-20 pb-16">
          <div className="container mx-auto px-4">
            {/* HERO */}
            <div
              ref={heroRef}
              className={`mb-8 text-center transition-all duration-1000 ${
                heroVisible ? "animate-fade-in-up opacity-100" : "opacity-0 translate-y-[50px]"
              }`}
            >
              <h1 className="text-4xl md:text-6xl font-cinzel font-bold text-roman-gradient mb-3 animate-text-shimmer">
                {t("bookingPageTitle") || "Prenota il Tuo Soggiorno"}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                {t("bookingPageSubtitle") || "Vivi un'esperienza indimenticabile nel cuore di Polignano a Mare"}
              </p>
            </div>

            {/* LAYOUT: Form (2col) + Info Cards (1col) */}
            <div className="grid gap-6 lg:grid-cols-3 max-w-5xl mx-auto">
              {/* === FORM PRENOTAZIONE (2 colonne) === */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-2xl font-cinzel text-primary">
                    {t("bookingDetailsTitle") || "Dettagli Prenotazione"}
                  </CardTitle>
                  <CardDescription>
                    {t("bookingDetailsSubtitle") || "Compila il modulo per prenotare il tuo soggiorno"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Date range - UN SOLO COMANDO */}
                  <div className="border rounded-lg p-4 bg-background/50">
                    <Label className="mb-2 block font-medium">{t("bookingDates") || "Date di soggiorno"}</Label>

                    <BookingCalendarPicker
                      value={range}
                      onChange={(next) => setRange(next)}
                      roomId={ROOM_IDS[formData.roomType] || "2"}
                    />

                    {/* hidden per submit/validazioni lato form */}
                    <input type="hidden" name="checkIn" value={formData.checkIn} />
                    <input type="hidden" name="checkOut" value={formData.checkOut} />

                    {/* Avvisi disponibilità */}
                    <div className="mt-3">
                      {isCheckingAvailability && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>{t("checkingAvailability") || "Verifica disponibilità…"}</AlertTitle>
                          <AlertDescription>{t("pleaseWait") || "Attendi qualche secondo."}</AlertDescription>
                        </Alert>
                      )}
                      {availabilityStatus && !isCheckingAvailability && (
                        <Alert variant={availabilityStatus.available ? "default" : "destructive"}>
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>
                            {availabilityStatus.available
                              ? t("roomAvailable") || "Camera disponibile"
                              : t("roomNotAvailable") || "Camera non disponibile"}
                          </AlertTitle>
                          <AlertDescription>
                            {availabilityStatus.available
                              ? t("roomAvailableDesc") || "Procedi con la prenotazione."
                              : t("roomNotAvailableDesc") || "Seleziona altre date o un'altra camera."}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>

                  {/* Dati ospite */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">{t("bookingFormFirstName") || "Nome"}</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">{t("bookingFormLastName") || "Cognome"}</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">{t("bookingFormEmail") || "Email"}</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">{t("bookingFormPhone") || "Telefono"}</Label>
                      <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="guests">Adulti</Label>
                      <select
                        id="guests"
                        name="guests"
                        value={formData.guests}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background"
                        required
                      >
                        <option value="1">1 Adulto</option>
                        <option value="2" disabled={children >= 4}>
                          2 Adulti
                        </option>
                        <option value="3" disabled={children >= 2}>
                          3 Adulti
                        </option>
                        <option value="4" disabled={children >= 1}>
                          4 Adulti
                        </option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="children">Bambini (11+ anni)</Label>
                      <select
                        id="children"
                        name="children"
                        value={formData.children}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      >
                        <option value="0">0 Bambini</option>
                        <option value="1" disabled={adults >= 4}>
                          1 Bambino
                        </option>
                        <option value="2" disabled={adults >= 3}>
                          2 Bambini
                        </option>
                        <option value="3" disabled={adults >= 2}>
                          3 Bambini
                        </option>
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Accettiamo bambini da 11 anni in su. Max 4 ospiti totali per camera.
                      </p>
                    </div>
                  </div>

                  {totalGuests > 4 && (
                    <div className="text-sm text-destructive">Massimo 4 ospiti totali (adulti + bambini)</div>
                  )}

                  <div>
                    <Label htmlFor="roomType">{t("bookingFormRoomType") || "Tipo Camera"}</Label>
                    <select
                      id="roomType"
                      name="roomType"
                      value={formData.roomType}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      required
                    >
                      <option value="">{t("bookingFormSelectRoom") || "Seleziona una camera"}</option>
                      <option value="deluxe">{t("bookingFormPanoramicSuite") || "Camera familiare con balcone"}</option>
                      <option value="suite">{t("bookingFormjacuziRoom") || "Camera jacuzi"}</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="specialRequests">{t("bookingFormSpecialRequests") || "Richieste Speciali"}</Label>
                    <Textarea
                      id="specialRequests"
                      name="specialRequests"
                      value={formData.specialRequests}
                      onChange={handleInputChange}
                      placeholder={t("bookingFormSpecialRequestsPlaceholder") || "Eventuali richieste particolari…"}
                      rows={3}
                    />
                  </div>

                  <div className="border rounded-lg p-5 bg-gradient-to-br from-[#635BFF]/5 to-[#635BFF]/10">
                    <div className="flex items-center justify-center mb-3">
                      <svg width="80" height="33" viewBox="0 0 60 25" fill="none" aria-hidden="true">
                        <path
                          d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.9 0 1.85 6.29.97 6.29 5.88z"
                          fill="#635BFF"
                        />
                      </svg>
                    </div>
                    <p className="text-center text-sm text-muted-foreground">
                      {t("bookingPaymentDescription") ||
                        "Pagamento sicuro con carte di credito, Klarna, Apple Pay e Google Pay"}
                    </p>
                  </div>

                  {/* Riepilogo totale */}
                  <div className="flex items-center justify-between bg-muted/40 rounded-lg px-4 py-3">
                    <div className="text-sm text-muted-foreground">
                      {nights > 0
                        ? `${nights} ${
                            nights > 1 ? t("bookingNightsPlural") || "notti" : t("bookingNights") || "notte"
                          } • ${adults} ${adults > 1 ? "adulti" : "adulto"}${children > 0 ? ` + ${children} ${children > 1 ? "bambini" : "bambino"}` : ""}`
                        : t("bookingSummaryCompleteDates") || "Completa date e camera"}
                    </div>
                    <div className="text-xl font-semibold">
                      {t("bookingSummaryTotal") || "Totale"}: €{isFinite(total) ? total.toFixed(2) : "0.00"}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full text-lg py-6"
                    disabled={!availabilityStatus?.available || isCheckingAvailability}
                    onClick={handleSubmit}
                  >
                    {t("bookingConfirmButton") || "Conferma Prenotazione"}
                  </Button>
                </CardContent>
              </Card>

              {/* === INFO CARDS (colonna destra) === */}
              <div className="space-y-4 lg:sticky lg:top-24 h-max">
                {/* Card 1 */}
                <Card className="h-full border-0 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/10">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-primary mt-1" />
                      <div>
                        <h3 className="font-cinzel font-semibold text-primary mb-2">
                          {t("bookingCheckInOutTitle") || "Check-in / Check-out"}
                        </h3>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-primary" />
                            <span className="font-medium">{t("bookingCheckIn") || "Check-in: 15:00 – 20:00"}</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-primary" />
                            <span className="font-medium">{t("bookingCheckOut") || "Check-out: 08:00 – 11:00"}</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            <span>{t("bookingMaxGuests") || "Max 4 ospiti per camera"}</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card 2 */}
                <Card className="h-full border-0 bg-gradient-to-br from-accent/5 via-secondary/10 to-primary/5">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-primary mt-1" />
                      <div>
                        <h3 className="font-cinzel font-semibold text-primary mb-2">
                          {t("bookingHowToReachTitle") || "Come Raggiungerci"}
                        </h3>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>{t("bookingLocation") || "Centro storico, Polignano a Mare (BA)"}</p>
                          <p>{t("bookingAirport") || "Aeroporto Bari: ~45 min"}</p>
                          <p>{t("bookingStation") || "Stazione FS: ~10 min a piedi"}</p>
                          <p>{t("bookingBeach") || "Lama Monachile: ~5 min a piedi"}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        <Footer />

        {/* MODALE ERRORE */}
        <AlertDialog open={showErrorModal} onOpenChange={setShowErrorModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("bookingErrorTitle") || "Errore nel pagamento"}</AlertDialogTitle>
              <AlertDialogDescription>{errorMessage}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowErrorModal(false)}>
                {t("bookingErrorOkButton") || "Ok"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </>
  )
}
