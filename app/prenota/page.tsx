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
import { Calendar, Users, MapPin, Clock, AlertCircle } from "lucide-react"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import { createBooking, type BookingPayload, getAllRooms } from "@/lib/firebase"
import { useLanguage } from "@/components/language-provider"
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

const ROOM_IDS: Record<string, string> = {
  deluxe: "1", // Camera Familiare con Balcone
  suite: "2", // Camera Matrimoniale con Vasca Idromassaggio
}

const ROOM_NAMES: Record<string, string> = {
  deluxe: "Camera Familiare con Balcone",
  suite: "Camera Matrimoniale con Vasca Idromassaggio",
}

type PayMethod = "stripe" | "unicredit"

export default function BookingPage() {
  const router = useRouter()
  const search = useSearchParams()
  const { t } = useLanguage()
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation()

  const [roomPrices, setRoomPrices] = useState<Record<string, number>>({
    deluxe: 120,
    suite: 180,
  })

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
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
  const [errorMessage, setErrorMessage] = useState("")
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [availabilityStatus, setAvailabilityStatus] = useState<{
    available: boolean
    message: string
  } | null>(null)

  const hasError = search.get("error") === "payment_failed"

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const rooms = await getAllRooms()
        const prices: Record<string, number> = {}
        rooms.forEach((room) => {
          if (room.id === "1") prices.deluxe = room.price
          if (room.id === "2") prices.suite = room.price
        })
        setRoomPrices(prices)
      } catch (error) {
        console.error("[v0] Error fetching room prices:", error)
      }
    }
    fetchPrices()
  }, [])

  useEffect(() => {
    if (hasError) {
      setErrorMessage(t("paymentProblem"))
      setShowErrorModal(true)
    }
  }, [hasError, t])

  useEffect(() => {
    const checkAvailability = async () => {
      if (formData.checkIn && formData.checkOut && formData.roomType) {
        setIsCheckingAvailability(true)
        try {
          const roomId = ROOM_IDS[formData.roomType]
          const isAvailable = await checkRoomAvailability(roomId, formData.checkIn, formData.checkOut)

          if (isAvailable) {
            setAvailabilityStatus({
              available: true,
              message: t("roomAvailable"),
            })
          } else {
            setAvailabilityStatus({
              available: false,
              message: t("roomNotAvailable"),
            })
          }
        } catch (error) {
          console.error("[v0] Error checking availability:", error)
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

  const nights = useMemo(() => {
    const ci = formData.checkIn ? new Date(formData.checkIn) : null
    const co = formData.checkOut ? new Date(formData.checkOut) : null
    if (!ci || !co || isNaN(ci.getTime()) || isNaN(co.getTime())) return 0
    const diff = Math.ceil((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  }, [formData.checkIn, formData.checkOut])

  const basePrice = roomPrices[formData.roomType] ?? 0
  const extraGuests = Math.max(0, Number(formData.guests || "1") - 2)
  const extraFeePerNight = extraGuests * 20
  const total = nights * (basePrice + extraFeePerNight)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.checkIn || !formData.checkOut) {
      setErrorMessage(t("pleaseSelectDates"))
      setShowErrorModal(true)
      return
    }

    const checkInDate = new Date(formData.checkIn)
    const checkOutDate = new Date(formData.checkOut)

    if (checkOutDate <= checkInDate) {
      setErrorMessage("La data di check-out deve essere successiva alla data di check-in")
      setShowErrorModal(true)
      return
    }

    if (!availabilityStatus?.available) {
      setErrorMessage(t("roomNotAvailableError"))
      setShowErrorModal(true)
      return
    }

    const payload: BookingPayload = {
      checkIn: formData.checkIn,
      checkOut: formData.checkOut,
      guests: Number(formData.guests || "1"),
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
      console.log("[v0] Creating booking with payload:", payload)
      const bookingId = await createBooking(payload)
      const qs = new URLSearchParams({ bookingId, method: payMethod }).toString()
      router.push(`/checkout?${qs}`)
    } catch (err) {
      console.error("[v0] Create booking error:", err)
      setErrorMessage(err instanceof Error ? err.message : t("bookingError"))
      setShowErrorModal(true)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <main className="min-h-screen">
      <Header />

      <div className="pt-20 pb-16">
        <div className="container mx-auto px-4">
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

          <div className="mx-auto max-w-5xl grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
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

          <Card className="card-semi-transparent bg-[#f5e6d3]/30 max-w-5xl mx-auto mb-14">
            <CardHeader>
              <CardTitle className="text-2xl font-cinzel text-primary">{t("bookingDetails")}</CardTitle>
              <CardDescription>{t("fillFormToBook")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="mb-2 block">
                      {t("firstName") || "Nome"}
                    </Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="mb-2 block">
                      {t("lastName") || "Cognome"}
                    </Label>
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
                  <div>
                    <Label htmlFor="phone" className="mb-2 block">
                      {t("phoneNumber")}
                    </Label>
                    <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} />
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
                        ? `${t("baseRate")} €${roomPrices[formData.roomType]}/${t("night")}`
                        : t("selectRoomToSeePrice")}
                    </div>
                  </div>
                </div>

                {isCheckingAvailability && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t("checkingAvailability")}</AlertTitle>
                    <AlertDescription>{t("pleaseWait")}</AlertDescription>
                  </Alert>
                )}

                {availabilityStatus && !isCheckingAvailability && (
                  <Alert variant={availabilityStatus.available ? "default" : "destructive"}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{availabilityStatus.available ? t("roomAvailable") : t("roomNotAvailable")}</AlertTitle>
                    <AlertDescription>
                      {availabilityStatus.available ? t("roomAvailableDesc") : t("roomNotAvailableDesc")}
                    </AlertDescription>
                  </Alert>
                )}

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

                <div className="border rounded-lg p-4 bg-background/50">
                  <p className="font-medium mb-3">{t("bookingPaymentMethod")}</p>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPayMethod("stripe")}
                      aria-pressed={payMethod === "stripe"}
                      aria-label="Paga con Stripe"
                      className={[
                        "relative flex flex-col items-center justify-center rounded-lg px-4 py-4 transition-all duration-200",
                        "border-2 hover:scale-[1.02] active:scale-[0.98]",
                        payMethod === "stripe"
                          ? "border-[#635BFF] bg-[#635BFF] shadow-lg shadow-[#635BFF]/20"
                          : "border-gray-200 bg-white hover:border-[#635BFF]/50 hover:shadow-md",
                      ].join(" ")}
                    >
                      <svg
                        width="70"
                        height="30"
                        viewBox="0 0 60 25"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        role="img"
                        aria-hidden="true"
                      >
                        <path
                          d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.9 0 1.85 6.29.97 6.29 5.88z"
                          fill={payMethod === "stripe" ? "#FFFFFF" : "#635BFF"}
                        />
                      </svg>
                      <span className={`text-xs mt-2 ${payMethod === "stripe" ? "text-white" : "text-gray-600"}`}>
                        Carte, Klarna, PayPal, Apple Pay...
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPayMethod("unicredit")}
                      aria-pressed={payMethod === "unicredit"}
                      aria-label="Paga con UniCredit"
                      className={[
                        "relative flex flex-col items-center justify-center rounded-lg px-4 py-4 transition-all duration-200",
                        "border-2 hover:scale-[1.02] active:scale-[0.98]",
                        payMethod === "unicredit"
                          ? "border-[#E31E24] bg-[#E31E24] shadow-lg shadow-[#E31E24]/20"
                          : "border-gray-200 bg-white hover:border-[#E31E24]/50 hover:shadow-md",
                      ].join(" ")}
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 32 32"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        role="img"
                        aria-hidden="true"
                      >
                        <rect width="32" height="32" rx="4" fill={payMethod === "unicredit" ? "#FFFFFF" : "#E31E24"} />
                        <path
                          d="M16 8v16M8 16h16"
                          stroke={payMethod === "unicredit" ? "#E31E24" : "#FFFFFF"}
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span
                        className={`text-sm font-bold mt-2 ${payMethod === "unicredit" ? "text-white" : "text-[#E31E24]"}`}
                      >
                        UniCredit
                      </span>
                    </button>
                  </div>
                  {/* </CHANGE> */}
                </div>

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

                <Button
                  type="submit"
                  className="w-full text-lg py-6"
                  disabled={!availabilityStatus?.available || isCheckingAvailability}
                >
                  {t("confirmBooking")}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-cinzel font-bold text-roman-gradient mb-2">{t("ourRooms")}</h2>
            <p className="text-sm text-muted-foreground">{t("discoverWhereYouStay")}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 max-w-5xl mx-auto">
            <Card className="overflow-hidden">
              <div className="relative h-56">
                <Image src="/images/room-1.jpg" alt={t("deluxeRoomWithView")} fill className="object-cover" />
              </div>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{t("deluxeRoom")}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {t("from")} €{roomPrices.deluxe}/{t("night")}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setFormData((s) => ({ ...s, roomType: "deluxe" }))}>
                    {t("selectButton")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <div className="relative h-56">
                <Image src="/images/room-2.jpg" alt={t("panoramicSuiteWithTerrace")} fill className="object-cover" />
              </div>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{t("panoramicSuite")}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {t("from")} €{roomPrices.suite}/{t("night")}
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

      <AlertDialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("paymentError")}</AlertDialogTitle>
            <AlertDialogDescription>{errorMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowErrorModal(false)}>{t("okButton")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}







