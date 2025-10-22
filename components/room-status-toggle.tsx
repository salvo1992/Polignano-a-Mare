"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Home, Wrench, CheckCircle } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { db } from "@/lib/firebase"
import { doc, updateDoc } from "firebase/firestore"
import type { Room } from "@/lib/booking-utils"

interface RoomStatusToggleProps {
  room: Room
}

export function RoomStatusToggle({ room }: RoomStatusToggleProps) {
  const { t } = useLanguage()
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
        return "bg-green-100 text-green-700 border-green-300"
      case "booked":
        return "bg-red-100 text-red-700 border-red-300"
      case "maintenance":
        return "bg-yellow-100 text-yellow-700 border-yellow-300"
      default:
        return "bg-gray-100 text-gray-700 border-gray-300"
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{room.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t("currentStatus")}</span>
          <Badge className={`${getStatusColor(room.status)} flex items-center gap-1`}>
            {getStatusIcon(room.status)}
            {t(room.status)}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={room.status === "available" ? "default" : "outline"}
            size="sm"
            onClick={() => updateRoomStatus("available")}
            disabled={isUpdating || room.status === "available"}
            className="flex items-center gap-1"
          >
            <CheckCircle className="w-3 h-3" />
            {t("available")}
          </Button>
          <Button
            variant={room.status === "booked" ? "default" : "outline"}
            size="sm"
            onClick={() => updateRoomStatus("booked")}
            disabled={isUpdating || room.status === "booked"}
            className="flex items-center gap-1"
          >
            <Home className="w-3 h-3" />
            {t("booked")}
          </Button>
          <Button
            variant={room.status === "maintenance" ? "default" : "outline"}
            size="sm"
            onClick={() => updateRoomStatus("maintenance")}
            disabled={isUpdating || room.status === "maintenance"}
            className="flex items-center gap-1"
          >
            <Wrench className="w-3 h-3" />
            {t("maintenance")}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            <strong>{t("capacity")}:</strong> {room.capacity} {t("guests")}
          </p>
          <p>
            <strong>{t("price")}:</strong> €{room.price}/{t("night")}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
