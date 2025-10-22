"use client"

import { useState, useEffect } from "react"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/components/language-provider"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import type { Booking } from "@/lib/booking-utils"

interface BookingCalendarProps {
  roomId?: string
}

export function BookingCalendar({ roomId }: BookingCalendarProps) {
  const { t } = useLanguage()
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

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const days = getDaysInMonth()
  const weekDays = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            {t("bookingCalendar")}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={previousMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-medium min-w-[150px] text-center">
              {currentDate.toLocaleDateString("it-IT", { month: "long", year: "numeric" })}
            </span>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
              {day}
            </div>
          ))}
          {days.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="p-2" />
            }

            const dayBookings = getBookingsForDate(day)
            const isToday = day.toDateString() === new Date().toDateString()
            const hasBookings = dayBookings.length > 0

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`
                  p-2 rounded-lg border transition-all hover:border-primary
                  ${isToday ? "bg-primary/10 border-primary" : ""}
                  ${hasBookings ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}
                  ${selectedDate?.toDateString() === day.toDateString() ? "ring-2 ring-primary" : ""}
                `}
              >
                <div className="text-sm font-medium">{day.getDate()}</div>
                {hasBookings && (
                  <div className="flex flex-col gap-1 mt-1">
                    {dayBookings.map((booking) => (
                      <Badge
                        key={booking.id}
                        variant="secondary"
                        className={`text-xs ${
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
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {selectedDate && (
          <div className="mt-6 p-4 border rounded-lg bg-muted/30">
            <h4 className="font-semibold mb-3">
              {t("bookingsFor")} {selectedDate.toLocaleDateString("it-IT")}
            </h4>
            {getBookingsForDate(selectedDate).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noBookings")}</p>
            ) : (
              <div className="space-y-2">
                {getBookingsForDate(selectedDate).map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 bg-background rounded-lg">
                    <div>
                      <p className="font-medium">
                        {booking.guestFirst} {booking.guestLast}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {booking.roomName} • {booking.checkIn} → {booking.checkOut}
                      </p>
                    </div>
                    <Badge
                      className={
                        booking.origin === "booking"
                          ? "bg-blue-600"
                          : booking.origin === "airbnb"
                            ? "bg-pink-600"
                            : "bg-emerald-600"
                      }
                    >
                      {booking.origin}
                    </Badge>
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
