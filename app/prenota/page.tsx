"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Users, MapPin, Clock } from "lucide-react"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import { createBooking, type BookingPayload } from "@/lib/firebase"
import { useLanguage } from "@/components/language-provider"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

/* =========================
   PREZZI BASE PER NOTTE
   ========================= */
const ROOM_PRICES: Record<string, number> = {
  deluxe: 120,
  suite: 180,
}

type PayMethod = "stripe" | "paypal" | "satispay"

export default function BookingPage() {
  const router = useRouter()
  const search = useSearchParams()
  const { t } = useLanguage()
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation()

  /* -------------------------
     FORM STATE
     ------------------------- */
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    checkIn: "",
    checkOut: "",
    guests: "2",
    roomType: "",
    specialRequests: "",
  })

  const [payMethod, setPayMethod] = useState<PayMethod>("stripe")
  const [showErrorModal, setShowErrorModal] = useState(false)
  const hasError = search.get("error") === "payment_failed"

  useEffect(() => {
    if (hasError) setShowErrorModal(true)
  }, [hasError])

  /* -------------------------
     Notti & Totale
     ------------------------- */
  const nights = useMemo(() => {
    const ci = formData.checkIn ? new Date(formData.checkIn) : null
    const co = formData.checkOut ? new Date(formData.checkOut) : null
    if (!ci || !co || isNaN(ci.getTime()) || isNaN(co.getTime())) return 0
    const diff = Math.ceil((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  }, [formData.checkIn, formData.checkOut])

  const basePrice = ROOM_PRICES[formData.roomType] ?? 0
  const extraGuests = Math.max(0, Number(formData.guests || "1") - 2)
  const extraFeePerNight = extraGuests * 20 // €20/notte per ospite extra
  const total = nights * (basePrice + extraFeePerNight)

  /* -------------------------
     Submit
     ------------------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload: BookingPayload = {
      checkIn: formData.checkIn,
      checkOut: formData.checkOut,
      guests: Number(formData.guests || "1"),
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      notes: formData.specialRequests,
      totalAmount: Math.round(total * 100), // cents
      currency: "EUR",
      status: "pending",
      source: "site",
    }

    try {
      const bookingId = await createBooking(payload)
      const qs = new URLSearchParams({ bookingId, method: payMethod }).toString()
      router.push(`/checkout?${qs}`)
    } catch (err) {
      console.error("Create booking error:", err)
      setShowErrorModal(true)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  /* -------------------------
     UI
     ------------------------- */
  return (
    <main className="min-h-screen">
      <Header />

      <div className="pt-20 pb-16">
        <div className="container mx-auto px-4">
          {/* HERO */}
          <div
            ref={heroRef}
            className={`text-center mb-10 transition-all duration-1000 ${
              heroVisible ? "animate-fade-in-up opacity-100" : "opacity-0 translate-y-[50px]"
            }`}
          >
            <h1 className="text-4xl md:text-6xl font-cinzel font-bold text-roman-gradient mb-4 animate-text-shimmer">
              {t("bookYourStay")}
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t("unforgettableExperience")} {t("polignanoAMare")}
            </p>
          </div>

          {/* TRE CARD INFO (responsive, centrate) */}
          <div className="mx-auto max-w-5xl grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
            {/* Check-in / out */}
            <Card className="h-full">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-cinzel font-semibold text-primary mb-2">{t("checkInCheckOut")}</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="font-medium">{t("checkInTime")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="font-medium">{t("checkOutTime")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">{t("maxGuests")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Come raggiungerci */}
            <Card className="h-full">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-cinzel font-semibold text-primary mb-2">{t("howToReachUs")}</h3>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>{t("historicCenter")}</p>
                      <p>
                        <strong className="text-foreground">{t("bariAirport")}</strong> 40 {t("minutes")}
                      </p>
                      <p>
                        <strong className="text-foreground">{t("trainStation")}</strong> 5 {t("walkingMinutes")}
                      </p>
                      <p>
                        <strong className="text-foreground">{t("lamaMonachile")}</strong> 2 {t("walkingMinutes")}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Prezzo stimato */}
            <Card className="h-full">
              <CardContent className="p-5">
                <h3 className="font-cinzel font-semibold text-primary mb-2">{t("estimatedPrice")}</h3>
                <p className="text-sm text-muted-foreground mb-1">
                  {nights > 0
                    ? `${nights} ${nights > 1 ? t("nights") : t("night")} • ${formData.guests} ${t("guests")}`
                    : t("insertDatesGuests")}
                </p>
                <div className="text-3xl font-bold">€{isFinite(total) ? total.toFixed(2) : "0.00"}</div>
                <p className="text-xs text-muted-foreground mt-2">{t("taxesIncluded")}</p>
              </CardContent>
            </Card>
          </div>

          {/* DETTAGLI PRENOTAZIONE */}
          <Card className="card-semi-transparent bg-[#f5e6d3]/30 max-w-5xl mx-auto mb-14">
            <CardHeader>
              <CardTitle className="text-2xl font-cinzel text-primary">{t("bookingDetails")}</CardTitle>
              <CardDescription>{t("fillFormToBook")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="mb-2 block">
                      {t("fullName")}
                    </Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
                  </div>
                  <div>
                    <Label htmlFor="email" className="mb-2 block">
                      {t("email")}
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone" className="mb-2 block">
                      {t("phoneNumber")}
                    </Label>
                    <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} />
                  </div>
                  <div>
                    <Label htmlFor="guests" className="mb-2 block">
                      {t("numberOfGuestsLabel")}
                    </Label>
                    <select
                      id="guests"
                      name="guests"
                      value={formData.guests}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    >
                      <option value="1">{t("oneGuest")}</option>
                      <option value="2">{t("twoGuests")}</option>
                      <option value="3">{t("threeGuests")}</option>
                      <option value="4">{t("fourGuests")}</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="checkIn" className="mb-2 block">
                      {t("checkInDate")}
                    </Label>
                    <Input
                      id="checkIn"
                      name="checkIn"
                      type="date"
                      value={formData.checkIn}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkOut" className="mb-2 block">
                      {t("checkOutDate")}
                    </Label>
                    <Input
                      id="checkOut"
                      name="checkOut"
                      type="date"
                      value={formData.checkOut}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="roomType" className="mb-2 block">
                      {t("roomType")}
                    </Label>
                    <select
                      id="roomType"
                      name="roomType"
                      value={formData.roomType}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      required
                    >
                      <option value="">{t("selectRoom")}</option>
                      <option value="deluxe">{t("deluxeRoom")}</option>
                      <option value="suite">{t("panoramicSuite")}</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <div className="w-full text-right text-sm text-muted-foreground">
                      {formData.roomType
                        ? `${t("baseRate")} €${ROOM_PRICES[formData.roomType]}/${t("night")}`
                        : t("selectRoomToSeePrice")}
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="specialRequests" className="mb-2 block">
                    {t("specialRequests")}
                  </Label>
                  <Textarea
                    id="specialRequests"
                    name="specialRequests"
                    value={formData.specialRequests}
                    onChange={handleInputChange}
                    placeholder={t("specialRequestsPlaceholder")}
                    rows={3}
                  />
                </div>

                {/* Metodi di pagamento (brand ufficiali) */}
                <div className="border rounded-lg p-4 bg-background/50">
                  <p className="font-medium mb-3">{t("bookingPaymentMethod")}</p>

                  <div className="grid sm:grid-cols-3 gap-3">
                    {/* STRIPE */}
                    <button
                      type="button"
                      onClick={() => setPayMethod("stripe")}
                      aria-pressed={payMethod === "stripe"}
                      aria-label="Paga con Stripe"
                      className={[
                        "flex items-center justify-center gap-2 rounded-md px-3 py-3 transition-all",
                        payMethod === "stripe"
                          ? "bg-[#635BFF] text-white ring-2 ring-[#635BFF]/30"
                          : "border border-[#635BFF]/40 text-[#635BFF] hover:bg-[#635BFF]/10",
                      ].join(" ")}
                    >
                      <svg
                        width="84"
                        height="24"
                        viewBox="0 0 88 24"
                        role="img"
                        aria-hidden="true"
                        fill={payMethod === "stripe" ? "#FFFFFF" : "#635BFF"}
                      >
                        <path d="M7.7 10.3c0-1.6 1.3-2.3 3.6-2.6l3.2-.4V5.7c0-1.7-1-2.7-3-2.7-1.8 0-3 .8-3.5 2.4l-3.3-1C5.5 1.7 8 0 11.5 0c4.1 0 6.5 2 6.5 5.6v12.4h-3.5l-.3-1.6c-.9 1.2-2.4 1.9-4.2 1.9-3 0-5.2-1.8-5.2-4.7 0-2.7 1.7-4.2 5-4.6l3.7-.5v-.4c0-1.3-.8-2-2.3-2-1.4 0-2.2.6-2.6 1.9l-3.1-.7z" />
                        <path d="M27.4 3.2h3.6v15h-3.6zM29.2 0c1.2 0 2 .8 2 2s-.8 2-2 2-2-.8-2-2 .8-2 2-2z" />
                        <path d="M45.3 7.8c-2.4 0-3.9 1.1-4.7 2V3.2h-3.6v12.1h3.6V11c0-2.8-1.6-3.2-4.7-3.2z" />
                        <path d="M62.9 8.1c-1-1.5-2.7-2.3-4.8-2.3-3.7 0-6.2 2.7-6.2 6.3s2.5 6.3 6.2 6.3c2.1 0 3.8-.8 4.8-2.3v1.8h3.6V3.2h-3.6v4.9zm-4.2 7.1c-1.9 0-3.2-1.4-3.2-3.1s1.3-3.1 3.2-3.1 3.2 1.4 3.2 3.1-1.3 3.1-3.2 3.1z" />
                      </svg>
                    </button>

                    {/* PAYPAL */}
                    <button
                      type="button"
                      onClick={() => setPayMethod("paypal")}
                      aria-pressed={payMethod === "paypal"}
                      aria-label="Paga con PayPal"
                      className={[
                        "flex items-center justify-center gap-2 rounded-md px-3 py-3 transition-all",
                        payMethod === "paypal"
                          ? "bg-[#003087] text-white ring-2 ring-[#003087]/30"
                          : "border border-[#003087]/40 text-[#003087] hover:bg-[#003087]/10",
                      ].join(" ")}
                    >
                      <svg width="112" height="26" viewBox="0 0 256 64" role="img" aria-hidden="true">
                        <path fill="#009CDE" d="M78 10h22a10 10 0 010 20h-17l-4 20H62L70 10h8z" />
                        <path
                          fill={payMethod === "paypal" ? "#FFFFFF" : "#003087"}
                          d="M120 10h20a10 10 0 010 20h-15l-4 20h-16l8-40h7z"
                        />
                        <text
                          x="152"
                          y="34"
                          fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Arial"
                          fontWeight="700"
                          fontSize="26"
                          fill={payMethod === "paypal" ? "#FFFFFF" : "#003087"}
                        >
                          PayPal
                        </text>
                      </svg>
                    </button>

                    {/* SATISPAY */}
                    <button
                      type="button"
                      onClick={() => setPayMethod("satispay")}
                      aria-pressed={payMethod === "satispay"}
                      aria-label="Paga con Satispay"
                      className={[
                        "flex items-center justify-center gap-2 rounded-md px-3 py-3 transition-all",
                        payMethod === "satispay"
                          ? "bg-[#FF2D2E] text-white ring-2 ring-[#FF2D2E]/30"
                          : "border border-[#FF2D2E]/40 text-[#FF2D2E] hover:bg-[#FF2D2E]/10",
                      ].join(" ")}
                    >
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        role="img"
                        aria-hidden="true"
                        fill={payMethod === "satispay" ? "#FFFFFF" : "#FF2D2E"}
                      >
                        <path d="M12 2l4 6 6 4-6 4-4 6-4-6-6-4 6-4 4-6z" />
                      </svg>
                      <span className="font-semibold">Satispay</span>
                    </button>
                  </div>
                </div>

                {/* Totale visibile */}
                <div className="flex items-center justify-between bg-muted/40 rounded-lg px-4 py-3">
                  <div className="text-sm text-muted-foreground">
                    {nights > 0
                      ? `${nights} ${nights > 1 ? t("nights") : t("night")} • ${formData.guests} ${t("guests")}`
                      : t("completeDatesRoom")}
                  </div>
                  <div className="text-xl font-semibold">
                    {t("total")}: €{isFinite(total) ? total.toFixed(2) : "0.00"}
                  </div>
                </div>

                <Button type="submit" className="w-full text-lg py-6">
                  {t("confirmBooking")}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* SEZIONE CAMERE (solo 2, nessun carosello) */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-cinzel font-bold text-roman-gradient mb-2">{t("ourRooms")}</h2>
            <p className="text-sm text-muted-foreground">{t("discoverWhereYouStay")}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 max-w-5xl mx-auto">
            {/* Camera Deluxe */}
            <Card className="overflow-hidden">
              <div className="relative h-56">
                <Image src="/images/room-1.jpg" alt={t("deluxeRoomWithView")} fill className="object-cover" />
              </div>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{t("deluxeRoom")}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {t("from")} €{ROOM_PRICES.deluxe}/{t("night")}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setFormData((s) => ({ ...s, roomType: "deluxe" }))}>
                    {t("selectButton")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Suite Panoramica */}
            <Card className="overflow-hidden">
              <div className="relative h-56">
                <Image src="/images/room-2.jpg" alt={t("panoramicSuiteWithTerrace")} fill className="object-cover" />
              </div>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{t("panoramicSuite")}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {t("from")} €{ROOM_PRICES.suite}/{t("night")}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setFormData((s) => ({ ...s, roomType: "suite" }))}>
                    {t("selectButton")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />

      {/* Modale errore pagamento */}
      <AlertDialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("paymentError")}</AlertDialogTitle>
            <AlertDialogDescription>{t("paymentProblem")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowErrorModal(false)}>{t("okButton")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}

