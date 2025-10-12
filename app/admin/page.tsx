"use client"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Bed, BarChart3, Home, Settings, Users } from "lucide-react"
import { RequireAdmin } from "@/components/route-guards"
import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { collection, doc, getDocs, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore"

interface Booking { id: string; guestFirst: string; guestLast: string; email: string; phone: string; roomId: string; roomName: string; checkIn: string; checkOut: string; total: number; origin: "site"|"booking"; status: "pending"|"confirmed"|"cancelled" }
interface Room { id: string; name: string; status: "available"|"occupied"|"maintenance"; price: number; capacity: number }

export default function AdminPage(){
  return (
    <RequireAdmin>
      <AdminInner />
    </RequireAdmin>
  )
}

function AdminInner(){
  const [bookings, setBookings] = useState<Booking[]>([])
  const [rooms, setRooms] = useState<Room[]>([])

  useEffect(()=>{
    const qb = query(collection(db, "bookings"), orderBy("checkIn","desc"))
    const unsubB = onSnapshot(qb, (snap)=> setBookings(snap.docs.map(d=> ({id:d.id, ...d.data()} as any))))
    const unsubR = onSnapshot(collection(db, "rooms"), (snap)=> setRooms(snap.docs.map(d=> ({id:d.id, ...d.data()} as any))))
    return ()=>{unsubB();unsubR()}
  },[])

  const recent = bookings.slice(0, 5)

  const toggleMaintenance = async (roomId: string, on: boolean) => {
    await updateDoc(doc(db, "rooms", roomId), { status: on?"maintenance":"available" })
  }

  return (
    <main className="min-h-screen">
      <Header />
      <div className="pt-20 pb-16 container mx-auto px-4">
        <h1 className="text-4xl font-cinzel font-bold text-roman-gradient mb-6">Dashboard Amministratore</h1>
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4"/> Dashboard</TabsTrigger>
            <TabsTrigger value="bookings"><Calendar className="h-4 w-4"/> Prenotazioni</TabsTrigger>
            <TabsTrigger value="rooms"><Home className="h-4 w-4"/> Camere</TabsTrigger>
            <TabsTrigger value="guests"><Users className="h-4 w-4"/> Ospiti</TabsTrigger>
            <TabsTrigger value="settings"><Settings className="h-4 w-4"/> Impostazioni</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Prenotazioni Recenti</CardTitle></CardHeader><CardContent>
                <div className="space-y-3">
                  {recent.map(b=> (
                    <div key={b.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium">{b.guestFirst} {b.guestLast}</p>
                        <p className="text-xs text-muted-foreground">{b.roomName} • {b.checkIn} → {b.checkOut}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={b.origin==="booking"?"bg-blue-600":"bg-emerald-600"}>{b.origin==="booking"?"Booking":"Sito"}</Badge>
                        <p className="text-sm font-medium mt-1">€{b.total}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent></Card>

              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Stato Camere</CardTitle></CardHeader><CardContent>
                <div className="space-y-3">
                  {rooms.slice(0,2).map(r=> (
                    <div key={r.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.capacity} ospiti • €{r.price}/notte</p></div>
                      <div className="flex items-center gap-2">
                        <Badge variant={r.status==="available"?"secondary":"default"}>{r.status}</Badge>
                        <Button size="sm" variant="outline" onClick={()=>toggleMaintenance(r.id, r.status!=="maintenance")}>{r.status==="maintenance"?"Riattiva":"Manutenzione"}</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent></Card>

              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Prenotazioni da Booking</CardTitle></CardHeader><CardContent>
                {bookings.filter(b=>b.origin==="booking").slice(0,5).map(b=> (
                  <div key={b.id} className="flex items-center justify-between p-2 border rounded mb-2">
                    <span className="text-sm">{b.guestFirst} {b.guestLast} • {b.roomName}</span>
                    <Badge className="bg-blue-600">Booking</Badge>
                  </div>
                ))}
              </CardContent></Card>
            </div>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="font-cinzel text-primary">Tutte le Prenotazioni</CardTitle><CardDescription>Sito + Booking</CardDescription></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bookings.map(b=> (
                    <div key={b.id} className="grid md:grid-cols-5 items-center gap-2 p-3 border rounded">
                      <div className="font-medium">{b.guestFirst} {b.guestLast}</div>
                      <div className="text-sm text-muted-foreground">{b.email} • {b.phone}</div>
                      <div className="text-sm">{b.roomName}</div>
                      <div className="text-sm">{b.checkIn} → {b.checkOut}</div>
                      <div className="flex items-center justify-end gap-2"><Badge className={b.origin==="booking"?"bg-blue-600":"bg-emerald-600"}>{b.origin==="booking"?"Booking":"Sito"}</Badge><Badge>€{b.total}</Badge></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rooms" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="font-cinzel text-primary">Registro Camere</CardTitle></CardHeader>
              <CardContent>
                {rooms.map(r=> (
                  <div key={r.id} className="flex items-center justify-between border rounded p-3 mb-2">
                    <div>
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.capacity} ospiti • €{r.price}/notte</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{r.status}</Badge>
                      <Button size="sm" variant="outline" onClick={()=>toggleMaintenance(r.id, r.status!=="maintenance")}>{r.status==="maintenance"?"Riattiva":"Manutenzione"}</Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guests" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="font-cinzel text-primary">Ospiti</CardTitle><CardDescription>Elenco ospiti con ultime prenotazioni</CardDescription></CardHeader>
              <CardContent>
                {/* Query su users + join lato client con bookings se serve */}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="font-cinzel text-primary">Impostazioni B&B</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="block text-sm mb-1">Nome (fisso)</label>
                  <input className="w-full px-3 py-2 border rounded" value="AL 22 Suite & SPA LUXURY EXPERIENCE" disabled />
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div><label className="block text-sm mb-1">Indirizzo</label><input className="w-full px-3 py-2 border rounded" placeholder="Via..."/></div>
                  <div><label className="block text-sm mb-1">Telefono</label><input className="w-full px-3 py-2 border rounded" placeholder="+39..."/></div>
                </div>
                <div><label className="block text-sm mb-1">Email</label><input className="w-full px-3 py-2 border rounded" placeholder="info@..."/></div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div><label className="block text-sm mb-1">Check-in</label><input type="time" className="w-full px-3 py-2 border rounded" defaultValue="15:00"/></div>
                  <div><label className="block text-sm mb-1">Check-out</label><input type="time" className="w-full px-3 py-2 border rounded" defaultValue="11:00"/></div>
                </div>
                <div><label className="block text-sm mb-1">Politica di Cancellazione</label>
                  <select className="w-full px-3 py-2 border rounded">
                    <option>Cancellazione gratuita fino a 24h</option>
                    <option>Cancellazione gratuita fino a 48h</option>
                    <option>Cancellazione gratuita fino a 7 giorni</option>
                    <option>Non rimborsabile</option>
                  </select>
                </div>
                <Button>Salva impostazioni</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </main>
  )
}