"use client"

import { useEffect, useState } from "react"
import { getAllRooms } from "@/lib/firebase"

export function useRoomPrices() {
  const [prices, setPrices] = useState<Record<string, number>>({
    "1": 180, // Camera Familiare con Balcone
    "2": 150, // Camera Matrimoniale con Vasca Idromassaggio
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const rooms = await getAllRooms()
        const priceMap: Record<string, number> = {}
        rooms.forEach((room) => {
          priceMap[room.id] = room.price
        })
        setPrices(priceMap)
      } catch (error) {
        console.error("[v0] Error fetching room prices:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchPrices()
  }, [])

  return { prices, loading }
}
