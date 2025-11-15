"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Home, Wrench, CheckCircle, Lock } from 'lucide-react'
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import type { Room } from "@/lib/booking-utils"

interface RoomStatusToggleProps {
  room: Room
}

export function RoomStatusToggle({ room }: RoomStatusToggleProps) {
  const [currentStatus, setCurrentStatus] = useState<"available" | "booked" | "maintenance">(room.status)
  const [hasActiveBooking, setHasActiveBooking] = useState(false)

  useEffect(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split("T")[0]

    const q = query(
      collection(db, "bookings"),
      where("roomId", "==", room.id),
      where("status", "in", ["confirmed", "pending"]),
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookings = snapshot.docs.map((doc) => doc.data())

      // Check if any booking includes today
      const activeBooking = bookings.some((booking) => {
        const checkIn = new Date(booking.checkIn as string)
        const checkOut = new Date(booking.checkOut as string)
        return today >= checkIn && today <= checkOut
      })

      setHasActiveBooking(activeBooking)

      if (activeBooking) {
        setCurrentStatus("booked")
      } else if (room.status === "maintenance") {
        setCurrentStatus("maintenance")
      } else {
        setCurrentStatus("available")
      }
    })

    return () => unsubscribe()
  }, [room.id, room.status])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-600 text-white"
      case "booked":
        return "bg-red-600 text-white"
      case "maintenance":
        return "bg-yellow-600 text-white"
      default:
        return "bg-gray-600 text-white"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available":
        return <CheckCircle className="w-4 h-4" />
      case "booked":
        return <Home className="w-4 h-4" />
      case "maintenance":
        return <Wrench className="w-4 h-4" />
      default:
        return null
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "available":
        return "Disponibile"
      case "booked":
        return "Prenotata"
      case "maintenance":
        return "Manutenzione"
      default:
        return status
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-cinzel">{room.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">Stato Attuale</span>
          <Badge className={`${getStatusColor(currentStatus)} flex items-center gap-1.5 px-3 py-1`}>
            {getStatusIcon(currentStatus)}
            <span className="font-medium">{getStatusLabel(currentStatus)}</span>
          </Badge>
        </div>

        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            {hasActiveBooking
              ? "Stato automatico basato su prenotazioni attive"
              : room.status === "maintenance"
                ? "Camera in manutenzione - gestisci dalla sezione Impostazioni"
                : "Nessuna prenotazione per oggi"}
          </p>
        </div>

        <div className="pt-2 border-t space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Capacità:</span>
            <span className="font-medium">{room.capacity} Ospiti</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Prezzo:</span>
            <span className="font-medium">€{room.price}/notte</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
