"use client"
import { useState, useEffect } from "react"
import type { PricingContext } from "@/lib/stay-quote"

type PriceState = { key: string; pricePerNight: number; totalPrice: number; totalAmount: number; loading: boolean; error: string | null }
export function useDynamicPrice(roomId: string, checkIn: string | undefined, checkOut: string | undefined, guests = 2, numberOfChildren = 0, pricingContext: PricingContext = "booking-page") {
  const key = JSON.stringify([roomId, checkIn, checkOut, guests, numberOfChildren, pricingContext])
  const empty = { key, pricePerNight: 0, totalPrice: 0, totalAmount: 0, loading: false, error: null }
  const [state, setState] = useState<PriceState>(empty)
  useEffect(() => {
    const controller = new AbortController()
    if (!roomId || !checkIn || !checkOut) { setState(empty); return () => controller.abort() }
    setState({ ...empty, loading: true })
    void (async () => {
      try {
        const response = await fetch("/api/bookings/calculate-price", {
          method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
          body: JSON.stringify({ roomId, checkIn, checkOut, guests, numberOfChildren, pricingContext }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Impossibile verificare il prezzo")
        if (!data.minimumStayMet) throw new Error(`Soggiorno minimo: ${data.minimumStay} notti.`)
        if (!(data.newPrice > 0) || !(data.totalAmount > 0)) throw new Error("Tariffa non disponibile")
        if (!controller.signal.aborted) setState({ ...empty, pricePerNight: data.pricePerNight, totalPrice: data.newPrice, totalAmount: data.totalAmount })
      } catch (err) {
        if (!controller.signal.aborted) setState({ ...empty, error: err instanceof Error ? err.message : "Tariffa non disponibile" })
      }
    })()
    return () => controller.abort()
  }, [key])
  // A changed selection invalidates the previous quote immediately, even before
  // the effect runs. A slower old request can never replace the new selection.
  return state.key === key ? state : { ...empty, loading: Boolean(roomId && checkIn && checkOut) }
}
