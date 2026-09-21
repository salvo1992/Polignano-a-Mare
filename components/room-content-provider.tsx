"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { DEFAULT_ROOM_CONTENT, withRoomContent, type RoomContent } from "@/lib/room-content"

const defaults = DEFAULT_ROOM_CONTENT.map(withRoomContent)
const RoomContentContext = createContext({ rooms: defaults, refresh: async () => {} })

export function RoomContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState(DEFAULT_ROOM_CONTENT)
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/rooms", { cache: "no-store" })
      if (!response.ok) return
      const data = await response.json() as { rooms: RoomContent[]; fallback?: boolean }
      // A transient failure must not replace already loaded content with defaults.
      if (!data.fallback) setContent(data.rooms)
    } catch { /* Existing/default content remains visible while offline. */ }
  }, [])
  useEffect(() => { void refresh() }, [refresh])
  const value = useMemo(() => ({ rooms: content.map(withRoomContent), refresh }), [content, refresh])
  return <RoomContentContext.Provider value={value}>{children}</RoomContentContext.Provider>
}

export const useRoomContent = () => useContext(RoomContentContext)
