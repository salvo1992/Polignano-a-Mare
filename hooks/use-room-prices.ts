"use client"
import { useEffect, useState } from "react"
import { ROOM_MAPPINGS } from "@/lib/room-mapping"

export function useRoomPrices() {
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const controller = new AbortController()
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
    const tomorrow = new Date(Date.parse(today) + 86400000).toISOString().slice(0, 10)
    void Promise.all(ROOM_MAPPINGS.map(async room => {
      try {
        const response = await fetch("/api/bookings/calculate-price", {
          method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
          body: JSON.stringify({ roomId: room.localId, checkIn: today, checkOut: tomorrow }),
        })
        const data = await response.json()
        return response.ok && data.pricePerNight > 0 ? [room.localId, data.pricePerNight] as const : null
      } catch { return null }
    })).then(results => {
      if (controller.signal.aborted) return
      setPrices(Object.fromEntries(results.filter((entry): entry is readonly [string, number] => entry !== null)))
      setLoading(false)
    })
    return () => controller.abort()
  }, [])
  return { prices, loading }
}
