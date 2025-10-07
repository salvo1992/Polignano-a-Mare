"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/components/language-provider"
import {
  Calendar,
  Users,
  Home,
  Settings,
  BarChart3,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Euro,
  TrendingUp,
  Bed,
} from "lucide-react"

// Mock data for demonstration
const mockBookings = [
  {
    id: 1,
    guest: "Marco Rossi",
    email: "marco.rossi@email.com",
    phone: "+39 333 1234567",
    room: "Suite Panoramica",
    checkIn: "2024-01-15",
    checkOut: "2024-01-18",
    guests: 2,
    status: "confirmed",
    total: 450,
  },
  {
    id: 2,
    guest: "Anna Bianchi",
    email: "anna.bianchi@email.com",
    phone: "+39 347 9876543",
    room: "Camera Deluxe",
    checkIn: "2024-01-20",
    checkOut: "2024-01-22",
    guests: 1,
    status: "pending",
    total: 280,
  },
  {
    id: 3,
    guest: "Giuseppe Verdi",
    email: "g.verdi@email.com",
    phone: "+39 320 5555555",
    room: "Camera Familiare",
    checkIn: "2024-01-25",
    checkOut: "2024-01-28",
    guests: 4,
    status: "cancelled",
    total: 540,
  },
]

const mockRooms = [
  {
    id: 1,
    name: "Suite Panoramica",
    type: "Suite",
    capacity: 2,
    price: 150,
    status: "available",
    amenities: ["Wifi", "Balcone", "Minibar", "TV"],
    bookings: 12,
  },
  {
    id: 2,
    name: "Camera Deluxe",
    type: "Deluxe",
    capacity: 2,
    price: 120,
    status: "occupied",
    amenities: ["Wifi", "TV", "Minibar"],
    bookings: 18,
  },
  {
    id: 3,
    name: "Camera Familiare",
    type: "Family",
    capacity: 4,
    price: 180,
    status: "maintenance",
    amenities: ["Wifi", "TV", "Cucina", "Balcone"],
    bookings: 8,
  },
  {
    id: 4,
    name: "Camera Romantica",
    type: "Romantic",
    capacity: 2,
    price: 140,
    status: "available",
    amenities: ["Wifi", "Jacuzzi", "Balcone", "Champagne"],
    bookings: 15,
  },
]

export default function AdminPage() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState("dashboard")

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-500 hover:bg-green-600">Confermata</Badge>
      case "pending":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">In Attesa</Badge>
      case "cancelled":
        return <Badge className="bg-red-500 hover:bg-red-600">Cancellata</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getRoomStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-500 hover:bg-green-600">Disponibile</Badge>
      case "occupied":
        return <Badge className="bg-blue-500 hover:bg-blue-600">Occupata</Badge>
      case "maintenance":
        return <Badge className="bg-orange-500 hover:bg-orange-600">Manutenzione</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="pt-20 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8 animate-fade-in-up">
            <h1 className="text-4xl font-cinzel font-bold text-roman-gradient mb-2">Dashboard Amministratore</h1>
            <p className="text-muted-foreground">Gestisci il tuo B&B da un unico pannello di controllo</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:grid-cols-5">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="bookings" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Prenotazioni</span>
              </TabsTrigger>
              <TabsTrigger value="rooms" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Camere</span>
              </TabsTrigger>
              <TabsTrigger value="guests" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Ospiti</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Impostazioni</span>
              </TabsTrigger>
            </TabsList>

            {/* Dashboard Overview */}
            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="card-invisible animate-bounce-in">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Prenotazioni Oggi</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">12</div>
                    <p className="text-xs text-muted-foreground">+2 rispetto a ieri</p>
                  </CardContent>
                </Card>

                <Card className="card-invisible animate-bounce-in" style={{ animationDelay: "0.1s" }}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Camere Occupate</CardTitle>
                    <Bed className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">8/12</div>
                    <p className="text-xs text-muted-foreground">67% occupazione</p>
                  </CardContent>
                </Card>

                <Card className="card-invisible animate-bounce-in" style={{ animationDelay: "0.2s" }}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ricavi Mensili</CardTitle>
                    <Euro className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">€15,240</div>
                    <p className="text-xs text-muted-foreground">+12% vs mese scorso</p>
                  </CardContent>
                </Card>

                <Card className="card-invisible animate-bounce-in" style={{ animationDelay: "0.3s" }}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Valutazione Media</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">4.8/5</div>
                    <p className="text-xs text-muted-foreground">Basato su 127 recensioni</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="card-invisible animate-slide-in-left">
                  <CardHeader>
                    <CardTitle className="font-cinzel text-primary">Prenotazioni Recenti</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mockBookings.slice(0, 3).map((booking) => (
                        <div key={booking.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div>
                            <p className="font-medium">{booking.guest}</p>
                            <p className="text-sm text-muted-foreground">{booking.room}</p>
                            <p className="text-xs text-muted-foreground">
                              {booking.checkIn} - {booking.checkOut}
                            </p>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(booking.status)}
                            <p className="text-sm font-medium mt-1">€{booking.total}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-invisible animate-slide-in-right">
                  <CardHeader>
                    <CardTitle className="font-cinzel text-primary">Stato Camere</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mockRooms.map((room) => (
                        <div key={room.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div>
                            <p className="font-medium">{room.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {room.capacity} ospiti • €{room.price}/notte
                            </p>
                          </div>
                          <div className="text-right">
                            {getRoomStatusBadge(room.status)}
                            <p className="text-xs text-muted-foreground mt-1">{room.bookings} prenotazioni</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Bookings Management */}
            <TabsContent value="bookings" className="space-y-6">
              <Card className="card-invisible animate-fade-in-up">
                <CardHeader>
                  <CardTitle className="font-cinzel text-primary">Gestione Prenotazioni</CardTitle>
                  <CardDescription>Visualizza e gestisci tutte le prenotazioni</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold">{booking.guest}</h3>
                              {getStatusBadge(booking.status)}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {booking.email}
                              </div>
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {booking.phone}
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {booking.guests} ospiti
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="font-medium">{booking.room}</span>
                              <span className="text-muted-foreground">
                                {booking.checkIn} → {booking.checkOut}
                              </span>
                              <span className="font-semibold text-primary">€{booking.total}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Conferma
                            </Button>
                            <Button size="sm" variant="outline">
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancella
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Rooms Management */}
            <TabsContent value="rooms" className="space-y-6">
              <Card className="card-invisible animate-fade-in-up">
                <CardHeader>
                  <CardTitle className="font-cinzel text-primary">Gestione Camere</CardTitle>
                  <CardDescription>Monitora lo stato e le prenotazioni delle camere</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    {mockRooms.map((room) => (
                      <div
                        key={room.id}
                        className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">{room.name}</h3>
                            <p className="text-sm text-muted-foreground">{room.type}</p>
                          </div>
                          {getRoomStatusBadge(room.status)}
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span>Capacità:</span>
                            <span>{room.capacity} ospiti</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Prezzo:</span>
                            <span className="font-semibold">€{room.price}/notte</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Prenotazioni totali:</span>
                            <span>{room.bookings}</span>
                          </div>
                        </div>

                        <div className="mb-4">
                          <p className="text-sm font-medium mb-2">Servizi:</p>
                          <div className="flex flex-wrap gap-1">
                            {room.amenities.map((amenity, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {amenity}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                            Modifica
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                            Calendario
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Guests Management */}
            <TabsContent value="guests" className="space-y-6">
              <Card className="card-invisible animate-fade-in-up">
                <CardHeader>
                  <CardTitle className="font-cinzel text-primary">Gestione Ospiti</CardTitle>
                  <CardDescription>Database degli ospiti e storico soggiorni</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <h3 className="font-semibold">{booking.guest}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {booking.email}
                              </span>
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {booking.phone}
                              </span>
                            </div>
                            <p className="text-sm">
                              Ultimo soggiorno: {booking.checkIn} - {booking.checkOut} ({booking.room})
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">Totale speso: €{booking.total}</p>
                            <p className="text-xs text-muted-foreground">1 soggiorno</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings */}
            <TabsContent value="settings" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="card-invisible animate-slide-in-left">
                  <CardHeader>
                    <CardTitle className="font-cinzel text-primary">Impostazioni B&B</CardTitle>
                    <CardDescription>Configura le informazioni del tuo B&B</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="bb-name">Nome B&B</Label>
                      <Input id="bb-name" defaultValue="Villa Bella Vista" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="bb-address">Indirizzo</Label>
                      <Input id="bb-address" defaultValue="Via dei Colli Romani, 123, Roma" className="mt-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="bb-phone">Telefono</Label>
                        <Input id="bb-phone" defaultValue="+39 06 1234 5678" className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="bb-email">Email</Label>
                        <Input id="bb-email" defaultValue="info@villabellavista.it" className="mt-1" />
                      </div>
                    </div>
                    <Button className="w-full">Salva Modifiche</Button>
                  </CardContent>
                </Card>

                <Card className="card-invisible animate-slide-in-right">
                  <CardHeader>
                    <CardTitle className="font-cinzel text-primary">Orari e Politiche</CardTitle>
                    <CardDescription>Gestisci orari di check-in/out e politiche</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="checkin-time">Check-in</Label>
                        <Input id="checkin-time" type="time" defaultValue="15:00" className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="checkout-time">Check-out</Label>
                        <Input id="checkout-time" type="time" defaultValue="11:00" className="mt-1" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="cancellation-policy">Politica di Cancellazione</Label>
                      <select
                        id="cancellation-policy"
                        className="mt-1 w-full px-3 py-2 border border-input rounded-md bg-background"
                      >
                        <option>Cancellazione gratuita fino a 24h prima</option>
                        <option>Cancellazione gratuita fino a 48h prima</option>
                        <option>Cancellazione gratuita fino a 7 giorni prima</option>
                        <option>Non rimborsabile</option>
                      </select>
                    </div>
                    <Button className="w-full">Aggiorna Politiche</Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Footer />
    </main>
  )
}
