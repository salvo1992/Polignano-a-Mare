"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, CalendarIcon, Loader2 } from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, isSameDay } from "date-fns"
import { it } from "date-fns/locale"
import { cn } from "@/lib/utils"

export type DateRange = {
  from?: Date
  to?: Date
}

type Props = {
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
  roomId: string
  className?: string
  compact?: boolean
}

type SeasonType = "bassa" | "media" | "medio-alta" | "alta" | "super-alta"

type Season = {
  id: string
  name: string
  type: SeasonType
  startDate: string
  endDate: string
  priceMultiplier: number
  description: string
}

type SpecialPeriod = {
  id: string
  name: string
  startDate: string
  endDate: string
  priceMultiplier: number
  description: string
  priority: number
}

export function BookingCalendarPicker({ value, onChange, roomId, className, compact = false }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [seasons, setSeasons] = useState<Season[]>([])
  const [specialPeriods, setSpecialPeriods] = useState<SpecialPeriod[]>([])
  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [loadingDates, setLoadingDates] = useState(true)

  const loadUnavailableDates = useCallback(async () => {
    try {
      setLoadingDates(true)
      const res = await fetch(`/api/bookings/unavailable-dates?roomId=${encodeURIComponent(roomId)}`)
      const data = await res.json()

      if (data.dates && Array.isArray(data.dates)) {
        setUnavailableDates(new Set(data.dates))
      }
    } catch (error) {
      console.error("[BookingCalendar] Error loading unavailable dates:", error)
    } finally {
      setLoadingDates(false)
    }
  }, [roomId])

  useEffect(() => {
    loadPricingData()
    loadUnavailableDates()
  }, [loadUnavailableDates])

  async function loadPricingData() {
    try {
      setLoading(true)

      const seasonsRes = await fetch("/api/pricing/seasons")
      const seasonsData = await seasonsRes.json()
      setSeasons(seasonsData)

      const periodsRes = await fetch("/api/pricing/special-periods")
      const periodsData = await periodsRes.json()
      setSpecialPeriods(periodsData)
    } catch (error) {
      console.error("[BookingCalendar] Error loading pricing data:", error)
    } finally {
      setLoading(false)
    }
  }

  function isDateUnavailable(day: Date): boolean {
    const dateStr = format(day, "yyyy-MM-dd")
    return unavailableDates.has(dateStr)
  }

  /**
   * Check if selecting a range would cross over an unavailable date.
   * Prevents users from booking a range that spans a blocked date.
   */
  function wouldCrossBlockedDate(from: Date, to: Date): boolean {
    const current = new Date(from)
    current.setDate(current.getDate() + 1) // start checking from the day after check-in
    while (current < to) {
      if (isDateUnavailable(current)) {
        return true
      }
      current.setDate(current.getDate() + 1)
    }
    return false
  }

  function getSeasonCategory(date: Date): SeasonType {
    const specialPeriod = specialPeriods.find((p) => {
      const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const startParts = p.startDate.split("-")
      const endParts = p.endDate.split("-")

      const start = new Date(
        Number.parseInt(startParts[0]),
        Number.parseInt(startParts[1]) - 1,
        Number.parseInt(startParts[2]),
      )
      const end = new Date(Number.parseInt(endParts[0]), Number.parseInt(endParts[1]) - 1, Number.parseInt(endParts[2]))

      return checkDate >= start && checkDate <= end
    })

    if (specialPeriod) {
      return getPriceCategory(specialPeriod.priceMultiplier)
    }

    const monthDay = format(date, "MM-dd")

    const season = seasons.find((s) => {
      const seasonStart = s.startDate
      const seasonEnd = s.endDate

      if (seasonStart <= seasonEnd) {
        return monthDay >= seasonStart && monthDay <= seasonEnd
      } else {
        return monthDay >= seasonStart || monthDay <= seasonEnd
      }
    })

    if (season) {
      return getPriceCategory(season.priceMultiplier)
    }

    return "media"
  }

  function getPriceCategory(ratio: number): SeasonType {
    if (ratio >= 2.5) return "super-alta"
    if (ratio >= 1.7) return "alta"
    if (ratio >= 1.3) return "medio-alta"
    if (ratio >= 1.0) return "media"
    return "bassa"
  }

  function handleDayClick(day: Date) {
    // Don't allow clicking unavailable dates
    if (isDateUnavailable(day)) return

    const from = value?.from
    const to = value?.to

    if (!from || (from && to)) {
      // Starting a new selection
      onChange?.({ from: day, to: undefined })
    } else if (from && !to) {
      // Completing the range
      let rangeFrom = from
      let rangeTo = day

      if (day < from) {
        rangeFrom = day
        rangeTo = from
      }

      // Check if the range crosses any blocked dates
      if (wouldCrossBlockedDate(rangeFrom, rangeTo)) {
        // Reset selection - can't book across blocked dates
        onChange?.({ from: day, to: undefined })
        return
      }

      onChange?.({ from: rangeFrom, to: rangeTo })
    }
  }

  function isInRange(day: Date): boolean {
    const { from, to } = value || {}
    if (!from) return false
    if (!to) return isSameDay(day, from)
    return day >= from && day <= to
  }

  function isStartOrEnd(day: Date): boolean {
    const { from, to } = value || {}
    if (!from) return false
    if (isSameDay(day, from)) return true
    if (to && isSameDay(day, to)) return true
    return false
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <Card className={cn(compact ? "p-2" : "p-3", className)}>
      <div className={cn(compact ? "space-y-2" : "space-y-3")}>
        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size={compact ? "icon" : "sm"}
            onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
            className={compact ? "h-7 w-7" : ""}
          >
            <ChevronLeft className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
          </Button>
          <div className="flex items-center gap-2">
            <h3 className={cn(compact ? "text-sm" : "text-base", "font-semibold")}>
              {format(currentMonth, "MMMM yyyy", { locale: it })}
            </h3>
            {loadingDates && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          </div>
          <Button
            variant="outline"
            size={compact ? "icon" : "sm"}
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className={compact ? "h-7 w-7" : ""}
          >
            <ChevronRight className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className={cn("grid grid-cols-7", compact ? "gap-0.5" : "gap-1")}>
          {["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"].map((day) => (
            <div key={day} className={cn("text-center font-semibold p-1", compact ? "text-[10px]" : "text-xs")}>
              {day}
            </div>
          ))}
          {Array.from({ length: monthStart.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {daysInMonth.map((day) => {
            const isPast = day < today
            const isUnavailable = isDateUnavailable(day)
            const isDisabled = isPast || isUnavailable
            const isSelected = isInRange(day)
            const isEdge = isStartOrEnd(day)

            return (
              <button
                key={day.toISOString()}
                onClick={() => !isDisabled && handleDayClick(day)}
                disabled={isDisabled}
                className={cn(
                  "rounded-lg text-center transition-all relative flex flex-col items-center justify-center",
                  compact ? "p-2 min-h-[36px]" : "p-4 min-h-[52px]",
                  // Unavailable dates: red strikethrough look
                  isUnavailable && !isPast && "bg-destructive/15 text-destructive/50 cursor-not-allowed line-through",
                  // Past dates
                  isPast && "opacity-30 cursor-not-allowed bg-muted text-muted-foreground",
                  // Available dates
                  !isDisabled && "bg-primary text-white hover:opacity-80 cursor-pointer active:scale-95",
                  // Selected range
                  isSelected && !isEdge && !isDisabled && "ring-2 ring-white brightness-110",
                  isEdge && !isDisabled && "ring-4 ring-yellow-300 scale-105 brightness-125 shadow-lg shadow-yellow-400/50",
                )}
                aria-label={
                  isUnavailable
                    ? `${format(day, "d MMMM", { locale: it })} - Non disponibile`
                    : `${format(day, "d MMMM", { locale: it })}`
                }
              >
                <div className={cn(compact ? "text-base" : "text-xl", "font-bold")}>{format(day, "d")}</div>
                {isUnavailable && !isPast && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[80%] h-[2px] bg-destructive/40 rotate-[-45deg]" />
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className={cn("flex items-center gap-4 pt-1", compact ? "text-[9px]" : "text-xs")}>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary" />
            <span className="text-muted-foreground">Disponibile</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-destructive/15 border border-destructive/30" />
            <span className="text-muted-foreground">Occupato</span>
          </div>
        </div>

        {value?.from && (
          <div
            className={cn(
              "flex items-center gap-2 bg-primary/10 rounded-md p-2 border border-primary/20",
              compact ? "text-[10px]" : "text-xs",
            )}
          >
            <CalendarIcon className={cn(compact ? "h-3 w-3" : "h-3 w-3", "text-primary")} />
            <span className="font-semibold">
              {format(value.from, "dd MMM yyyy", { locale: it })}
              {value.to && ` → ${format(value.to, "dd MMM yyyy", { locale: it })}`}
            </span>
          </div>
        )}
      </div>
    </Card>
  )
}
