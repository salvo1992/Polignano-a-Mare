"use client"
import { useEffect, useState } from "react"
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { roomStatus } from "@/lib/room-status"

export function useRoomStatuses() {
  const [state, setState] = useState<{ bookings: any[]; blocks: any[] } | null>(null)
  useEffect(() => {
    let bookings: any[] | null = null, blocks: any[] | null = null
    const update = () => { if (bookings && blocks) setState({ bookings, blocks }) }
    const fail = () => { bookings = null; blocks = null; setState(null) }
    const a = onSnapshot(collection(db, "bookings"), snap => { bookings = snap.docs.map(d => d.data()); update() }, fail)
    const b = onSnapshot(collection(db, "blocked_dates"), snap => { blocks = snap.docs.map(d => d.data()); update() }, fail)
    const timer = setInterval(update, 60_000)
    return () => { a(); b(); clearInterval(timer) }
  }, [])
  return (id: string) => state ? roomStatus(id, state.bookings, state.blocks) : null
}
