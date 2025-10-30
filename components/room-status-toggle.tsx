"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Home, Wrench, CheckCircle } from "lucide-react"
import { db } from "@/lib/firebase"
import { doc, updateDoc } from "firebase/firestore"
import type { Room } from "@/lib/booking-utils"

interface RoomStatusToggleProps {
  room: Room
}

export function RoomStatusToggle({ room }: RoomStatusToggleProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const updateRoomStatus = async (newStatus: "available" | "booked" | "maintenance") => {
    setIsUpdating(true)
    try {
      await updateDoc(doc(db, "rooms", room.id), {
        status: newStatus,
      })
    } catch (error) {
      console.error("[v0] Error updating room status:", error)
    } finally {
      setIsUpdating(false)
    }
  }

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
          <Badge className={`${getStatusColor(room.status)} flex items-center gap-1.5 px-3 py-1`}>
            {getStatusIcon(room.status)}
            <span className="font-medium">{getStatusLabel(room.status)}</span>
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={room.status === "available" ? "default" : "outline"}
            size="sm"
            onClick={() => updateRoomStatus("available")}
            disabled={isUpdating || room.status === "available"}
            className="flex items-center gap-1.5 flex-1 min-w-[100px]"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Disponibile</span>
          </Button>
          <Button
            variant={room.status === "booked" ? "default" : "outline"}
            size="sm"
            onClick={() => updateRoomStatus("booked")}
            disabled={isUpdating || room.status === "booked"}
            className="flex items-center gap-1.5 flex-1 min-w-[100px]"
          >
            <Home className="w-4 h-4" />
            <span>Prenotata</span>
          </Button>
          <Button
            variant={room.status === "maintenance" ? "default" : "outline"}
            size="sm"
            onClick={() => updateRoomStatus("maintenance")}
            disabled={isUpdating || room.status === "maintenance"}
            className="flex items-center gap-1.5 flex-1 min-w-[120px]"
          >
            <Wrench className="w-4 h-4" />
            <span>Manutenzione</span>
          </Button>
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
