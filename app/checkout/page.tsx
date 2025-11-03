"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  getBookingById,
  createStripeCheckout,
  createUserFromBooking,
  linkBookingToUser,
  updateBooking,
} from "@/lib/firebase"
import { Loader2, AlertCircle } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export default function CheckoutPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const search = useSearchParams()
  const bookingId = search.get("bookingId") || ""
  const method = "stripe" // Removed unicredit method support, only stripe now

  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string>("")
  const [successUrl, setSuccessUrl] = useState("")
  const [cancelUrl, setCancelUrl] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSuccessUrl(`${window.location.origin}/checkout/success?bookingId=${bookingId}`)
      setCancelUrl(`${window.location.origin}/prenota?error=payment_failed`)
    }
  }, [bookingId])

  useEffect(() => {
    if (!bookingId) return
    ;(async () => {
      setLoading(true)
      const data = await getBookingById(bookingId)
      setBooking(data)
      setLoading(false)
    })()
  }, [bookingId])

  const totalEUR = useMemo(() => {
    const cents = Number(booking?.totalAmount || 0)
    return (cents / 100).toFixed(2)
  }, [booking])

  const handlePay = async () => {
    if (!bookingId || !booking || !successUrl || !cancelUrl) return
    setPaying(true)
    setError("")
    try {
      console.log("[v0] Checking if user exists for email:", booking.email)
      const userResult = await createUserFromBooking(booking.email, booking.firstName, booking.lastName)

      if (userResult.success && userResult.password) {
        console.log("[v0] New user created, saving password to booking")
        await updateBooking(bookingId, {
          newUserPassword: userResult.password,
        })

        await linkBookingToUser(bookingId, booking.email)
        console.log("[v0] Booking linked to user")
      } else if (userResult.success) {
        console.log("[v0] User already exists, linking booking")
        await linkBookingToUser(bookingId, booking.email)
      } else {
        console.error("[v0] Failed to create user:", userResult.error)
      }

      const res = await createStripeCheckout({
        bookingId,
        amount: booking.totalAmount,
        currency: booking.currency || "EUR",
        successUrl,
        cancelUrl,
        customerEmail: booking.email,
        metadata: { source: "site" },
      })
      window.location.href = res.url
    } catch (e: any) {
      console.error(e)
      if (e.message?.includes("Invalid API Key") || e.message?.includes("authentication")) {
        setError("Errore di configurazione del pagamento. Contatta l'amministratore del sito.")
      } else {
        setError("Si è verificato un errore durante l'elaborazione del pagamento. Riprova più tardi.")
      }
      setPaying(false)
    }
  }

  return (
    <main className="min-h-screen">
      <Header />

      <div className="container mx-auto px-4 pt-24 pb-16">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>{t("bookingSummary")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="animate-spin h-4 w-4" /> {t("loading")}
              </div>
            ) : !booking ? (
              <div className="text-sm text-muted-foreground">{t("bookingNotFound")}</div>
            ) : (
              <div className="space-y-3">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">{t("name")}</div>
                    <div className="font-medium">
                      {booking.firstName} {booking.lastName}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t("email")}</div>
                    <div className="font-medium">{booking.email}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t("checkIn")}</div>
                    <div className="font-medium">{booking.checkIn}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t("checkOut")}</div>
                    <div className="font-medium">{booking.checkOut}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t("guests")}</div>
                    <div className="font-medium">{booking.guests}</div>
                  </div>
                </div>

                {booking.notes && (
                  <div>
                    <div className="text-xs text-muted-foreground">{t("requests")}</div>
                    <div className="text-sm">{booking.notes}</div>
                  </div>
                )}

                <div className="flex items-center justify-between bg-muted/40 rounded-lg px-4 py-3">
                  <div className="text-sm text-muted-foreground">{t("total")}</div>
                  <div className="text-xl font-semibold">€{totalEUR}</div>
                </div>

                <div className="pt-2">
                  <Button onClick={handlePay} disabled={paying} className="w-full py-6 text-lg">
                    {paying ? t("redirecting") : t("payNow")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Footer />
    </main>
  )
}
