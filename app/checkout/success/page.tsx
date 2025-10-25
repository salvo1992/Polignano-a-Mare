"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"
import { getBookingById, loginWithEmail } from "@/lib/firebase"
import { Loader2, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/components/auth-provider"

export default function CheckoutSuccess() {
  const { t } = useLanguage()
  const router = useRouter()
  const search = useSearchParams()
  const { user } = useAuth()
  const bookingId = search.get("bookingId") || ""

  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState<any>(null)
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false)

  useEffect(() => {
    if (!bookingId) {
      setLoading(false)
      return
    }

    const loadBookingAndAutoLogin = async () => {
      try {
        // Get booking data
        const bookingData = await getBookingById(bookingId)
        setBooking(bookingData)

        // If user is not logged in and booking has a new password, auto-login
        if (!user && bookingData?.newUserPassword && !autoLoginAttempted) {
          setAutoLoginAttempted(true)
          try {
            await loginWithEmail(bookingData.email, bookingData.newUserPassword)
            console.log("[v0] Auto-login successful")
            // Redirect to user page after 2 seconds
            setTimeout(() => {
              router.push(`/user?highlight=${bookingId}`)
            }, 2000)
          } catch (error) {
            console.error("[v0] Auto-login failed:", error)
          }
        } else if (user) {
          // User is already logged in, redirect after 2 seconds
          setTimeout(() => {
            router.push(`/user?highlight=${bookingId}`)
          }, 2000)
        }
      } catch (error) {
        console.error("[v0] Error loading booking:", error)
      } finally {
        setLoading(false)
      }
    }

    loadBookingAndAutoLogin()
  }, [bookingId, user, autoLoginAttempted, router])

  if (loading) {
    return (
      <main className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 pt-24 pb-16 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">{t("loading")}</p>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 pt-24 pb-16">
        <Card className="max-w-xl mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-cinzel text-primary">{t("paymentSuccessful")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">{t("thankYouBookingConfirmed")}</p>

            {booking && (
              <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground">{t("bookingId")}</div>
                  <div className="font-mono text-sm font-medium">{bookingId}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t("room")}</div>
                  <div className="text-sm font-medium">{booking.roomName}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">{t("checkIn")}</div>
                    <div className="text-sm font-medium">{booking.checkIn}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t("checkOut")}</div>
                    <div className="text-sm font-medium">{booking.checkOut}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-950">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                📧 {t("confirmationEmailSent")} <strong>{booking?.email}</strong>
              </p>
              {booking?.newUserPassword && (
                <p className="text-sm text-blue-900 dark:text-blue-100 mt-2">🔐 {t("accountCreatedCheckEmail")}</p>
              )}
            </div>

            <div className="pt-4">
              <p className="text-center text-sm text-muted-foreground mb-3">
                {user ? t("redirectingToDashboard") : t("redirectingToLogin")}
              </p>
              <div className="flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={() => router.push("/user")} className="w-full">
                {t("goToUserArea")}
              </Button>
              <Button onClick={() => router.push("/")} variant="outline" className="w-full">
                {t("backToHome")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </main>
  )
}


