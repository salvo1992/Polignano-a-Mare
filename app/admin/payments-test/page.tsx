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
  Trash2
} from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { db } from "@/lib/firebase"
import { doc, getDoc, onSnapshot, deleteDoc } from "firebase/firestore"

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
  const [testAmount, setTestAmount] = useState("15500")

  // Set default dates for testing
  useEffect(() => {
    const today = new Date()
    const days = parseInt(daysBeforeCheckIn) || 30
    const checkIn = new Date(today.getTime() + days * 24 * 60 * 60 * 1000)
    const checkOut = new Date(checkIn.getTime() + 2 * 24 * 60 * 60 * 1000)
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
        })
      }
    })
    
    return () => unsubscribe()
  }, [bookingId])

  const addResult = useCallback((result: TestResult) => {
    setResults(prev => [{...result, timestamp: new Date().toLocaleTimeString()}, ...prev])
  }, [])

  // Calculate days until check-in
  const getDaysUntilCheckIn = (checkInDate: string) => {
    const checkIn = new Date(checkInDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    checkIn.setHours(0, 0, 0, 0)
    return Math.ceil((checkIn.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
  }

  // Create a test booking
  const createTestBooking = async () => {
    setLoading(true)
    setActiveTest("create")
    setError(null)

    try {
      const days = parseInt(daysBeforeCheckIn) || 30
      const checkIn = new Date()
      checkIn.setDate(checkIn.getDate() + days)
      const checkOut = new Date(checkIn)
      checkOut.setDate(checkOut.getDate() + 2)

      const bookingData = {
        email: user?.email || "test@al22suite.com",
        firstName: "Test",
        lastName: "Pagamenti",
        phone: "+39 123 456 7890",
        checkIn: checkIn.toISOString().split('T')[0],
        checkOut: checkOut.toISOString().split('T')[0],
        guests: 2,
        roomType: "acies",
        roomName: "Camera Acies (Test)",
        isTestBooking: true, // Skip availability check for admin tests
        nights: 2,
        pricePerNight: 155,
        subtotal: 310,
        taxes: 0,
        serviceFee: 0,
        totalAmount: 310,
        specialRequests: `TEST - Prenotazione ${days} giorni prima del check-in`,
      }

      const response = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Errore nella creazione della prenotazione")
      }

      setBookingId(data.bookingId)

      addResult({
        success: true,
        message: `Prenotazione creata! Check-in tra ${days} giorni`,
        data: { 
          bookingId: data.bookingId, 
          checkIn: bookingData.checkIn,
          checkOut: bookingData.checkOut,
          daysUntilCheckIn: days,
          totalAmount: bookingData.totalAmount + " EUR",
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

  // Test Stripe Checkout Session
  const testStripeCheckout = async () => {
    if (!bookingId) {
      setError("Crea prima una prenotazione di test o inserisci un ID")
      return
    }

    setLoading(true)
    setActiveTest("stripe")
    setError(null)

    try {
      const amount = parseInt(testAmount) || 15500
      const successUrl = `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&bookingId=${bookingId}`
      const cancelUrl = `${window.location.origin}/admin/payments-test?cancelled=true`

      const response = await fetch("/api/payments/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          amount,
          currency: "EUR",
          successUrl,
          cancelUrl,
          customerEmail: testBooking?.email || user?.email || "test@al22suite.com",
          checkInDate: testBooking?.checkIn, // Pass check-in date to determine immediate charge vs setup
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Errore nella creazione della sessione Stripe")
      }

      const modeMessage = data.chargedImmediately 
        ? `ADDEBITO IMMEDIATO (${data.daysUntilCheckIn} giorni al check-in)`
        : `SOLO SALVATAGGIO CARTA (${data.daysUntilCheckIn} giorni al check-in - addebito 7gg prima)`

      addResult({
        success: true,
        message: `Sessione Stripe creata! ${modeMessage}`,
        data: {
          sessionId: data.sessionId,
          customerId: data.customerId,
          amount: `${(amount / 100).toFixed(2)} EUR`,
          mode: data.mode,
          daysUntilCheckIn: data.daysUntilCheckIn,
          chargedImmediately: data.chargedImmediately,
          note: "Usa carta 4242 4242 4242 4242, data futura, CVC 123"
        },
      })

      if (data.url) {
        window.open(data.url, "_blank", "width=500,height=700")
      }
    } catch (err: any) {
      setError(err.message)
      addResult({ success: false, message: `Errore Stripe: ${err.message}` })
    } finally {
      setLoading(false)
      setActiveTest(null)
    }
  }

  // Check if payment method is attached
  const checkPaymentMethod = async () => {
    if (!bookingId) {
      setError("Inserisci un ID prenotazione")
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

      addResult({
        success: hasPaymentMethod,
        message: hasPaymentMethod 
          ? "Metodo di pagamento salvato correttamente!"
          : "Nessun metodo di pagamento salvato",
        data: {
          stripeCustomerId: data.stripeCustomerId || "Non presente",
          stripePaymentMethodId: data.stripePaymentMethodId || "Non presente",
          cardLast4: data.cardLast4 || "-",
          cardBrand: data.cardBrand || "-",
          status: data.status,
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

  // Test balance payment (7 days before check-in)
  const testBalancePayment = async () => {
    if (!bookingId) {
      setError("Inserisci un ID prenotazione")
      return
    }

    setLoading(true)
    setActiveTest("balance")
    setError(null)

    try {
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
          ? "Pagamento saldo completato con successo!"
          : data.status === "payment_action_required"
          ? "Richiesta autenticazione 3D Secure. Link inviato al cliente."
          : `Stato: ${data.status}`,
        data: {
          status: data.status,
          paymentIntentId: data.paymentIntentId,
          paymentUrl: data.paymentUrl,
        },
      })
    } catch (err: any) {
      setError(err.message)
      addResult({ success: false, message: `Errore pagamento saldo: ${err.message}` })
    } finally {
      setLoading(false)
      setActiveTest(null)
    }
  }

  // Test cancellation
  const testCancellation = async () => {
    if (!bookingId) {
      setError("Inserisci un ID prenotazione")
      return
    }

    setLoading(true)
    setActiveTest("cancel")
    setError(null)

    try {
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
          refundAmount: data.refundAmount + " EUR",
          penaltyAmount: data.penaltyAmount + " EUR",
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
      setError("Inserisci un ID prenotazione")
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
        message: "Rimborso elaborato con successo!",
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
          message: "Cambio date richiede pagamento differenza. Apertura checkout...",
          data: {
            priceDifference: data.priceDifference + " EUR",
            paymentRequired: true,
          },
        })
        window.open(data.paymentUrl, "_blank", "width=500,height=700")
      } else {
        addResult({
          success: true,
          message: "Date modificate con successo!",
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
    
    if (!confirm("Sei sicuro di voler eliminare questa prenotazione di test?")) return

    setLoading(true)
    try {
      await deleteDoc(doc(db, "bookings", bookingId))
      setTestBooking(null)
      setBookingId("")
      addResult({
        success: true,
        message: "Prenotazione di test eliminata",
      })
    } catch (err: any) {
      addResult({ success: false, message: `Errore eliminazione: ${err.message}` })
    } finally {
      setLoading(false)
    }
  }

  const clearResults = () => {
    setResults([])
    setError(null)
  }

  const daysUntil = testBooking?.checkIn ? getDaysUntilCheckIn(testBooking.checkIn) : null

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Test Sistema Pagamenti Stripe</h1>
        <p className="text-muted-foreground">
          Crea prenotazioni di test e verifica tutti i flussi di pagamento, cancellazione e rimborso
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Test Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Create Test Booking */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Step 1: Crea Prenotazione di Test
              </CardTitle>
              <CardDescription>
                Scegli quanti giorni prima del check-in per testare diversi scenari
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant={daysBeforeCheckIn === "3" ? "default" : "outline"}
                  onClick={() => setDaysBeforeCheckIn("3")}
                  className="text-sm"
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  3 giorni (penale 100%)
                </Button>
                <Button 
                  variant={daysBeforeCheckIn === "7" ? "default" : "outline"}
                  onClick={() => setDaysBeforeCheckIn("7")}
                  className="text-sm"
                >
                  <Clock className="h-4 w-4 mr-1" />
                  7 giorni (limite)
                </Button>
                <Button 
                  variant={daysBeforeCheckIn === "30" ? "default" : "outline"}
                  onClick={() => setDaysBeforeCheckIn("30")}
                  className="text-sm"
                >
                  <CalendarCheck className="h-4 w-4 mr-1" />
                  30 giorni (no penale)
                </Button>
              </div>

              <div className="flex gap-2 items-end">
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
                <Button 
                  onClick={createTestBooking} 
                  disabled={loading} 
                  className="flex-1"
                >
                  {loading && activeTest === "create" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Crea Prenotazione
                </Button>
              </div>

              {testBooking && (
                <>
                  <Separator />
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <span className="font-semibold">Prenotazione Attiva</span>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={daysUntil && daysUntil <= 7 ? "destructive" : "secondary"}>
                          {daysUntil} giorni al check-in
                        </Badge>
                        <Badge variant="outline">{testBooking.status}</Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">ID:</span> <code className="bg-background px-1 rounded text-xs">{testBooking.id}</code></div>
                      <div><span className="text-muted-foreground">Totale:</span> {testBooking.totalAmount} EUR</div>
                      <div><span className="text-muted-foreground">Check-in:</span> {testBooking.checkIn}</div>
                      <div><span className="text-muted-foreground">Check-out:</span> {testBooking.checkOut}</div>
                    </div>

                    {/* Payment Method Status */}
                    <div className={`rounded-md p-3 ${testBooking.stripePaymentMethodId ? "bg-green-100 dark:bg-green-900/30" : "bg-amber-100 dark:bg-amber-900/30"}`}>
                      <div className="flex items-center gap-2">
                        {testBooking.stripePaymentMethodId ? (
                          <>
                            <CreditCard className="h-4 w-4 text-green-700 dark:text-green-400" />
                            <span className="text-sm font-medium text-green-900 dark:text-green-100">
                              Carta salvata: {testBooking.cardBrand || "Card"} **** {testBooking.cardLast4 || "****"}
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                            <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
                              Nessuna carta salvata - completa lo Step 2
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <Button variant="outline" size="sm" onClick={deleteTestBooking} className="w-full">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Elimina Prenotazione Test
                    </Button>
                  </div>
                </>
              )}

              <Separator />
              <div className="space-y-2">
                <Label>Oppure usa un ID esistente:</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="es: ABC123XYZ"
                    value={bookingId}
                    onChange={(e) => setBookingId(e.target.value)}
                  />
                  <Button variant="outline" onClick={checkPaymentMethod} disabled={loading || !bookingId}>
                    {loading && activeTest === "check" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Stripe Checkout */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Step 2: Salva Carta (Stripe Checkout)
              </CardTitle>
              <CardDescription>
                Apre Stripe Checkout per salvare la carta del cliente (SetupIntent)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <CreditCard className="h-4 w-4" />
                <AlertDescription>
                  <strong>Carta di test:</strong> 4242 4242 4242 4242 | Data: qualsiasi futura | CVC: 123
                </AlertDescription>
              </Alert>

              <Button 
                onClick={testStripeCheckout} 
                disabled={loading || !bookingId}
                className="w-full"
              >
                {loading && activeTest === "stripe" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                Apri Stripe Checkout
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Dopo aver completato il checkout, la carta sara' salvata e visibile sopra
              </p>
            </CardContent>
          </Card>

          {/* Step 3: Payment Tests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Step 3: Test Pagamenti e Cancellazioni
              </CardTitle>
              <CardDescription>
                Testa addebito saldo, cancellazione con penale/rimborso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="balance" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="balance">Saldo</TabsTrigger>
                  <TabsTrigger value="cancel">Cancella</TabsTrigger>
                  <TabsTrigger value="refund">Rimborso</TabsTrigger>
                  <TabsTrigger value="dates">Date</TabsTrigger>
                </TabsList>

                <TabsContent value="balance" className="space-y-4 mt-4">
                  <Alert>
                    <Euro className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Logica 7 giorni:</strong> Se mancano meno di 7 giorni al check-in, 
                      addebita l'intero importo sulla carta salvata.
                    </AlertDescription>
                  </Alert>

                  {testBooking && daysUntil !== null && (
                    <div className={`rounded-md p-3 ${daysUntil <= 7 ? "bg-amber-100 dark:bg-amber-900/30" : "bg-blue-100 dark:bg-blue-900/30"}`}>
                      <p className="text-sm">
                        {daysUntil <= 7 ? (
                          <>
                            <AlertTriangle className="h-4 w-4 inline mr-1" />
                            <strong>Attenzione:</strong> Mancano solo {daysUntil} giorni. 
                            Il pagamento completo ({testBooking.totalAmount} EUR) sara' addebitato immediatamente.
                          </>
                        ) : (
                          <>
                            <Clock className="h-4 w-4 inline mr-1" />
                            Mancano {daysUntil} giorni. Il pagamento verra' addebitato automaticamente 7 giorni prima del check-in.
                          </>
                        )}
                      </p>
                    </div>
                  )}

                  <Button 
                    onClick={testBalancePayment} 
                    disabled={loading || !bookingId || !testBooking?.stripePaymentMethodId}
                    className="w-full"
                  >
                    {loading && activeTest === "balance" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Euro className="mr-2 h-4 w-4" />
                    )}
                    Addebita Saldo ({testBooking?.totalAmount || 0} EUR)
                  </Button>

                  {!testBooking?.stripePaymentMethodId && (
                    <p className="text-xs text-destructive text-center">
                      Completa prima lo Step 2 per salvare una carta
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="cancel" className="space-y-4 mt-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Policy Cancellazione:</strong><br />
                      - Oltre 7 giorni: rimborso 100%<br />
                      - Entro 7 giorni: penale 100% (nessun rimborso)
                    </AlertDescription>
                  </Alert>

                  {testBooking && daysUntil !== null && (
                    <div className={`rounded-md p-3 ${daysUntil <= 7 ? "bg-red-100 dark:bg-red-900/30" : "bg-green-100 dark:bg-green-900/30"}`}>
                      <p className="text-sm">
                        {daysUntil <= 7 ? (
                          <>
                            <XCircle className="h-4 w-4 inline mr-1 text-red-600" />
                            <strong>Penale 100%:</strong> Cancellando ora, verra' addebitato l'intero importo ({testBooking.totalAmount} EUR)
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 inline mr-1 text-green-600" />
                            <strong>Rimborso 100%:</strong> Cancellando ora, il cliente ricevera' un rimborso completo
                          </>
                        )}
                      </p>
                    </div>
                  )}

                  <Button 
                    onClick={testCancellation} 
                    disabled={loading || !bookingId}
                    variant="destructive"
                    className="w-full"
                  >
                    {loading && activeTest === "cancel" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Ban className="mr-2 h-4 w-4" />
                    )}
                    Cancella Prenotazione
                  </Button>
                </TabsContent>

                <TabsContent value="refund" className="space-y-4 mt-4">
                  <Alert>
                    <Euro className="h-4 w-4" />
                    <AlertDescription>
                      Rimborso manuale completo tramite Stripe. Usare solo per casi speciali.
                    </AlertDescription>
                  </Alert>
                  <Button 
                    onClick={testRefund} 
                    disabled={loading || !bookingId}
                    variant="outline"
                    className="w-full"
                  >
                    {loading && activeTest === "refund" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Elabora Rimborso
                  </Button>
                </TabsContent>

                <TabsContent value="dates" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nuovo Check-in</Label>
                      <Input
                        type="date"
                        value={newCheckIn}
                        onChange={(e) => setNewCheckIn(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nuovo Check-out</Label>
                      <Input
                        type="date"
                        value={newCheckOut}
                        onChange={(e) => setNewCheckOut(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={testChangeDates} 
                    disabled={loading || !bookingId}
                    className="w-full"
                  >
                    {loading && activeTest === "dates" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Cambia Date
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Results */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Log Risultati
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={clearResults}>
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
                  <p className="text-center text-muted-foreground py-8 text-sm">
                    I risultati dei test appariranno qui
                  </p>
                ) : (
                  results.map((result, index) => (
                    <div 
                      key={index} 
                      className={`rounded-lg p-3 text-sm ${
                        result.success 
                          ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" 
                          : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {result.success ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{result.message}</p>
                          <p className="text-xs text-muted-foreground">{result.timestamp}</p>
                          {result.data && (
                            <pre className="mt-2 text-xs bg-background/50 p-2 rounded overflow-x-auto">
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

          {/* Quick Reference */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Riferimento Rapido</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Carta Test:</span>
                <code>4242 4242 4242 4242</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">3D Secure:</span>
                <code>4000 0027 6000 3184</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rifiutata:</span>
                <code>4000 0000 0000 0002</code>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Limite penale:</span>
                <span>7 giorni</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Penale tardiva:</span>
                <span>100%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
