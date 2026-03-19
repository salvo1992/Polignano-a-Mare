"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  CreditCard, 
  RefreshCw, 
  Ban, 
  AlertTriangle, 
  Plus,
  FileText,
  ExternalLink,
  Clock,
  Euro,
  CalendarCheck,
  Wallet,
  Trash2,
  ArrowRight
} from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { db } from "@/lib/firebase"
import { doc, getDoc, onSnapshot, deleteDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"

interface TestBooking {
  id: string
  bookingId: string
  email: string
  firstName: string
  lastName: string
  checkIn: string
  checkOut: string
  nights: number
  totalAmount: number
  totalAmountCents: number
  status: string
  createdAt: string
  stripeCustomerId?: string
  stripePaymentMethodId?: string
  cardLast4?: string
  cardBrand?: string
  paymentStatus?: string
}

interface TestResult {
  success: boolean
  message: string
  data?: any
  timestamp?: string
}

export default function PaymentsTestPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [activeTest, setActiveTest] = useState<string | null>(null)
  const [testBooking, setTestBooking] = useState<TestBooking | null>(null)
  const [results, setResults] = useState<TestResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [daysBeforeCheckIn, setDaysBeforeCheckIn] = useState("30")

  // Form states
  const [bookingId, setBookingId] = useState("")
  const [newCheckIn, setNewCheckIn] = useState("")
  const [newCheckOut, setNewCheckOut] = useState("")
  const [testAmount, setTestAmount] = useState("31000") // 310 EUR for 2 nights

  // Calculated dates based on days before check-in
  const [checkInDate, setCheckInDate] = useState("")
  const [checkOutDate, setCheckOutDate] = useState("")

  // Update dates when days change
  useEffect(() => {
    const days = parseInt(daysBeforeCheckIn) || 30
    const checkIn = new Date()
    checkIn.setDate(checkIn.getDate() + days)
    const checkOut = new Date(checkIn)
    checkOut.setDate(checkOut.getDate() + 2)
    setCheckInDate(checkIn.toISOString().split('T')[0])
    setCheckOutDate(checkOut.toISOString().split('T')[0])
    setNewCheckIn(checkIn.toISOString().split('T')[0])
    setNewCheckOut(checkOut.toISOString().split('T')[0])
  }, [daysBeforeCheckIn])

  // Listen for booking updates in real-time
  useEffect(() => {
    if (!bookingId) return
    
    const unsubscribe = onSnapshot(doc(db, "bookings", bookingId), (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setTestBooking({
          id: snap.id,
          bookingId: snap.id,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          nights: data.nights,
          totalAmount: data.totalAmount,
          totalAmountCents: data.totalAmountCents || Math.round(data.totalAmount * 100),
          status: data.status,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          stripeCustomerId: data.stripeCustomerId,
          stripePaymentMethodId: data.stripePaymentMethodId,
          cardLast4: data.cardLast4,
          cardBrand: data.cardBrand,
          paymentStatus: data.paymentStatus,
        })
        
        // Update results with payment info
        if (data.stripePaymentMethodId) {
          addResult({
            success: true,
            message: "Carta salvata correttamente!",
            data: {
              cardBrand: data.cardBrand,
              cardLast4: data.cardLast4,
              paymentStatus: data.paymentStatus,
            }
          })
        }
      }
    })
    
    return () => unsubscribe()
  }, [bookingId])

  const addResult = useCallback((result: TestResult) => {
    setResults(prev => {
      // Avoid duplicates
      const isDuplicate = prev.some(r => r.message === result.message)
      if (isDuplicate) return prev
      return [{...result, timestamp: new Date().toLocaleTimeString()}, ...prev]
    })
  }, [])

  // Calculate days until check-in
  const getDaysUntilCheckIn = (checkInDateStr: string) => {
    const checkIn = new Date(checkInDateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    checkIn.setHours(0, 0, 0, 0)
    return Math.ceil((checkIn.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
  }

  const daysUntil = getDaysUntilCheckIn(checkInDate)
  const willChargeImmediately = daysUntil <= 7

  // STEP 1: Create booking AND start Stripe checkout together
  const startBookingWithPayment = async () => {
    setLoading(true)
    setActiveTest("create-pay")
    setError(null)

    try {
      const days = parseInt(daysBeforeCheckIn) || 30
      const checkIn = new Date()
      checkIn.setDate(checkIn.getDate() + days)
      const checkOut = new Date(checkIn)
      checkOut.setDate(checkOut.getDate() + 2)

      const checkInStr = checkIn.toISOString().split('T')[0]
      const checkOutStr = checkOut.toISOString().split('T')[0]

      // First create the booking
      const bookingData = {
        email: user?.email || "test@al22suite.com",
        firstName: "Test",
        lastName: "Pagamenti",
        phone: "+39 123 456 7890",
        checkIn: checkInStr,
        checkOut: checkOutStr,
        guests: 2,
        roomType: "acies",
        roomName: "Camera Acies (Test)",
        isTestBooking: true,
        nights: 2,
        pricePerNight: 155,
        subtotal: 310,
        taxes: 0,
        serviceFee: 0,
        totalAmount: 310,
        specialRequests: `TEST - Prenotazione ${days} giorni prima del check-in`,
      }

      addResult({
        success: true,
        message: "Creazione prenotazione in corso...",
        data: { checkIn: checkInStr, checkOut: checkOutStr, days }
      })

      const createResponse = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      })

      const createData = await createResponse.json()

      if (!createResponse.ok) {
        throw new Error(createData.error || "Errore nella creazione della prenotazione")
      }

      const newBookingId = createData.bookingId
      setBookingId(newBookingId)

      addResult({
        success: true,
        message: `Prenotazione creata: ${newBookingId}`,
        data: { bookingId: newBookingId }
      })

      // Now create Stripe session
      const amount = 31000 // 310 EUR
      const successUrl = `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&bookingId=${newBookingId}`
      const cancelUrl = `${window.location.origin}/admin/payments-test?cancelled=true&bookingId=${newBookingId}`

      const stripeResponse = await fetch("/api/payments/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: newBookingId,
          amount,
          currency: "EUR",
          successUrl,
          cancelUrl,
          customerEmail: user?.email || "test@al22suite.com",
          checkInDate: checkInStr,
        }),
      })

      const stripeData = await stripeResponse.json()

      if (!stripeResponse.ok) {
        throw new Error(stripeData.error || "Errore nella creazione sessione Stripe")
      }

      const modeMessage = stripeData.chargedImmediately 
        ? `ADDEBITO IMMEDIATO (${stripeData.daysUntilCheckIn} giorni al check-in)`
        : `SALVATAGGIO CARTA (addebito 7 giorni prima del check-in)`

      addResult({
        success: true,
        message: `Checkout Stripe aperto - ${modeMessage}`,
        data: {
          sessionId: stripeData.sessionId,
          customerId: stripeData.customerId,
          mode: stripeData.mode,
          amount: "310.00 EUR",
          chargedImmediately: stripeData.chargedImmediately,
          daysUntilCheckIn: stripeData.daysUntilCheckIn,
          note: "Usa carta 4242 4242 4242 4242, data futura, CVC qualsiasi"
        },
      })

      if (stripeData.url) {
        window.open(stripeData.url, "_blank", "width=500,height=700")
      }

    } catch (err: any) {
      setError(err.message)
      addResult({ success: false, message: `Errore: ${err.message}` })
    } finally {
      setLoading(false)
      setActiveTest(null)
    }
  }

  // Check payment status
  const checkPaymentStatus = async () => {
    if (!bookingId) {
      setError("Crea prima una prenotazione")
      return
    }

    setLoading(true)
    setActiveTest("check")
    setError(null)

    try {
      const bookingRef = doc(db, "bookings", bookingId)
      const snap = await getDoc(bookingRef)
      
      if (!snap.exists()) {
        throw new Error("Prenotazione non trovata")
      }

      const data = snap.data()
      const hasPaymentMethod = !!(data.stripePaymentMethodId && data.stripeCustomerId)
      const isPaid = data.paymentStatus === "paid"

      addResult({
        success: hasPaymentMethod || isPaid,
        message: isPaid 
          ? "Pagamento completato!"
          : hasPaymentMethod 
          ? "Carta salvata, pagamento programmato 7gg prima"
          : "Nessun metodo di pagamento salvato",
        data: {
          status: data.status,
          paymentStatus: data.paymentStatus || "pending",
          stripeCustomerId: data.stripeCustomerId || "-",
          cardBrand: data.cardBrand || "-",
          cardLast4: data.cardLast4 || "-",
        },
      })
    } catch (err: any) {
      setError(err.message)
      addResult({ success: false, message: `Errore: ${err.message}` })
    } finally {
      setLoading(false)
      setActiveTest(null)
    }
  }

  // Test balance payment (simulate 7 days before)
  const testBalancePayment = async () => {
    if (!bookingId) {
      setError("Crea prima una prenotazione")
      return
    }

    if (!testBooking?.stripePaymentMethodId) {
      setError("Prima devi salvare una carta tramite Stripe checkout")
      return
    }

    setLoading(true)
    setActiveTest("balance")
    setError(null)

    try {
      addResult({
        success: true,
        message: "Simulazione addebito saldo (come 7 giorni prima)...",
      })

      const response = await fetch("/api/payments/process-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Errore nel pagamento saldo")
      }

      addResult({
        success: data.success,
        message: data.status === "paid" 
          ? "Addebito saldo completato!"
          : data.status === "already_paid"
          ? "Gia pagato (prenotazione entro 7gg)"
          : data.status === "payment_action_required"
          ? "Richiesta 3D Secure - Link inviato"
          : `Stato: ${data.status}`,
        data: {
          status: data.status,
          paymentIntentId: data.paymentIntentId,
          amount: data.amountCharged ? `${(data.amountCharged / 100).toFixed(2)} EUR` : "-",
        },
      })
    } catch (err: any) {
      setError(err.message)
      addResult({ success: false, message: `Errore saldo: ${err.message}` })
    } finally {
      setLoading(false)
      setActiveTest(null)
    }
  }

  // Test cancellation
  const testCancellation = async () => {
    if (!bookingId) {
      setError("Crea prima una prenotazione")
      return
    }

    setLoading(true)
    setActiveTest("cancel")
    setError(null)

    try {
      const daysLeft = testBooking?.checkIn ? getDaysUntilCheckIn(testBooking.checkIn) : 30
      const willHavePenalty = daysLeft <= 7

      addResult({
        success: true,
        message: `Test cancellazione (${daysLeft} giorni al check-in)${willHavePenalty ? " - PENALE 100%" : " - Rimborso completo"}`,
      })

      const response = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          reason: "Test cancellazione dal pannello admin",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Errore nella cancellazione")
      }

      addResult({
        success: true,
        message: data.message || "Prenotazione cancellata!",
        data: {
          penaltyPercent: data.penaltyPercent + "%",
          refundPercent: data.refundPercent + "%",
          refundAmount: data.refundAmount ? data.refundAmount + " EUR" : "N/A",
          penaltyAmount: data.penaltyAmount ? data.penaltyAmount + " EUR" : "N/A",
        },
      })
    } catch (err: any) {
      setError(err.message)
      addResult({ success: false, message: `Errore cancellazione: ${err.message}` })
    } finally {
      setLoading(false)
      setActiveTest(null)
    }
  }

  // Test refund
  const testRefund = async () => {
    if (!bookingId) {
      setError("Crea prima una prenotazione")
      return
    }

    setLoading(true)
    setActiveTest("refund")
    setError(null)

    try {
      const response = await fetch("/api/payments/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          reason: "Test rimborso manuale",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Errore nel rimborso")
      }

      addResult({
        success: true,
        message: "Rimborso elaborato!",
        data,
      })
    } catch (err: any) {
      setError(err.message)
      addResult({ success: false, message: `Errore rimborso: ${err.message}` })
    } finally {
      setLoading(false)
      setActiveTest(null)
    }
  }

  // Test change dates
  const testChangeDates = async () => {
    if (!bookingId || !newCheckIn || !newCheckOut) {
      setError("Inserisci ID prenotazione e nuove date")
      return
    }

    setLoading(true)
    setActiveTest("dates")
    setError(null)

    try {
      const response = await fetch("/api/bookings/change-dates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          checkIn: newCheckIn,
          checkOut: newCheckOut,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Errore nel cambio date")
      }

      if (data.paymentRequired && data.paymentUrl) {
        addResult({
          success: true,
          message: "Cambio date richiede pagamento differenza",
          data: { priceDifference: data.priceDifference + " EUR" },
        })
        window.open(data.paymentUrl, "_blank", "width=500,height=700")
      } else {
        addResult({
          success: true,
          message: "Date modificate!",
          data,
        })
      }
    } catch (err: any) {
      setError(err.message)
      addResult({ success: false, message: `Errore cambio date: ${err.message}` })
    } finally {
      setLoading(false)
      setActiveTest(null)
    }
  }

  // Delete test booking
  const deleteTestBooking = async () => {
    if (!bookingId) return
    
    if (!confirm("Eliminare questa prenotazione di test?")) return

    setLoading(true)
    try {
      await deleteDoc(doc(db, "bookings", bookingId))
      setTestBooking(null)
      setBookingId("")
      addResult({ success: true, message: "Prenotazione eliminata" })
    } catch (err: any) {
      addResult({ success: false, message: `Errore: ${err.message}` })
    } finally {
      setLoading(false)
    }
  }

  const clearResults = () => {
    setResults([])
    setError(null)
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Test Sistema Pagamenti Stripe</h1>
        <p className="text-muted-foreground">
          Testa prenotazione + pagamento, cancellazioni, rimborsi e addebito saldo
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Test Flow */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* STEP 1: Create & Pay */}
          <Card className="border-2 border-primary/20">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2">
                <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">1</div>
                Crea Prenotazione + Pagamento
              </CardTitle>
              <CardDescription>
                Scegli i giorni al check-in, crea la prenotazione e procedi al pagamento Stripe
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* Quick Select */}
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant={daysBeforeCheckIn === "3" ? "default" : "outline"}
                  onClick={() => setDaysBeforeCheckIn("3")}
                  size="sm"
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  3gg (Addebito subito)
                </Button>
                <Button 
                  variant={daysBeforeCheckIn === "7" ? "default" : "outline"}
                  onClick={() => setDaysBeforeCheckIn("7")}
                  size="sm"
                >
                  <Clock className="h-4 w-4 mr-1" />
                  7gg (Limite)
                </Button>
                <Button 
                  variant={daysBeforeCheckIn === "30" ? "default" : "outline"}
                  onClick={() => setDaysBeforeCheckIn("30")}
                  size="sm"
                >
                  <CalendarCheck className="h-4 w-4 mr-1" />
                  30gg (Solo carta)
                </Button>
              </div>

              {/* Custom Days Input */}
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label>Giorni prima del check-in</Label>
                  <Input 
                    type="number" 
                    value={daysBeforeCheckIn} 
                    onChange={(e) => setDaysBeforeCheckIn(e.target.value)}
                    min="1"
                    max="365"
                  />
                </div>
                <div className="flex-1">
                  <Label>Check-in</Label>
                  <Input value={checkInDate} readOnly className="bg-muted" />
                </div>
                <div className="flex-1">
                  <Label>Check-out</Label>
                  <Input value={checkOutDate} readOnly className="bg-muted" />
                </div>
              </div>

              {/* Info Box */}
              <Alert className={willChargeImmediately ? "border-amber-500 bg-amber-50" : "border-green-500 bg-green-50"}>
                <AlertDescription className="flex items-center gap-2">
                  {willChargeImmediately ? (
                    <>
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      <span className="text-amber-800">
                        <strong>Addebito immediato 310 EUR</strong> - Check-in entro 7 giorni
                      </span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5 text-green-600" />
                      <span className="text-green-800">
                        <strong>Solo salvataggio carta</strong> - Addebito automatico 7 giorni prima
                      </span>
                    </>
                  )}
                </AlertDescription>
              </Alert>

              {/* Main Action Button */}
              <Button 
                onClick={startBookingWithPayment} 
                disabled={loading}
                size="lg"
                className="w-full"
              >
                {loading && activeTest === "create-pay" ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-5 w-5" />
                )}
                Crea Prenotazione e Apri Stripe Checkout
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Carta test: 4242 4242 4242 4242 | Data: qualsiasi futura | CVC: qualsiasi
              </p>
            </CardContent>
          </Card>

          {/* Current Booking Status */}
          {testBooking && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Prenotazione Attiva
                  </span>
                  <div className="flex gap-2">
                    <Badge variant={testBooking.paymentStatus === "paid" ? "default" : "secondary"}>
                      {testBooking.paymentStatus || "pending"}
                    </Badge>
                    <Button size="sm" variant="ghost" onClick={deleteTestBooking}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">ID:</span>
                    <code className="ml-2 bg-muted px-2 py-1 rounded text-xs">{testBooking.id}</code>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Totale:</span>
                    <strong className="ml-2">{testBooking.totalAmount} EUR</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Check-in:</span>
                    <span className="ml-2">{testBooking.checkIn}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Check-out:</span>
                    <span className="ml-2">{testBooking.checkOut}</span>
                  </div>
                </div>

                {/* Payment Method */}
                <div className={`rounded-lg p-4 ${testBooking.stripePaymentMethodId ? "bg-green-100" : "bg-amber-100"}`}>
                  {testBooking.stripePaymentMethodId ? (
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-6 w-6 text-green-700" />
                      <div>
                        <p className="font-medium text-green-800">Carta Salvata</p>
                        <p className="text-sm text-green-700">
                          {testBooking.cardBrand} **** {testBooking.cardLast4}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-6 w-6 text-amber-700" />
                      <div>
                        <p className="font-medium text-amber-800">Carta Non Salvata</p>
                        <p className="text-sm text-amber-700">Completa il checkout Stripe</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 2: Additional Tests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="bg-secondary text-secondary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">2</div>
                Test Aggiuntivi
              </CardTitle>
              <CardDescription>
                Verifica stato pagamento, simula addebito saldo, cancellazione e rimborsi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={checkPaymentStatus} 
                  disabled={loading || !bookingId}
                  variant="outline"
                >
                  {loading && activeTest === "check" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Verifica Stato Pagamento
                </Button>

                <Button 
                  onClick={testBalancePayment} 
                  disabled={loading || !bookingId || !testBooking?.stripePaymentMethodId}
                  variant="outline"
                >
                  {loading && activeTest === "balance" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Euro className="mr-2 h-4 w-4" />
                  )}
                  Simula Addebito Saldo
                </Button>

                <Button 
                  onClick={testCancellation} 
                  disabled={loading || !bookingId}
                  variant="outline"
                  className="text-amber-600 border-amber-300 hover:bg-amber-50"
                >
                  {loading && activeTest === "cancel" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Ban className="mr-2 h-4 w-4" />
                  )}
                  Test Cancellazione
                </Button>

                <Button 
                  onClick={testRefund} 
                  disabled={loading || !bookingId}
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  {loading && activeTest === "refund" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wallet className="mr-2 h-4 w-4" />
                  )}
                  Test Rimborso
                </Button>
              </div>

              <Separator />

              {/* Change Dates */}
              <div className="space-y-3">
                <Label>Test Cambio Date</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input 
                    type="date" 
                    value={newCheckIn} 
                    onChange={(e) => setNewCheckIn(e.target.value)}
                    disabled={!bookingId}
                  />
                  <Input 
                    type="date" 
                    value={newCheckOut} 
                    onChange={(e) => setNewCheckOut(e.target.value)}
                    disabled={!bookingId}
                  />
                </div>
                <Button 
                  onClick={testChangeDates} 
                  disabled={loading || !bookingId}
                  variant="outline"
                  className="w-full"
                >
                  {loading && activeTest === "dates" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CalendarCheck className="mr-2 h-4 w-4" />
                  )}
                  Cambia Date
                </Button>
              </div>

              {/* Manual Booking ID Input */}
              <Separator />
              <div className="space-y-3">
                <Label>Oppure usa un Booking ID esistente</Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Inserisci Booking ID..." 
                    value={bookingId}
                    onChange={(e) => setBookingId(e.target.value)}
                  />
                  <Button 
                    onClick={checkPaymentStatus}
                    disabled={loading || !bookingId}
                    variant="secondary"
                  >
                    Carica
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Results Log */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Log Risultati
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={clearResults}>
                Pulisci
              </Button>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {results.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    I risultati dei test appariranno qui
                  </p>
                ) : (
                  results.map((result, idx) => (
                    <div 
                      key={idx}
                      className={`rounded-lg border p-3 text-sm ${
                        result.success 
                          ? "bg-green-50 border-green-200" 
                          : "bg-red-50 border-red-200"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {result.success ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={result.success ? "text-green-800" : "text-red-800"}>
                              {result.message}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {result.timestamp}
                            </span>
                          </div>
                          {result.data && (
                            <pre className="mt-2 text-xs bg-white/50 p-2 rounded overflow-x-auto">
                              {JSON.stringify(result.data, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Logica Pagamenti</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p><strong>Check-in entro 7 giorni:</strong> Addebito immediato 100%</p>
              <p><strong>Check-in oltre 7 giorni:</strong> Solo salvataggio carta, addebito automatico 7gg prima</p>
              <Separator className="my-2" />
              <p><strong>Cancellazione entro 7gg:</strong> Penale 100%</p>
              <p><strong>Cancellazione oltre 7gg:</strong> Rimborso completo</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
