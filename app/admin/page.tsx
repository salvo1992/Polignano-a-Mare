"use client"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, BarChart3, Home, Settings, Users } from "lucide-react"
import { RequireAdmin } from "@/components/route-guards"
import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, orderBy, query } from "firebase/firestore"
import { useLanguage } from "@/components/language-provider"
import { BookingCalendar } from "@/components/booking-calendar"
import { RoomStatusToggle } from "@/components/room-status-toggle"
import { GuestsTracking } from "@/components/guests-tracking"
import { PriceManagement } from "@/components/price-management"
import type { Booking, Room } from "@/lib/booking-utils"

export default function AdminPage() {
  return (
    <RequireAdmin>
      <AdminInner />
    </RequireAdmin>
  )
}

function AdminInner() {
  const { t } = useLanguage()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [rooms, setRooms] = useState<Room[]>([])

  useEffect(() => {
    let unsubB: (() => void) | null = null
    let unsubR: (() => void) | null = null

    try {
      const qb = query(collection(db, "bookings"), orderBy("checkIn", "desc"))
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

  const recent = bookings.slice(0, 5)
  const bookingComBookings = bookings.filter((b) => b.origin === "booking")
  const airbnbBookings = bookings.filter((b) => b.origin === "airbnb")
  const siteBookings = bookings.filter((b) => b.origin === "site")

  return (
    <main className="min-h-screen">
      <Header />
      <div className="pt-20 pb-16 container mx-auto px-4">
        <h1 className="text-4xl font-cinzel font-bold text-roman-gradient mb-6">{t("adminDashboard")}</h1>
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">
              <BarChart3 className="h-4 w-4 mr-2" /> {t("dashboard")}
            </TabsTrigger>
            <TabsTrigger value="bookings">
              <Calendar className="h-4 w-4 mr-2" /> {t("bookings")}
            </TabsTrigger>
            <TabsTrigger value="rooms">
              <Home className="h-4 w-4 mr-2" /> {t("rooms")}
            </TabsTrigger>
            <TabsTrigger value="guests">
              <Users className="h-4 w-4 mr-2" /> {t("guests")}
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" /> {t("settings")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t("totalBookings")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{bookings.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">{t("allSources")}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge className="bg-blue-600">Booking.com</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{bookingComBookings.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">{t("fromBooking")}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge className="bg-pink-600">Airbnb</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{airbnbBookings.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">{t("fromAirbnb")}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge className="bg-emerald-600">{t("site")}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{siteBookings.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">{t("fromSite")}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("recentBookings")}</CardTitle>
                  <CardDescription>{t("last5Bookings")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recent.map((b) => (
                      <div key={b.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div>
                          <p className="font-medium">
                            {b.guestFirst} {b.guestLast}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {b.roomName} • {b.checkIn} → {b.checkOut}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge
                            className={
                              b.origin === "booking"
                                ? "bg-blue-600"
                                : b.origin === "airbnb"
                                  ? "bg-pink-600"
                                  : "bg-emerald-600"
                            }
                          >
                            {b.origin}
                          </Badge>
                          <p className="text-sm font-medium mt-1">€{b.total}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("roomStatus")}</CardTitle>
                  <CardDescription>{t("currentRoomStatus")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {rooms.map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div>
                          <p className="font-medium">{r.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.capacity} {t("guests")} • €{r.price}/{t("night")}
                          </p>
                        </div>
                        <Badge
                          className={
                            r.status === "available"
                              ? "bg-green-600"
                              : r.status === "booked"
                                ? "bg-red-600"
                                : "bg-yellow-600"
                          }
                        >
                          {t(r.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            <BookingCalendar />

            <Card>
              <CardHeader>
                <CardTitle className="font-cinzel text-primary">{t("allBookings")}</CardTitle>
                <CardDescription>{t("manageAllBookings")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="all">{t("all")}</TabsTrigger>
                    <TabsTrigger value="booking">Booking.com ({bookingComBookings.length})</TabsTrigger>
                    <TabsTrigger value="airbnb">Airbnb ({airbnbBookings.length})</TabsTrigger>
                    <TabsTrigger value="site">
                      {t("site")} ({siteBookings.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="space-y-3">
                    {bookings.map((b) => (
                      <div key={b.id} className="grid md:grid-cols-5 items-center gap-2 p-3 border rounded">
                        <div className="font-medium">
                          {b.guestFirst} {b.guestLast}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {b.email} • {b.phone}
                        </div>
                        <div className="text-sm">{b.roomName}</div>
                        <div className="text-sm">
                          {b.checkIn} → {b.checkOut}
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Badge
                            className={
                              b.origin === "booking"
                                ? "bg-blue-600"
                                : b.origin === "airbnb"
                                  ? "bg-pink-600"
                                  : "bg-emerald-600"
                            }
                          >
                            {b.origin}
                          </Badge>
                          <Badge>€{b.total}</Badge>
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="booking" className="space-y-3">
                    {bookingComBookings.map((b) => (
                      <div key={b.id} className="grid md:grid-cols-5 items-center gap-2 p-3 border rounded">
                        <div className="font-medium">
                          {b.guestFirst} {b.guestLast}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {b.email} • {b.phone}
                        </div>
                        <div className="text-sm">{b.roomName}</div>
                        <div className="text-sm">
                          {b.checkIn} → {b.checkOut}
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Badge className="bg-blue-600">Booking.com</Badge>
                          <Badge>€{b.total}</Badge>
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="airbnb" className="space-y-3">
                    {airbnbBookings.map((b) => (
                      <div key={b.id} className="grid md:grid-cols-5 items-center gap-2 p-3 border rounded">
                        <div className="font-medium">
                          {b.guestFirst} {b.guestLast}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {b.email} • {b.phone}
                        </div>
                        <div className="text-sm">{b.roomName}</div>
                        <div className="text-sm">
                          {b.checkIn} → {b.checkOut}
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Badge className="bg-pink-600">Airbnb</Badge>
                          <Badge>€{b.total}</Badge>
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="site" className="space-y-3">
                    {siteBookings.map((b) => (
                      <div key={b.id} className="grid md:grid-cols-5 items-center gap-2 p-3 border rounded">
                        <div className="font-medium">
                          {b.guestFirst} {b.guestLast}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {b.email} • {b.phone}
                        </div>
                        <div className="text-sm">{b.roomName}</div>
                        <div className="text-sm">
                          {b.checkIn} → {b.checkOut}
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Badge className="bg-emerald-600">{t("site")}</Badge>
                          <Badge>€{b.total}</Badge>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rooms" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rooms.map((room) => (
                <RoomStatusToggle key={room.id} room={room} />
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="font-cinzel text-primary">{t("roomCalendar")}</CardTitle>
                <CardDescription>{t("viewRoomBookings")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={rooms[0]?.id} className="space-y-4">
                  <TabsList>
                    {rooms.map((room) => (
                      <TabsTrigger key={room.id} value={room.id}>
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

          <TabsContent value="guests" className="space-y-6">
            <GuestsTracking />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-cinzel text-primary">{t("roomPriceManagement")}</CardTitle>
                <CardDescription>{t("updateRoomPrices")}</CardDescription>
              </CardHeader>
              <CardContent>
                <PriceManagement />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-cinzel text-primary">{t("bnbSettings")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="block text-sm mb-1">{t("nameFixed")}</label>
                  <input
                    className="w-full px-3 py-2 border rounded"
                    value="AL 22 Suite & SPA LUXURY EXPERIENCE"
                    disabled
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm mb-1">{t("address")}</label>
                    <input className="w-full px-3 py-2 border rounded" placeholder="Via..." />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">{t("phone")}</label>
                    <input className="w-full px-3 py-2 border rounded" placeholder="+39..." />
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-1">{t("email")}</label>
                  <input className="w-full px-3 py-2 border rounded" placeholder="info@..." />
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm mb-1">{t("checkIn")}</label>
                    <input type="time" className="w-full px-3 py-2 border rounded" defaultValue="15:00" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">{t("checkOut")}</label>
                    <input type="time" className="w-full px-3 py-2 border rounded" defaultValue="11:00" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-1">{t("cancellationPolicy")}</label>
                  <select className="w-full px-3 py-2 border rounded">
                    <option>{t("freeCancellation24h")}</option>
                    <option>{t("freeCancellation48h")}</option>
                    <option>{t("freeCancellation7days")}</option>
                    <option>{t("nonRefundable")}</option>
                  </select>
                </div>
                <Button>{t("saveSettings")}</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </main>
  )
}
