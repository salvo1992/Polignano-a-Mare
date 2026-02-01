"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users, DollarSign, TrendingUp } from 'lucide-react'

interface Booking {
  id: string
  customerName: string
  customerEmail: string
  roomId: string
  checkIn: string
  checkOut: string
  status: string
  totalAmount: number
  services?: string[]
  createdAt: string
}

interface AdminDashboardProps {
  bookings: Booking[]
}

export default function AdminDashboard({ bookings }: AdminDashboardProps) {
  const activeBookings = bookings.filter(b => b.status === 'confirmed').length
  const totalRevenue = bookings
    .filter(b => b.status === 'confirmed')
    .reduce((sum, b) => sum + b.totalAmount, 0)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prenotazioni Attive</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeBookings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Prenotazioni</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookings.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ricavi Totali</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasso Occupazione</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bookings.length > 0 ? Math.round((activeBookings / bookings.length) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prenotazioni Recenti</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {bookings.slice(0, 5).map((booking) => (
              <div key={booking.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                <div className="space-y-1">
                  <p className="font-medium">{booking.customerName}</p>
                  <p className="text-sm text-muted-foreground">{booking.customerEmail}</p>
                  <p className="text-sm">
                    {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}
                  </p>
                  {booking.services && booking.services.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {booking.services.map((service, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {(!booking.services || booking.services.length === 0) && (
                    <p className="text-xs text-muted-foreground italic">Senza servizi aggiuntivi</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold">€{booking.totalAmount.toFixed(2)}</p>
                  <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                    {booking.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
