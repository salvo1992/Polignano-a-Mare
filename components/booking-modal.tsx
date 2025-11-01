"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/components/language-provider"
import { createBooking, type BookingPayload } from "@/lib/firebase"

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  bookingData: {
    checkIn: string
    checkOut: string
    guests: number
    nights: number
    roomId: string
    subtotal: number
    touristTax: number
    serviceFee: number
    total: number
  }
}

type PayMethod = "stripe" | "paypal" | "unicredit"

export function BookingModal({ isOpen, onClose, bookingData }: BookingModalProps) {
  const { t } = useLanguage()
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [payMethod, setPayMethod] = useState<PayMethod>("stripe")
  const [isProcessing, setIsProcessing] = useState(false)

  const handleNext = () => {
    if (step === 1) {
      if (!firstName || !lastName || !email) {
        toast.error(t("pleaseEnterGuestInfo") || "Inserisci nome, cognome ed email")
        return
      }
      if (!email.includes("@")) {
        toast.error(t("invalidEmail") || "Email non valida")
        return
      }
      setStep(2)
    }
  }

  const handleBack = () => {
    if (step === 2) {
      setStep(1)
    }
  }

  const handleConfirmBooking = async () => {
    setIsProcessing(true)

    try {
      // Create booking data
      const payload: BookingPayload = {
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        guests: bookingData.guests,
        firstName,
        lastName,
        email,
        phone: "",
        notes: "",
        roomId: bookingData.roomId,
        roomName:
          bookingData.roomId === "1" ? "Camera Familiare con Balcone" : "Camera Matrimoniale con Vasca Idromassaggio",
        pricePerNight: Math.round(bookingData.subtotal / bookingData.nights),
        totalAmount: Math.round(bookingData.total * 100), // Convert to cents
        currency: "EUR",
        status: "pending",
        origin: "site",
      }

      // Create booking in Firebase
      const bookingId = await createBooking(payload)

      // Redirect to checkout page (same as /prenota page)
      const qs = new URLSearchParams({ bookingId, method: payMethod }).toString()
      router.push(`/checkout?${qs}`)

      // Close modal
      onClose()
    } catch (error) {
      console.error("[v0] Booking confirmation error:", error)
      toast.error(error instanceof Error ? error.message : "Errore durante la conferma della prenotazione")
      setIsProcessing(false)
    }
  }

  const formatMoney = (n: number) => `€${Intl.NumberFormat("it-IT", { minimumFractionDigits: 0 }).format(n)}`

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && (t("guestInformation") || "Informazioni Ospite")}
            {step === 2 && (t("bookingPaymentTitle") || "Metodo di Pagamento")}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && (t("enterGuestDetails") || "Inserisci i tuoi dati per continuare con la prenotazione")}
            {step === 2 && (t("selectPaymentMethod") || "Seleziona il metodo di pagamento preferito")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Guest Information */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="modal-firstName">{t("bookingFormFirstName") || "Nome"}</Label>
                <Input
                  id="modal-firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t("enterFirstName") || "Inserisci nome"}
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="modal-lastName">{t("bookingFormLastName") || "Cognome"}</Label>
                <Input
                  id="modal-lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t("enterLastName") || "Inserisci cognome"}
                />
              </div>
              <div>
                <Label htmlFor="modal-email">{t("bookingFormEmail") || "Email"}</Label>
                <Input
                  id="modal-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("enterEmail") || "Inserisci email"}
                />
              </div>
            </div>
          )}

          {/* Step 2: Payment Method */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {/* Stripe */}
                <button
                  type="button"
                  onClick={() => setPayMethod("stripe")}
                  aria-pressed={payMethod === "stripe"}
                  className={[
                    "relative flex flex-col items-center justify-center rounded-lg px-3 py-4 text-xs",
                    "border-2 transition-all duration-200 hover:scale-[1.02]",
                    payMethod === "stripe"
                      ? "border-[#635BFF] bg-white shadow-md shadow-[#635BFF]/20"
                      : "border-gray-200 bg-white hover:border-[#635BFF]/50",
                  ].join(" ")}
                >
                  <svg width="56" height="24" viewBox="0 0 60 25" fill="none">
                    <path
                      d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.9 0 1.85 6.29.97 6.29 5.88z"
                      fill="#635BFF"
                    />
                  </svg>
                  <span className="mt-2 text-[11px] font-medium text-gray-700">Stripe</span>
                </button>

                {/* PayPal */}
                <button
                  type="button"
                  onClick={() => setPayMethod("paypal")}
                  aria-pressed={payMethod === "paypal"}
                  className={[
                    "relative flex flex-col items-center justify-center rounded-lg px-3 py-4 text-xs",
                    "border-2 transition-all duration-200 hover:scale-[1.02]",
                    payMethod === "paypal"
                      ? "border-[#003087] bg-white shadow-md shadow-[#003087]/20"
                      : "border-gray-200 bg-white hover:border-[#003087]/50",
                  ].join(" ")}
                >
                  <svg width="56" height="24" viewBox="0 0 64 26" fill="none">
                    <rect x="0" y="0" width="64" height="26" rx="5" fill="#003087" />
                    <rect x="6" y="5" width="12" height="16" rx="3" fill="#009CDE" />
                    <rect x="12" y="5" width="12" height="16" rx="3" fill="#001C64" />
                  </svg>
                  <span className="mt-2 text-[11px] font-medium text-gray-700">PayPal</span>
                </button>

                {/* UniCredit */}
                <button
                  type="button"
                  onClick={() => setPayMethod("unicredit")}
                  aria-pressed={payMethod === "unicredit"}
                  className={[
                    "relative flex flex-col items-center justify-center rounded-lg px-3 py-4 text-xs",
                    "border-2 transition-all duration-200 hover:scale-[1.02]",
                    payMethod === "unicredit"
                      ? "border-[#E31E24] bg-white shadow-md shadow-[#E31E24]/20"
                      : "border-gray-200 bg-white hover:border-[#E31E24]/50",
                  ].join(" ")}
                >
                  <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                    <rect width="32" height="32" rx="6" fill="#E31E24" />
                    <path d="M16 9v14M9 16h14" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  <span className="mt-2 text-[11px] font-medium text-gray-700">UniCredit</span>
                </button>
              </div>

              {/* Booking Summary */}
              <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-semibold text-sm mb-3">{t("bookingSummary") || "Riepilogo Prenotazione"}</h4>
                <div className="flex justify-between text-sm">
                  <span>{t("subtotal")}</span>
                  <span>{formatMoney(bookingData.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{t("touristTax") || "Tassa di soggiorno"}</span>
                  <span>{formatMoney(bookingData.touristTax)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{t("serviceFee")}</span>
                  <span>{formatMoney(bookingData.serviceFee)}</span>
                </div>
                <div className="pt-2 border-t flex justify-between font-bold">
                  <span>{t("total")}</span>
                  <span className="text-primary">{formatMoney(bookingData.total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-3">
          {step === 2 && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex items-center gap-2 bg-transparent"
              disabled={isProcessing}
            >
              <ChevronLeft className="w-4 h-4" />
              {t("back") || "Indietro"}
            </Button>
          )}
          {step === 1 && (
            <Button onClick={handleNext} className="ml-auto flex items-center gap-2">
              {t("next") || "Avanti"}
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
          {step === 2 && (
            <Button onClick={handleConfirmBooking} className="ml-auto flex items-center gap-2" disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("processing") || "Elaborazione..."}
                </>
              ) : (
                t("confirmBooking") || "Conferma Prenotazione"
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
