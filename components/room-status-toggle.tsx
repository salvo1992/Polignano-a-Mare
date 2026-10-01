"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Home, Wrench, CheckCircle } from 'lucide-react'
import type { Room } from "@/lib/booking-utils"
import { useRoomStatuses } from "@/hooks/use-room-statuses"

interface RoomStatusToggleProps {
  room: Room
}

type RoomStatus = "available" | "booked" | "maintenance"

export function RoomStatusToggle({ room }: RoomStatusToggleProps) {
  const getStatus = useRoomStatuses()
  const currentStatus = getStatus(String(room.id))

  const getStatusColor = (status: RoomStatus | null) => {
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

  const getStatusIcon = (status: RoomStatus | null) => {
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

  const getStatusLabel = (status: RoomStatus | null) => {
    switch (status) {
      case "available":
        return "Disponibile"
      case "booked":
        return "Prenotata"
      case "maintenance":
        return "Manutenzione"
      default:
        return status || "Verifica stato…"
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-cinzel">{room.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Stato Attuale
          </span>
          <Badge
            className={`${getStatusColor(
              currentStatus
            )} flex items-center gap-1.5 px-3 py-1`}
          >
            {getStatusIcon(currentStatus)}
            <span className="font-medium">
              {getStatusLabel(currentStatus)}
            </span>
          </Badge>
        </div>

        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm">
          <p className="text-xs text-muted-foreground">
            {currentStatus === "booked"
              ? "Camera occupata da prenotazione attiva"
              : currentStatus === "maintenance"
              ? "Camera in manutenzione - gestisci dalla sezione Blocca Date"
              : currentStatus === "available"
              ? "Nessuna prenotazione per oggi"
              : "Verifica del calendario in corso"}
          </p>
        </div>

        <div className="pt-2 border-t space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Capacità:</span>
            <span className="font-medium">{room.capacity} Ospiti</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Prezzo:</span>
            <span className="font-medium">Gestito da Smoobu</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
