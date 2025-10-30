"use client"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, BarChart3, Home, Settings, Users, Clock } from "lucide-react"
import { RequireAdmin } from "@/components/route-guards"
import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, orderBy, query, doc, setDoc, getDoc } from "firebase/firestore"
import { BookingCalendar } from "@/components/booking-calendar"
import { RoomStatusToggle } from "@/components/room-status-toggle"
import { GuestsTracking } from "@/components/guests-tracking"
import { PriceManagement } from "@/components/price-management"
import { Beds24SyncPanel } from "@/components/beds24-sync-panel"
import { Beds24ReviewsSync } from "@/components/beds24-reviews-sync"
import { BookingBlockDates } from "@/components/booking-block-dates"
import type { Booking, Room } from "@/lib/booking-utils"

interface BnBSettings {
  checkInTime: string
  checkOutTime: string
  cancellationPolicy: string
}

export default function AdminPage() {
  return (
    <RequireAdmin>
      <AdminInner />
    </RequireAdmin>
  )
}

function AdminInner() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [bnbSettings, setBnbSettings] = useState<BnBSettings>({
    checkInTime: "15:00",
    checkOutTime: "11:00",
    cancellationPolicy: "free24h",
  })
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    let unsubB: (() => void) | null = null
    let unsubR: (() => void) | null = null

    try {
      const qb = query(collection(db, "bookings"), orderBy("checkIn", "asc"))
      unsubB = onSnapshot(
        qb,
        (snap) => setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as any)),
        (error) => {
          console.error("[v0] Error fetching bookings:", error)
        },
      )

      unsubR = onSnapshot(
        collection(db, "rooms"),
        (snap) => setRooms(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as any)),
        (error) => {
          console.error("[v0] Error fetching rooms:", error)
        },
      )
    } catch (error) {
      console.error("[v0] Error setting up Firestore listeners:", error)
    }

    return () => {
      if (unsubB) {
        try {
          unsubB()
        } catch (error) {
          console.error("[v0] Error unsubscribing from bookings:", error)
        }
      }
      if (unsubR) {
        try {
          unsubR()
        } catch (error) {
          console.error("[v0] Error unsubscribing from rooms:", error)
        }
      }
    }
  }, [])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, "settings", "bnb"))
        if (settingsDoc.exists()) {
          setBnbSettings(settingsDoc.data() as BnBSettings)
        }
      } catch (error) {
        console.error("[v0] Error loading settings:", error)
      }
    }
    loadSettings()
  }, [])

  const today = new Date().toISOString().split("T")[0]
  const currentAndUpcoming = bookings.filter((b) => b.checkOut >= today)
  const recent = currentAndUpcoming.slice(0, 5)
  const bookingComBookings = currentAndUpcoming.filter((b) => b.origin === "booking")
  const airbnbBookings = currentAndUpcoming.filter((b) => b.origin === "airbnb")
  const siteBookings = currentAndUpcoming.filter((b) => b.origin === "site")

  const saveSettings = async () => {
    setSavingSettings(true)
    try {
      await setDoc(doc(db, "settings", "bnb"), bnbSettings)
      alert("Impostazioni salvate con successo!")
    } catch (error) {
      console.error("[v0] Error saving settings:", error)
      alert("Errore nel salvataggio delle impostazioni")
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-cinzel font-bold text-roman-gradient mb-4 sm:mb-6">
            Pannello Amministratore
          </h1>
          <Tabs defaultValue="dashboard" className="space-y-4 sm:space-y-6">
            <TabsList className="grid w-full grid-cols-5 h-auto gap-1 p-1">
              <TabsTrigger value="dashboard" className="flex-col sm:flex-row gap-1 py-2 text-xs sm:text-sm">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="bookings" className="flex-col sm:flex-row gap-1 py-2 text-xs sm:text-sm">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Prenotazioni</span>
              </TabsTrigger>
              <TabsTrigger value="rooms" className="flex-col sm:flex-row gap-1 py-2 text-xs sm:text-sm">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Camere</span>
              </TabsTrigger>
              <TabsTrigger value="guests" className="flex-col sm:flex-row gap-1 py-2 text-xs sm:text-sm">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Ospiti</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-col sm:flex-row gap-1 py-2 text-xs sm:text-sm">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Impostazioni</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Prenotazioni Totali</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{currentAndUpcoming.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">Correnti e future</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Badge className="bg-blue-600 text-xs">Booking.com</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{bookingComBookings.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">Da Booking.com</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Badge className="bg-pink-600 text-xs">Airbnb</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{airbnbBookings.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">Da Airbnb</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Badge className="bg-emerald-600 text-xs">Sito Web</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{siteBookings.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">Dal sito web</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Prenotazioni Recenti</CardTitle>
                    <CardDescription>Ultime 5 prenotazioni correnti/future</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recent.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nessuna prenotazione corrente o futura</p>
                      ) : (
                        recent.map((b) => (
                          <div
                            key={b.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/30 rounded-lg"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {b.guestFirst} {b.guestLast}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {b.roomName} • {b.checkIn} → {b.checkOut}
                              </p>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end sm:flex-col sm:items-end gap-2">
                              <Badge
                                className={
                                  b.origin === "booking"
                                    ? "bg-blue-600 text-xs"
                                    : b.origin === "airbnb"
                                      ? "bg-pink-600 text-xs"
                                      : "bg-emerald-600 text-xs"
                                }
                              >
                                {b.origin}
                              </Badge>
                              <p className="text-sm font-medium">€{b.total}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Stato Camere</CardTitle>
                    <CardDescription>Stato attuale delle camere</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {rooms.map((r) => (
                        <div
                          key={r.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/30 rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{r.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {r.capacity} ospiti • €{r.price}/notte
                            </p>
                          </div>
                          <Badge
                            className={
                              r.status === "available"
                                ? "bg-green-600 text-xs"
                                : r.status === "booked"
                                  ? "bg-red-600 text-xs"
                                  : "bg-yellow-600 text-xs"
                            }
                          >
                            {r.status === "available"
                              ? "Disponibile"
                              : r.status === "booked"
                                ? "Prenotata"
                                : "Manutenzione"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="bookings" className="space-y-4 sm:space-y-6">
              <BookingCalendar />

              <Card>
                <CardHeader>
                  <CardTitle className="font-cinzel text-primary">Tutte le Prenotazioni</CardTitle>
                  <CardDescription>Gestisci tutte le prenotazioni correnti e future</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="all" className="space-y-4">
                    <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
                      <TabsTrigger value="all" className="whitespace-nowrap">
                        Tutte ({currentAndUpcoming.length})
                      </TabsTrigger>
                      <TabsTrigger value="booking" className="whitespace-nowrap">
                        Booking.com ({bookingComBookings.length})
                      </TabsTrigger>
                      <TabsTrigger value="airbnb" className="whitespace-nowrap">
                        Airbnb ({airbnbBookings.length})
                      </TabsTrigger>
                      <TabsTrigger value="site" className="whitespace-nowrap">
                        Sito Web ({siteBookings.length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="space-y-3">
                      {currentAndUpcoming.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nessuna prenotazione corrente o futura</p>
                      ) : (
                        currentAndUpcoming.map((b) => (
                          <div
                            key={b.id}
                            className="flex flex-col gap-2 p-3 sm:p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {b.guestFirst} {b.guestLast}
                                </p>
                                <p className="text-sm text-muted-foreground truncate">
                                  {b.email} • {b.phone}
                                </p>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <Badge
                                  className={
                                    b.origin === "booking"
                                      ? "bg-blue-600 text-xs"
                                      : b.origin === "airbnb"
                                        ? "bg-pink-600 text-xs"
                                        : "bg-emerald-600 text-xs"
                                  }
                                >
                                  {b.origin}
                                </Badge>
                                <Badge className="text-xs">€{b.total}</Badge>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-muted-foreground">
                              <span className="truncate">{b.roomName}</span>
                              <span className="text-xs sm:text-sm">
                                {b.checkIn} → {b.checkOut}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </TabsContent>

                    <TabsContent value="booking" className="space-y-3">
                      {bookingComBookings.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nessuna prenotazione da Booking.com</p>
                      ) : (
                        bookingComBookings.map((b) => (
                          <div
                            key={b.id}
                            className="flex flex-col gap-2 p-3 sm:p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {b.guestFirst} {b.guestLast}
                                </p>
                                <p className="text-sm text-muted-foreground truncate">
                                  {b.email} • {b.phone}
                                </p>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <Badge className="bg-blue-600 text-xs">Booking.com</Badge>
                                <Badge className="text-xs">€{b.total}</Badge>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-muted-foreground">
                              <span className="truncate">{b.roomName}</span>
                              <span className="text-xs sm:text-sm">
                                {b.checkIn} → {b.checkOut}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </TabsContent>

                    <TabsContent value="airbnb" className="space-y-3">
                      {airbnbBookings.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nessuna prenotazione da Airbnb</p>
                      ) : (
                        airbnbBookings.map((b) => (
                          <div
                            key={b.id}
                            className="flex flex-col gap-2 p-3 sm:p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {b.guestFirst} {b.guestLast}
                                </p>
                                <p className="text-sm text-muted-foreground truncate">
                                  {b.email} • {b.phone}
                                </p>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <Badge className="bg-pink-600 text-xs">Airbnb</Badge>
                                <Badge className="text-xs">€{b.total}</Badge>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-muted-foreground">
                              <span className="truncate">{b.roomName}</span>
                              <span className="text-xs sm:text-sm">
                                {b.checkIn} → {b.checkOut}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </TabsContent>

                    <TabsContent value="site" className="space-y-3">
                      {siteBookings.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nessuna prenotazione dal sito web</p>
                      ) : (
                        siteBookings.map((b) => (
                          <div
                            key={b.id}
                            className="flex flex-col gap-2 p-3 sm:p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {b.guestFirst} {b.guestLast}
                                </p>
                                <p className="text-sm text-muted-foreground truncate">
                                  {b.email} • {b.phone}
                                </p>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <Badge className="bg-emerald-600 text-xs">Sito Web</Badge>
                                <Badge className="text-xs">€{b.total}</Badge>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-muted-foreground">
                              <span className="truncate">{b.roomName}</span>
                              <span className="text-xs sm:text-sm">
                                {b.checkIn} → {b.checkOut}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rooms" className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {rooms.map((room) => (
                  <RoomStatusToggle key={room.id} room={room} />
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="font-cinzel text-primary">Calendario Camere</CardTitle>
                  <CardDescription>Visualizza le prenotazioni per camera</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue={rooms[0]?.id} className="space-y-4">
                    <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
                      {rooms.map((room) => (
                        <TabsTrigger key={room.id} value={room.id} className="whitespace-nowrap">
                          {room.name}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {rooms.map((room) => (
                      <TabsContent key={room.id} value={room.id}>
                        <BookingCalendar roomId={room.id} />
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="guests" className="space-y-4 sm:space-y-6">
              <GuestsTracking />
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <Beds24SyncPanel />
                <Beds24ReviewsSync />
              </div>

              <BookingBlockDates />

              <Card>
                <CardHeader>
                  <CardTitle className="font-cinzel text-primary">Gestione Prezzi Camere</CardTitle>
                  <CardDescription>Aggiorna i prezzi delle camere</CardDescription>
                </CardHeader>
                <CardContent>
                  <PriceManagement />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-cinzel text-primary">Impostazioni B&B</CardTitle>
                  <CardDescription>Configura le impostazioni dinamiche del B&B</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4 pb-6 border-b">
                    <h3 className="text-sm font-semibold text-muted-foreground">Informazioni Fisse</h3>
                    <div>
                      <Label className="text-muted-foreground">Nome (fisso)</Label>
                      <Input
                        className="mt-2 bg-muted/50 cursor-not-allowed"
                        value="AL 22 Suite & SPA LUXURY EXPERIENCE"
                        disabled
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Indirizzo</Label>
                        <Input className="mt-2 bg-muted/50 cursor-not-allowed" value="Vico Gelso I n 22" disabled />
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Telefono</Label>
                        <Input className="mt-2 bg-muted/50 cursor-not-allowed" value="+39 375 701 7689" disabled />
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <Input className="mt-2 bg-muted/50 cursor-not-allowed" value="progetlocale@gmail.com" disabled />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-primary">Impostazioni Dinamiche</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="checkIn">
                          <Clock className="w-4 h-4 inline mr-2" />
                          Check-in
                        </Label>
                        <Input
                          id="checkIn"
                          type="time"
                          className="mt-2"
                          value={bnbSettings.checkInTime}
                          onChange={(e) => setBnbSettings({ ...bnbSettings, checkInTime: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="checkOut">
                          <Clock className="w-4 h-4 inline mr-2" />
                          Check-out
                        </Label>
                        <Input
                          id="checkOut"
                          type="time"
                          className="mt-2"
                          value={bnbSettings.checkOutTime}
                          onChange={(e) => setBnbSettings({ ...bnbSettings, checkOutTime: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="cancellation">Politica di Cancellazione</Label>
                      <Select
                        value={bnbSettings.cancellationPolicy}
                        onValueChange={(value) => setBnbSettings({ ...bnbSettings, cancellationPolicy: value })}
                      >
                        <SelectTrigger id="cancellation" className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free24h">Cancellazione gratuita fino a 24h</SelectItem>
                          <SelectItem value="free48h">Cancellazione gratuita fino a 48h</SelectItem>
                          <SelectItem value="free7days">Cancellazione gratuita fino a 7 giorni</SelectItem>
                          <SelectItem value="nonRefundable">Non rimborsabile</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={saveSettings} disabled={savingSettings} className="w-full sm:w-auto">
                      {savingSettings ? "Salvataggio..." : "Salva Impostazioni"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </main>
  )
}
