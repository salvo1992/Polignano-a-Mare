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
import { User, Calendar, Heart, Settings, Star, Bell, Shield, Edit, Camera } from "lucide-react"

// Mock user data
const mockUser = {
  name: "Marco Rossi",
  email: "marco.rossi@email.com",
  phone: "+39 333 1234567",
  address: "Via Roma 123, Milano",
  joinDate: "2023-06-15",
  totalBookings: 5,
  totalSpent: 1250,
  loyaltyPoints: 125,
  avatar: "/diverse-user-avatars.png",
}

const mockBookings = [
  {
    id: 1,
    room: "Suite Panoramica",
    checkIn: "2024-01-15",
    checkOut: "2024-01-18",
    guests: 2,
    status: "completed",
    total: 450,
    rating: 5,
  },
  {
    id: 2,
    room: "Camera Deluxe",
    checkIn: "2024-03-20",
    checkOut: "2024-03-22",
    guests: 1,
    status: "upcoming",
    total: 280,
    rating: null,
  },
  {
    id: 3,
    room: "Camera Romantica",
    checkIn: "2023-12-10",
    checkOut: "2023-12-13",
    guests: 2,
    status: "completed",
    total: 420,
    rating: 4,
  },
]

const mockFavorites = [
  {
    id: 1,
    name: "Suite Panoramica",
    image: "/luxury-hotel-suite.png",
    price: 150,
    description: "Vista mozzafiato sui Colli Romani",
  },
  {
    id: 2,
    name: "Camera Romantica",
    image: "/romantic-hotel-room.png",
    price: 140,
    description: "Perfetta per una fuga romantica",
  },
]

export default function UserPage() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState("profile")
  const [isEditing, setIsEditing] = useState(false)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500 hover:bg-green-600">Completato</Badge>
      case "upcoming":
        return <Badge className="bg-blue-500 hover:bg-blue-600">Prossimo</Badge>
      case "cancelled":
        return <Badge className="bg-red-500 hover:bg-red-600">Cancellato</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`h-4 w-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
    ))
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="pt-20 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8 animate-fade-in-up">
            <h1 className="text-4xl font-cinzel font-bold text-roman-gradient mb-2">Il Mio Account</h1>
            <p className="text-muted-foreground">Gestisci il tuo profilo e le tue prenotazioni</p>
          </div>

          <div className="grid lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <Card className="card-enhanced animate-slide-in-left">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <div className="relative inline-block">
                      <img
                        src={mockUser.avatar || "/placeholder.svg"}
                        alt="Avatar"
                        className="w-20 h-20 rounded-full mx-auto mb-3 border-4 border-primary/20"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute -bottom-1 -right-1 rounded-full w-8 h-8 p-0 bg-transparent"
                      >
                        <Camera className="h-3 w-3" />
                      </Button>
                    </div>
                    <h3 className="font-semibold text-lg">{mockUser.name}</h3>
                    <p className="text-sm text-muted-foreground">{mockUser.email}</p>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>Membro dal:</span>
                      <span className="font-medium">{mockUser.joinDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Soggiorni:</span>
                      <span className="font-medium">{mockUser.totalBookings}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Totale speso:</span>
                      <span className="font-medium">€{mockUser.totalSpent}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Punti fedeltà:</span>
                      <span className="font-medium text-primary">{mockUser.loyaltyPoints}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Profilo</span>
                  </TabsTrigger>
                  <TabsTrigger value="bookings" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="hidden sm:inline">Prenotazioni</span>
                  </TabsTrigger>
                  <TabsTrigger value="favorites" className="flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    <span className="hidden sm:inline">Preferiti</span>
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Impostazioni</span>
                  </TabsTrigger>
                </TabsList>

                {/* Profile Tab */}
                <TabsContent value="profile" className="space-y-6">
                  <Card className="card-enhanced animate-fade-in-up">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="font-cinzel text-primary">Informazioni Personali</CardTitle>
                        <CardDescription>Gestisci i tuoi dati personali</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(!isEditing)}
                        className="flex items-center gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        {isEditing ? "Annulla" : "Modifica"}
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Nome Completo</Label>
                          <Input id="name" defaultValue={mockUser.name} disabled={!isEditing} className="mt-1" />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            defaultValue={mockUser.email}
                            disabled={!isEditing}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="phone">Telefono</Label>
                          <Input id="phone" defaultValue={mockUser.phone} disabled={!isEditing} className="mt-1" />
                        </div>
                        <div>
                          <Label htmlFor="address">Indirizzo</Label>
                          <Input id="address" defaultValue={mockUser.address} disabled={!isEditing} className="mt-1" />
                        </div>
                      </div>
                      {isEditing && (
                        <div className="flex gap-2 pt-4">
                          <Button className="flex-1">Salva Modifiche</Button>
                          <Button variant="outline" onClick={() => setIsEditing(false)}>
                            Annulla
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Bookings Tab */}
                <TabsContent value="bookings" className="space-y-6">
                  <Card className="card-enhanced animate-fade-in-up">
                    <CardHeader>
                      <CardTitle className="font-cinzel text-primary">Le Mie Prenotazioni</CardTitle>
                      <CardDescription>Storico e prenotazioni future</CardDescription>
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
                                  <h3 className="font-semibold">{booking.room}</h3>
                                  {getStatusBadge(booking.status)}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {booking.checkIn} → {booking.checkOut}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {booking.guests} ospiti
                                  </span>
                                  <span className="font-semibold text-primary">€{booking.total}</span>
                                </div>
                                {booking.rating && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">La tua valutazione:</span>
                                    <div className="flex">{renderStars(booking.rating)}</div>
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2">
                                {booking.status === "upcoming" && (
                                  <>
                                    <Button size="sm" variant="outline">
                                      Modifica
                                    </Button>
                                    <Button size="sm" variant="outline">
                                      Cancella
                                    </Button>
                                  </>
                                )}
                                {booking.status === "completed" && !booking.rating && (
                                  <Button size="sm" variant="outline">
                                    Valuta
                                  </Button>
                                )}
                                <Button size="sm" variant="outline">
                                  Dettagli
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Favorites Tab */}
                <TabsContent value="favorites" className="space-y-6">
                  <Card className="card-enhanced animate-fade-in-up">
                    <CardHeader>
                      <CardTitle className="font-cinzel text-primary">Camere Preferite</CardTitle>
                      <CardDescription>Le tue camere salvate nei preferiti</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-6">
                        {mockFavorites.map((room) => (
                          <div
                            key={room.id}
                            className="border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                          >
                            <img
                              src={room.image || "/placeholder.svg"}
                              alt={room.name}
                              className="w-full h-48 object-cover"
                            />
                            <div className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold">{room.name}</h3>
                                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600">
                                  <Heart className="h-4 w-4 fill-current" />
                                </Button>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">{room.description}</p>
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-primary">€{room.price}/notte</span>
                                <Button size="sm">Prenota</Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings" className="space-y-6">
                  <div className="grid gap-6">
                    <Card className="card-enhanced animate-slide-in-left">
                      <CardHeader>
                        <CardTitle className="font-cinzel text-primary flex items-center gap-2">
                          <Bell className="h-5 w-5" />
                          Notifiche
                        </CardTitle>
                        <CardDescription>Gestisci le tue preferenze di notifica</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Email di conferma</p>
                            <p className="text-sm text-muted-foreground">Ricevi email per le prenotazioni</p>
                          </div>
                          <input type="checkbox" defaultChecked className="toggle" />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Offerte speciali</p>
                            <p className="text-sm text-muted-foreground">Ricevi promozioni e sconti</p>
                          </div>
                          <input type="checkbox" defaultChecked className="toggle" />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Promemoria check-in</p>
                            <p className="text-sm text-muted-foreground">Ricorda il check-in 24h prima</p>
                          </div>
                          <input type="checkbox" defaultChecked className="toggle" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="card-enhanced animate-slide-in-right">
                      <CardHeader>
                        <CardTitle className="font-cinzel text-primary flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          Privacy e Sicurezza
                        </CardTitle>
                        <CardDescription>Gestisci la sicurezza del tuo account</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Button variant="outline" className="w-full justify-start bg-transparent">
                          Cambia Password
                        </Button>
                        <Button variant="outline" className="w-full justify-start bg-transparent">
                          Autenticazione a Due Fattori
                        </Button>
                        <Button variant="outline" className="w-full justify-start bg-transparent">
                          Scarica i Miei Dati
                        </Button>
                        <Button variant="destructive" className="w-full justify-start">
                          Elimina Account
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
