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

type PayMethod = "stripe" | "paypal" | "satispay" | "unicredit"

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

    if (!availabilityStatus?.available) {
      setErrorMessage(t("roomNotAvailableError"))
      setShowErrorModal(true)
      return
    }

    const payload: BookingPayload = {
      checkIn: formData.checkIn,
      checkOut: formData.checkOut,
      guests: Number(formData.guests || "1"),
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      notes: formData.specialRequests,
      totalAmount: Math.round(total * 100),
      currency: "EUR",
      status: "pending",
      source: "site",
      roomId: ROOM_IDS[formData.roomType],
      roomName: ROOM_NAMES[formData.roomType],
    }

    try {
      const bookingId = await createBooking(payload)
      const qs = new URLSearchParams({ bookingId, method: payMethod }).toString()
      router.push(`/checkout?${qs}`)
    } catch (err) {
      console.error("[v0] Create booking error:", err)
      setErrorMessage(t("bookingError"))
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

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setPayMethod("stripe")}
                      aria-pressed={payMethod === "stripe"}
                      aria-label="Paga con Stripe"
                      className={[
                        "relative flex items-center justify-center rounded-lg px-4 py-3 transition-all duration-200",
                        "border-2 hover:scale-[1.02] active:scale-[0.98]",
                        payMethod === "stripe"
                          ? "border-[#635BFF] bg-[#635BFF] shadow-lg shadow-[#635BFF]/20"
                          : "border-gray-200 bg-white hover:border-[#635BFF]/50 hover:shadow-md",
                      ].join(" ")}
                    >
                      <svg
                        width="56"
                        height="24"
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
                    </button>

                    <button
                      type="button"
                      onClick={() => setPayMethod("paypal")}
                      aria-pressed={payMethod === "paypal"}
                      aria-label="Paga con PayPal"
                      className={[
                        "relative flex items-center justify-center rounded-lg px-3 py-3 transition-all duration-200",
                        "border-2 hover:scale-[1.02] active:scale-[0.98]",
                        payMethod === "paypal"
                          ? "border-[#0070BA] bg-[#0070BA] shadow-lg shadow-[#0070BA]/20"
                          : "border-gray-200 bg-white hover:border-[#0070BA]/50 hover:shadow-md",
                      ].join(" ")}
                    >
                      <svg
                        width="64"
                        height="24"
                        viewBox="0 0 124 33"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        role="img"
                        aria-hidden="true"
                      >
                        <path
                          d="M46.211 6.749h-6.839a.95.95 0 0 0-.939.802l-2.766 17.537a.57.57 0 0 0 .564.658h3.265a.95.95 0 0 0 .939-.803l.746-4.73a.95.95 0 0 1 .938-.803h2.165c4.505 0 7.105-2.18 7.784-6.5.306-1.89.013-3.375-.872-4.415-.972-1.142-2.696-1.746-4.985-1.746zM47 13.154c-.374 2.454-2.249 2.454-4.062 2.454h-1.032l.724-4.583a.57.57 0 0 1 .563-.481h.473c1.235 0 2.4 0 3.002.704.359.42.469 1.044.332 1.906zM66.654 13.075h-3.275a.57.57 0 0 0-.563.481l-.145.916-.229-.332c-.709-1.029-2.29-1.373-3.868-1.373-3.619 0-6.71 2.741-7.312 6.586-.313 1.918.132 3.752 1.22 5.031.998 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .562.66h2.95a.95.95 0 0 0 .939-.803l1.77-11.209a.568.568 0 0 0-.561-.658zm-4.565 6.374c-.316 1.871-1.801 3.127-3.695 3.127-.951 0-1.711-.305-2.199-.883-.484-.574-.668-1.391-.514-2.301.295-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.499.589.697 1.411.554 2.317zM84.096 13.075h-3.291a.954.954 0 0 0-.787.417l-4.539 6.686-1.924-6.425a.953.953 0 0 0-.912-.678h-3.234a.57.57 0 0 0-.541.754l3.625 10.638-3.408 4.811a.57.57 0 0 0 .465.9h3.287a.949.949 0 0 0 .781-.408l10.946-15.8a.57.57 0 0 0-.468-.895z"
                          fill={payMethod === "paypal" ? "#FFFFFF" : "#009CDE"}
                        />
                        <path
                          d="M94.992 6.749h-6.84a.95.95 0 0 0-.938.802l-2.766 17.537a.569.569 0 0 0 .562.658h3.51a.665.665 0 0 0 .656-.562l.785-4.971a.95.95 0 0 1 .938-.803h2.164c4.506 0 7.105-2.18 7.785-6.5.307-1.89.012-3.375-.873-4.415-.971-1.142-2.694-1.746-4.983-1.746zm.789 6.405c-.373 2.454-2.248 2.454-4.062 2.454h-1.031l.725-4.583a.568.568 0 0 1 .562-.481h.473c1.234 0 2.4 0 3.002.704.359.42.468 1.044.331 1.906zM115.434 13.075h-3.273a.567.567 0 0 0-.562.481l-.145.916-.23-.332c-.709-1.029-2.289-1.373-3.867-1.373-3.619 0-6.709 2.741-7.311 6.586-.312 1.918.131 3.752 1.219 5.031 1 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .564.66h2.949a.95.95 0 0 0 .938-.803l1.771-11.209a.571.571 0 0 0-.565-.658zm-4.565 6.374c-.314 1.871-1.801 3.127-3.695 3.127-.949 0-1.711-.305-2.199-.883-.484-.574-.666-1.391-.514-2.301.297-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.501.589.699 1.411.554 2.317zM119.295 7.23l-2.807 17.858a.569.569 0 0 0 .562.658h2.822c.469 0 .867-.34.939-.803l2.768-17.536a.57.57 0 0 0-.562-.659h-3.16a.571.571 0 0 0-.562.482z"
                          fill={payMethod === "paypal" ? "#FFFFFF" : "#003087"}
                        />
                        <path
                          d="M7.266 29.154l.523-3.322-1.165-.027H1.061L4.927 1.292a.316.316 0 0 1 .314-.268h9.38c3.114 0 5.263.648 6.385 1.927.526.6.861 1.227 1.023 1.917.17.724.173 1.589.007 2.644l-.012.077v.676l.526.298a3.69 3.69 0 0 1 1.065.812c.45.513.741 1.165.864 1.938.127.795.085 1.741-.123 2.812-.24 1.232-.628 2.305-1.152 3.183a6.547 6.547 0 0 1-1.825 2c-.696.494-1.523.869-2.458 1.109-.906.236-1.939.355-3.072.355h-.73c-.522 0-1.029.188-1.427.525a2.21 2.21 0 0 0-.744 1.328l-.055.299-.924 5.855-.042.215c-.011.068-.03.102-.058.125a.155.155 0 0 1-.096.035H7.266z"
                          fill={payMethod === "paypal" ? "#FFFFFF" : "#003087"}
                        />
                        <path
                          d="M23.048 7.667c-.028.179-.06.362-.096.55-1.237 6.351-5.469 8.545-10.874 8.545H9.326c-.661 0-1.218.48-1.321 1.132L6.596 26.83l-.399 2.533a.704.704 0 0 0 .695.814h4.881c.578 0 1.069-.42 1.16-.99l.048-.248.919-5.832.059-.32c.09-.572.582-.992 1.16-.992h.73c4.729 0 8.431-1.92 9.513-7.476.452-2.321.218-4.259-.978-5.622a4.667 4.667 0 0 0-1.336-1.03z"
                          fill={payMethod === "paypal" ? "#FFFFFF" : "#009CDE"}
                        />
                        <path
                          d="M21.754 7.151a9.757 9.757 0 0 0-1.203-.267 15.284 15.284 0 0 0-2.426-.177h-7.352a1.172 1.172 0 0 0-1.159.992L8.05 17.605l-.045.289a1.336 1.336 0 0 1 1.321-1.132h2.752c5.405 0 9.637-2.195 10.874-8.545.037-.188.068-.371.096-.55a6.594 6.594 0 0 0-.277-.087z"
                          fill={payMethod === "paypal" ? "#FFFFFF" : "#012169"}
                        />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPayMethod("satispay")}
                      aria-pressed={payMethod === "satispay"}
                      aria-label="Paga con Satispay"
                      className={[
                        "relative flex items-center justify-center gap-2 rounded-lg px-4 py-3 transition-all duration-200",
                        "border-2 hover:scale-[1.02] active:scale-[0.98]",
                        payMethod === "satispay"
                          ? "border-[#FF2D2E] bg-[#FF2D2E] shadow-lg shadow-[#FF2D2E]/20"
                          : "border-gray-200 bg-white hover:border-[#FF2D2E]/50 hover:shadow-md",
                      ].join(" ")}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        role="img"
                        aria-hidden="true"
                      >
                        <path
                          d="M12 2L16.5 8.5L23 12L16.5 15.5L12 22L7.5 15.5L1 12L7.5 8.5L12 2Z"
                          fill={payMethod === "satispay" ? "#FFFFFF" : "#FF2D2E"}
                        />
                      </svg>
                      <span
                        className={`text-sm font-bold ${payMethod === "satispay" ? "text-white" : "text-[#FF2D2E]"}`}
                      >
                        Satispay
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPayMethod("unicredit")}
                      aria-pressed={payMethod === "unicredit"}
                      aria-label="Paga con UniCredit"
                      className={[
                        "relative flex items-center justify-center gap-1.5 rounded-lg px-3 py-3 transition-all duration-200",
                        "border-2 hover:scale-[1.02] active:scale-[0.98]",
                        payMethod === "unicredit"
                          ? "border-[#E31E24] bg-[#E31E24] shadow-lg shadow-[#E31E24]/20"
                          : "border-gray-200 bg-white hover:border-[#E31E24]/50 hover:shadow-md",
                      ].join(" ")}
                    >
                      <svg
                        width="18"
                        height="18"
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
                        className={`text-xs font-bold ${payMethod === "unicredit" ? "text-white" : "text-[#E31E24]"}`}
                      >
                        UniCredit
                      </span>
                    </button>
                  </div>
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





