"use client"

import { useState, useEffect } from "react"
import { CalendarIcon, ChevronLeft, ChevronRight, Ban } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import type { Booking } from "@/lib/booking-utils"

interface BookingCalendarProps {
  roomId?: string
}

export function BookingCalendar({ roomId }: BookingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  useEffect(() => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

    let q = query(
      collection(db, "bookings"),
      where("checkIn", ">=", startOfMonth.toISOString().split("T")[0]),
      where("checkIn", "<=", endOfMonth.toISOString().split("T")[0]),
    )

    if (roomId) {
      q = query(q, where("roomId", "==", roomId))
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookingsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Booking[]
      setBookings(bookingsData)
    })

    return () => unsubscribe()
  }, [currentDate, roomId])

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    return days
  }

  const getBookingsForDate = (date: Date) => {
    return bookings.filter((booking) => {
      const checkIn = new Date(booking.checkIn)
      const checkOut = new Date(booking.checkOut)
      return date >= checkIn && date <= checkOut
    })
  }

  const isDateBlocked = (date: Date) => {
    const dayBookings = getBookingsForDate(date)
    return dayBookings.some((b) => b.status === "confirmed" || b.status === "pending")
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const day = date.getDate().toString().padStart(2, "0")
      const month = (date.getMonth() + 1).toString().padStart(2, "0")
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    } catch {
      return dateString
    }
  }

  const days = getDaysInMonth()
  const weekDays = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"]

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl mb-4">
          <CalendarIcon className="w-5 h-5" />
          Calendario Prenotazioni
        </CardTitle>
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <Button variant="outline" size="icon" onClick={previousMonth} className="h-9 w-9 shrink-0 bg-transparent">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-medium min-w-[160px] sm:min-w-[200px] text-center text-sm sm:text-base">
            {currentDate.toLocaleDateString("it-IT", { month: "long", year: "numeric" })}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth} className="h-9 w-9 shrink-0 bg-transparent">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 sm:gap-3 p-3 bg-muted/30 rounded-lg text-xs justify-center sm:justify-start">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-100 border border-green-300" />
            <span>Disponibile</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300" />
            <span>Booking.com</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-pink-100 border border-pink-300" />
            <span>Airbnb</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
            <span>Sito Web</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gray-200 border border-gray-400" />
            <span>Bloccato</span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs sm:text-sm font-medium text-muted-foreground p-1 sm:p-2">
              {day}
            </div>
          ))}
          {days.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="p-1 sm:p-2" />
            }

            const dayBookings = getBookingsForDate(day)
            const isToday = day.toDateString() === new Date().toDateString()
            const hasBookings = dayBookings.length > 0
            const blocked = isDateBlocked(day)

            let bgColor = "bg-green-50 border-green-200"
            if (hasBookings) {
              const hasBookingCom = dayBookings.some((b) => b.origin === "booking")
              const hasAirbnb = dayBookings.some((b) => b.origin === "airbnb")
              const hasSite = dayBookings.some((b) => b.origin === "site")

              if (hasBookingCom) {
                bgColor = "bg-blue-50 border-blue-300"
              } else if (hasAirbnb) {
                bgColor = "bg-pink-50 border-pink-300"
              } else if (hasSite) {
                bgColor = "bg-emerald-50 border-emerald-300"
              }
            }

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`
                  p-1.5 sm:p-2 rounded-lg border transition-all hover:border-primary relative 
                  min-h-[45px] sm:min-h-[60px] md:min-h-[70px]
                  ${isToday ? "ring-2 ring-primary" : ""}
                  ${bgColor}
                  ${selectedDate?.toDateString() === day.toDateString() ? "ring-2 ring-primary" : ""}
                `}
              >
                <div className="text-xs sm:text-sm font-medium">{day.getDate()}</div>
                {blocked && (
                  <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1">
                    <Ban className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-600" />
                  </div>
                )}
                {hasBookings && (
                  <div className="flex flex-col gap-0.5 sm:gap-1 mt-0.5 sm:mt-1">
                    {dayBookings.slice(0, 1).map((booking) => (
                      <Badge
                        key={booking.id}
                        variant="secondary"
                        className={`text-[8px] sm:text-[10px] px-1 py-0 h-auto leading-tight ${
                          booking.origin === "booking"
                            ? "bg-blue-600 text-white"
                            : booking.origin === "airbnb"
                              ? "bg-pink-600 text-white"
                              : "bg-emerald-600 text-white"
                        }`}
                      >
                        {booking.origin}
                      </Badge>
                    ))}
                    {dayBookings.length > 1 && (
                      <span className="text-[8px] sm:text-xs text-muted-foreground">+{dayBookings.length - 1}</span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {selectedDate && (
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 border rounded-lg bg-muted/30">
            <h4 className="font-semibold mb-3 text-sm sm:text-base">
              Prenotazioni per {selectedDate.toLocaleDateString("it-IT")}
            </h4>
            {getBookingsForDate(selectedDate).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuna prenotazione per questa data</p>
            ) : (
              <div className="space-y-2">
                {getBookingsForDate(selectedDate).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-background rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base">
                        {booking.guestFirst} {booking.guestLast}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {booking.roomName} • {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {booking.guests} ospiti • €{booking.total}
                      </p>
                    </div>
                    <div className="flex gap-2 items-start sm:flex-col sm:items-end">
                      <Badge
                        className={
                          booking.origin === "booking"
                            ? "bg-blue-600 text-xs"
                            : booking.origin === "airbnb"
                              ? "bg-pink-600 text-xs"
                              : "bg-emerald-600 text-xs"
                        }
                      >
                        {booking.origin}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          booking.status === "confirmed"
                            ? "border-green-600 text-green-600"
                            : booking.status === "pending"
                              ? "border-yellow-600 text-yellow-600"
                              : "border-red-600 text-red-600"
                        }`}
                      >
                        {booking.status === "confirmed"
                          ? "Confermata"
                          : booking.status === "pending"
                            ? "In attesa"
                            : "Cancellata"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

