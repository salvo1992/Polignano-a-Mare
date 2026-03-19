"use client"

import { useState, useEffect } from "react"
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
  Euro
} from "lucide-react"
import { useAuth } from "@/components/auth-provider"

interface TestBooking {
  bookingId: string
  email: string
  firstName: string
  lastName: string
  checkIn: string
  checkOut: string
  nights: number
  totalAmount: number
  status: string
  createdAt: string
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

  // Form states
  const [bookingId, setBookingId] = useState("")
  const [newCheckIn, setNewCheckIn] = useState("")
  const [newCheckOut, setNewCheckOut] = useState("")
  const [testAmount, setTestAmount] = useState("15500") // €155 in cents

  // Set default dates for testing
  useEffect(() => {
    const today = new Date()
    const checkIn = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    const checkOut = new Date(today.getTime() + 32 * 24 * 60 * 60 * 1000) // 32 days from now
    setNewCheckIn(checkIn.toISOString().split('T')[0])
    setNewCheckOut(checkOut.toISOString().split('T')[0])
  }, [])

  const addResult = (result: TestResult) => {
    setResults(prev => [{...result, timestamp: new Date().toLocaleTimeString()}, ...prev])
  }

  // Create a test booking in Firebase
  const createTestBooking = async () => {
    setLoading(true)
    setActiveTest("create")
    setError(null)

    try {
      const checkIn = new Date()
      checkIn.setDate(checkIn.getDate() + 30) // 30 days from now
      const checkOut = new Date(checkIn)
      checkOut.setDate(checkOut.getDate() + 2) // 2 nights

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
        nights: 2,
        pricePerNight: 155,
        subtotal: 310,
        taxes: 0,
        serviceFee: 0,
        totalAmount: 310,
        specialRequests: "TEST - Prenotazione di test per verificare il sistema pagamenti",
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

      const newBooking: TestBooking = {
        bookingId: data.bookingId,
        email: bookingData.email,
        firstName: bookingData.firstName,
        lastName: bookingData.lastName,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        nights: bookingData.nights,
        totalAmount: bookingData.totalAmount,
        status: "pending",
        createdAt: new Date().toISOString(),
      }

      setTestBooking(newBooking)
      setBookingId(data.bookingId)

      addResult({
        success: true,
        message: "Prenotazione di test creata con successo!",
        data: { bookingId: data.bookingId, ...bookingData },
      })
    } catch (err: any) {
      setError(err.message)
      addResult({
        success: false,
        message: `Errore: ${err.message}`,
      })
    } finally {
      setLoading(false)
      setActiveTest(null)
    }
  }

  // Test Stripe Checkout Session (card setup)
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
      const successUrl = `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`
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
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Errore nella creazione della sessione Stripe")
      }

      addResult({
        success: true,
        message: "Sessione Stripe creata! Apertura checkout in nuova finestra...",
        data: {
          sessionId: data.sessionId,
          customerId: data.customerId,
          amount: `${(amount / 100).toFixed(2)} EUR`,
        },
      })

      // Open Stripe Checkout in new window
      if (data.url) {
        window.open(data.url, "_blank", "width=500,height=700")
      }
    } catch (err: any) {
      setError(err.message)
      addResult({
        success: false,
        message: `Errore Stripe: ${err.message}`,
      })
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
            priceDifference: data.priceDifference,
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
      addResult({
        success: false,
        message: `Errore cambio date: ${err.message}`,
      })
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
        message: "Prenotazione cancellata!",
        data: {
          refundPercentage: data.refundPercentage,
          refundAmount: data.refundAmount,
          ...data,
        },
      })

      // Clear test booking if it was the cancelled one
      if (testBooking?.bookingId === bookingId) {
        setTestBooking(null)
      }
    } catch (err: any) {
      setError(err.message)
      addResult({
        success: false,
        message: `Errore cancellazione: ${err.message}`,
      })
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
      addResult({
        success: false,
        message: `Errore rimborso: ${err.message}`,
      })
    } finally {
      setLoading(false)
      setActiveTest(null)
    }
  }

  // Test balance payment
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
        success: true,
        message: "Pagamento saldo elaborato!",
        data,
      })
    } catch (err: any) {
      setError(err.message)
      addResult({
        success: false,
        message: `Errore pagamento saldo: ${err.message}`,
      })
    } finally {
      setLoading(false)
      setActiveTest(null)
    }
  }

  // Clear all results
  const clearResults = () => {
    setResults([])
    setError(null)
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Test Sistema Pagamenti Stripe</h1>
        <p className="text-muted-foreground">
          Crea una prenotazione di test e verifica tutti i flussi di pagamento
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
                Crea una prenotazione fittizia per testare i pagamenti
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {testBooking ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-900">Prenotazione Attiva</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">ID:</span> <code className="bg-white px-1 rounded">{testBooking.bookingId}</code></div>
                    <div><span className="text-muted-foreground">Totale:</span> {testBooking.totalAmount} EUR</div>
                    <div><span className="text-muted-foreground">Check-in:</span> {testBooking.checkIn}</div>
                    <div><span className="text-muted-foreground">Check-out:</span> {testBooking.checkOut}</div>
                    <div><span className="text-muted-foreground">Notti:</span> {testBooking.nights}</div>
                    <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline">{testBooking.status}</Badge></div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Nessuna prenotazione di test attiva
                </div>
              )}

              <div className="flex gap-2">
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
                  {testBooking ? "Crea Nuova" : "Crea Prenotazione Test"}
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Oppure usa un ID esistente:</Label>
                <Input
                  placeholder="es: ABC123XYZ"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Test Stripe */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Step 2: Test Stripe Checkout
              </CardTitle>
              <CardDescription>
                Testa la creazione di una sessione Stripe per salvare la carta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Importo (centesimi)</Label>
                  <Input
                    type="number"
                    value={testAmount}
                    onChange={(e) => setTestAmount(e.target.value)}
                    placeholder="15500 = 155 EUR"
                  />
                  <p className="text-xs text-muted-foreground">
                    = {(parseInt(testAmount) / 100).toFixed(2)} EUR
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Booking ID</Label>
                  <Input
                    value={bookingId}
                    onChange={(e) => setBookingId(e.target.value)}
                    placeholder="ID prenotazione"
                  />
                </div>
              </div>

              <Alert>
                <CreditCard className="h-4 w-4" />
                <AlertDescription>
                  <strong>Carta di test Stripe:</strong> 4242 4242 4242 4242<br />
                  Data: qualsiasi data futura | CVC: qualsiasi 3 cifre
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
            </CardContent>
          </Card>

          {/* Other Tests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Altri Test
              </CardTitle>
              <CardDescription>
                Testa cambio date, cancellazione, rimborso e pagamento saldo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="dates" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="dates">Date</TabsTrigger>
                  <TabsTrigger value="cancel">Cancella</TabsTrigger>
                  <TabsTrigger value="refund">Rimborso</TabsTrigger>
                  <TabsTrigger value="balance">Saldo</TabsTrigger>
                </TabsList>

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
                    Testa Cambio Date
                  </Button>
                </TabsContent>

                <TabsContent value="cancel" className="space-y-4 mt-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Policy:</strong> 7+ giorni = 100% | 2-7 giorni = 50% | meno di 48h = 0%
                    </AlertDescription>
                  </Alert>
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
                    Testa Cancellazione
                  </Button>
                </TabsContent>

                <TabsContent value="refund" className="space-y-4 mt-4">
                  <Alert>
                    <Euro className="h-4 w-4" />
                    <AlertDescription>
                      Elabora un rimborso completo tramite Stripe per la prenotazione
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
                    Testa Rimborso
                  </Button>
                </TabsContent>

                <TabsContent value="balance" className="space-y-4 mt-4">
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      Addebita il saldo rimanente (70%) sulla carta salvata
                    </AlertDescription>
                  </Alert>
                  <Button 
                    onClick={testBalancePayment} 
                    disabled={loading || !bookingId}
                    className="w-full"
                  >
                    {loading && activeTest === "balance" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="mr-2 h-4 w-4" />
                    )}
                    Testa Pagamento Saldo
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Results */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Log Risultati
                </CardTitle>
                <CardDescription>
                  {results.length} test eseguiti
                </CardDescription>
              </div>
              {results.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearResults}>
                  Pulisci
                </Button>
              )}
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
                  <div className="text-center py-8 text-muted-foreground">
                    Esegui un test per vedere i risultati
                  </div>
                ) : (
                  results.map((result, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        result.success
                          ? "bg-green-50 border-green-200"
                          : "bg-red-50 border-red-200"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {result.success ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${
                            result.success ? "text-green-900" : "text-red-900"
                          }`}>
                            {result.message}
                          </p>
                          {result.timestamp && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {result.timestamp}
                            </p>
                          )}
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

          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Info Stripe Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Carta Test:</span>
                <code className="bg-muted px-1 rounded">4242 4242 4242 4242</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scadenza:</span>
                <code className="bg-muted px-1 rounded">12/34</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CVC:</span>
                <code className="bg-muted px-1 rounded">123</code>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Carta Declined:</span>
                <code className="bg-muted px-1 rounded">4000 0000 0000 0002</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">3D Secure:</span>
                <code className="bg-muted px-1 rounded">4000 0027 6000 3184</code>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
