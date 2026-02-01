"use client"

import type * as React from "react"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { it, enGB, fr, es, de } from "date-fns/locale"

export type DateRange = {
  from?: Date
  to?: Date
}

type Props = {
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
  className?: string
  langCode?: "it" | "en" | "fr" | "es" | "de"
}

const mapLocale = (code?: Props["langCode"]) => {
  switch (code) {
    case "en":
      return enGB
    case "fr":
      return fr
    case "es":
      return es
    case "de":
      return de
    default:
      return it
  }
}

export default function DateRangePicker({ value, onChange, className, langCode = "it" }: Props) {
  const from = value?.from
  const to = value?.to
  const locale = mapLocale(langCode)

  const label =
    from && to
      ? `${format(from, "dd MMM yyyy", { locale })} – ${format(to, "dd MMM yyyy", { locale })}`
      : from
        ? `${format(from, "dd MMM yyyy", { locale })} – …`
        : langCode === "it"
          ? "gg/mm/aaaa — gg/mm/aaaa"
          : "dd/mm/yyyy — dd/mm/yyyy"

  const toInputDate = (d?: Date) => {
    if (!d) return ""
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
  }

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFrom = e.target.value ? new Date(e.target.value) : undefined
    onChange?.({ from: newFrom, to })
  }

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTo = e.target.value ? new Date(e.target.value) : undefined
    onChange?.({ from, to: newTo })
  }

  const today = toInputDate(new Date())

  return (
    <div className={cn("w-full space-y-3", className)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Check-in Date */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            {langCode === "it" ? "Check-in" : "Check-in"}
          </label>
          <input
            type="date"
            value={toInputDate(from)}
            onChange={handleFromChange}
            min={today}
            max={toInputDate(to)}
            className={cn(
              "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
              "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
        </div>

        {/* Check-out Date */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            {langCode === "it" ? "Check-out" : "Check-out"}
          </label>
          <input
            type="date"
            value={toInputDate(to)}
            onChange={handleToChange}
            min={toInputDate(from) || today}
            className={cn(
              "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
              "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
        </div>
      </div>

      {/* Display formatted range */}
      {from && to && (
        <div className="text-sm text-center text-muted-foreground bg-muted/30 rounded-md py-2 px-3">{label}</div>
      )}
    </div>
  )
}
