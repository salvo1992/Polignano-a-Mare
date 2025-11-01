"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"
import { getBookingById, loginWithEmail } from "@/lib/firebase"
import { Loader2, CheckCircle2, Mail, Copy, Check, Eye, EyeOff, LogIn } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"

export default function CheckoutSuccess() {
  const { t } = useLanguage()
  const router = useRouter()
  const search = useSearchParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const bookingId = search.get("bookingId") || ""

  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState<any>(null)
  const [resendingEmail, setResendingEmail] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [copiedPassword, setCopiedPassword] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)

  useEffect(() => {
    if (!bookingId) {
      setLoading(false)
      return
    }

    const loadBooking = async () => {
      try {
        console.log("[v0] Loading booking:", bookingId)
        const bookingData = await getBookingById(bookingId)
        console.log("[v0] Booking loaded:", bookingData)
        console.log("[v0] Booking has newUserPassword:", !!bookingData?.newUserPassword)
        if (bookingData?.newUserPassword) {
          console.log("[v0] Password length:", bookingData.newUserPassword.length)
        }
        console.log("[v0] Booking email:", bookingData?.email)
        console.log("[v0] Booking status:", bookingData?.status)
        setBooking(bookingData)
      } catch (error) {
        console.error("[v0] Error loading booking:", error)
      } finally {
        setLoading(false)
      }
    }

    loadBooking()
  }, [bookingId])

  const handleLogin = async () => {
    if (!booking?.newUserPassword) {
      router.push(`/user?highlight=${bookingId}`)
      return
    }

    setLoggingIn(true)
    try {
      await loginWithEmail(booking.email, booking.newUserPassword)
      console.log("[v0] Login successful")
      toast({
        title: t("loginSuccessful"),
        description: t("redirectingToDashboard"),
      })
      setTimeout(() => {
        router.push(`/user?highlight=${bookingId}`)
      }, 1000)
    } catch (error) {
      console.error("[v0] Login failed:", error)
      toast({
        title: t("loginFailed"),
        description: t("pleaseCheckCredentials"),
        variant: "destructive",
      })
      setLoggingIn(false)
    }
  }

  const handleResendEmail = async () => {
    if (!booking) return

    setResendingEmail(true)
    try {
      const response = await fetch("/api/resend-booking-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: t("emailSent"),
          description: t("checkYourInbox"),
        })
      } else {
        toast({
          title: t("error"),
          description: data.error || t("emailSendFailed"),
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error resending email:", error)
      toast({
        title: t("error"),
        description: t("emailSendFailed"),
        variant: "destructive",
      })
    } finally {
      setResendingEmail(false)
    }
  }

  const handleCopyPassword = async () => {
    if (!booking?.newUserPassword) return

    try {
      await navigator.clipboard.writeText(booking.newUserPassword)
      setCopiedPassword(true)
      toast({
        title: t("copied"),
        description: t("passwordCopied"),
      })
      setTimeout(() => setCopiedPassword(false), 2000)
    } catch (error) {
      console.error("[v0] Error copying password:", error)
    }
  }

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

            {booking?.newUserPassword && (
              <div className="rounded-lg border-2 border-amber-500 bg-amber-50 dark:bg-amber-950 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="text-2xl">🔐</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">{t("accountCreated")}</h3>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">{t("useTheseCredentials")}</p>

                    <div className="space-y-2 bg-white dark:bg-amber-900/20 rounded-md p-3">
                      <div>
                        <div className="text-xs text-amber-700 dark:text-amber-300 mb-1">Email:</div>
                        <div className="font-mono text-sm font-medium text-amber-900 dark:text-amber-100">
                          {booking.email}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-amber-700 dark:text-amber-300 mb-1">Password:</div>
                        <div className="flex items-center gap-2">
                          <div className="font-mono text-sm font-medium text-amber-900 dark:text-amber-100 flex-1 bg-amber-100 dark:bg-amber-900/40 px-3 py-2 rounded">
                            {showPassword ? booking.newUserPassword : "••••••••••••"}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowPassword(!showPassword)}
                            className="shrink-0"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCopyPassword}
                            className="shrink-0 bg-transparent"
                          >
                            {copiedPassword ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-3">
                      ⚠️ {t("changePasswordRecommended")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-950 space-y-3">
              <div className="flex items-start gap-2">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    {t("confirmationEmailSent")} <strong>{booking?.email}</strong>
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">{t("checkSpamFolder")}</p>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={handleResendEmail}
                disabled={resendingEmail}
                className="w-full bg-transparent"
              >
                {resendingEmail ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("sending")}
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    {t("resendEmail")}
                  </>
                )}
              </Button>
            </div>

            <div className="flex flex-col gap-2 pt-4">
              {!user && booking?.newUserPassword ? (
                <Button onClick={handleLogin} disabled={loggingIn} className="w-full" size="lg">
                  {loggingIn ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      {t("loggingIn")}
                    </>
                  ) : (
                    <>
                      <LogIn className="h-5 w-5 mr-2" />
                      {t("loginToAccount")}
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={() => router.push(`/user?highlight=${bookingId}`)} className="w-full" size="lg">
                  {t("goToUserArea")}
                </Button>
              )}
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
