"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Plus,
  CalendarIcon,
  TrendingUp,
  Settings,
  Sparkles,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Euro,
  Info,
} from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, isSameDay } from "date-fns"
import { it } from "date-fns/locale"

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

type PriceOverride = {
  id: string
  roomId: string
  date: string
  price: number
  reason: string
}

type RoomBasePrice = {
  roomId: string
  roomName: string
  basePrice: number
}

// Short display names for the calendar grid
const SHORT_NAMES: Record<string, string> = {
  "1": "Acies",
  "2": "Acquaroom",
}

const SEASON_COLORS: Record<SeasonType, { bg: string; text: string; dot: string }> = {
  bassa: { bg: "bg-sky-50 dark:bg-sky-950/30", text: "text-sky-700 dark:text-sky-300", dot: "bg-sky-500" },
  media: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  "medio-alta": { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  alta: { bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
  "super-alta": { bg: "bg-rose-50 dark:bg-rose-950/30", text: "text-rose-700 dark:text-rose-300", dot: "bg-rose-500" },
}

export function DynamicPricingManagement() {
  const [activeTab, setActiveTab] = useState("calendar")
  const [rooms, setRooms] = useState<RoomBasePrice[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [specialPeriods, setSpecialPeriods] = useState<SpecialPeriod[]>([])
  const [priceOverrides, setPriceOverrides] = useState<PriceOverride[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [initLoading, setInitLoading] = useState(false)

  // Range selection state
  const [rangeStart, setRangeStart] = useState<Date | null>(null)
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [cellDialogOpen, setCellDialogOpen] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{ date: Date; roomId: string } | null>(null)

  const { toast } = useToast()

  useEffect(() => {
    loadPricingData()
    checkInitialization()
  }, [])

  async function checkInitialization() {
    try {
      const res = await fetch("/api/pricing/initialize-defaults")
      if (!res.ok) { setIsInitialized(false); return }
      const data = await res.json()
      setIsInitialized(data.seasons > 0 && data.specialPeriods > 0)
    } catch { setIsInitialized(false) }
  }

  async function handleInitializeDefaults() {
    try {
      setInitLoading(true)
      const res = await fetch("/api/pricing/initialize-defaults", { method: "POST" })
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      toast({ title: "Inizializzazione Completata", description: `Creati ${data.seasons} stagioni e ${data.specialPeriods} periodi speciali` })
      setIsInitialized(true)
      await loadPricingData()
    } catch (error) {
      toast({ title: "Errore", description: `Impossibile inizializzare: ${error}`, variant: "destructive" })
    } finally { setInitLoading(false) }
  }

  async function loadPricingData() {
    try {
      setLoading(true)
      const [roomsRes, seasonsRes, periodsRes, overridesRes] = await Promise.all([
        fetch("/api/pricing/rooms"),
        fetch("/api/pricing/seasons"),
        fetch("/api/pricing/special-periods"),
        fetch("/api/pricing/overrides"),
      ])
      setRooms(await roomsRes.json())
      setSeasons(await seasonsRes.json())
      setSpecialPeriods(await periodsRes.json())
      setPriceOverrides(await overridesRes.json())
    } catch {
      toast({ title: "Errore", description: "Impossibile caricare i dati dei prezzi", variant: "destructive" })
    } finally { setLoading(false) }
  }

  const calculatePriceForDate = useCallback((date: Date, roomId: string): number => {
    const dateStr = format(date, "yyyy-MM-dd")
    const room = rooms.find((r) => r.roomId === roomId)
    if (!room) return 0

    const override = priceOverrides.find((o) => o.roomId === roomId && o.date === dateStr)
    if (override) return override.price

    const specialPeriod = specialPeriods.find((p) => {
      const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const sp = p.startDate.split("-")
      const ep = p.endDate.split("-")
      const start = new Date(+sp[0], +sp[1] - 1, +sp[2])
      const end = new Date(+ep[0], +ep[1] - 1, +ep[2])
      return checkDate >= start && checkDate <= end
    })
    if (specialPeriod) return Math.round(room.basePrice * specialPeriod.priceMultiplier)

    const monthDay = format(date, "MM-dd")
    const season = seasons.find((s) => {
      if (s.startDate <= s.endDate) return monthDay >= s.startDate && monthDay <= s.endDate
      return monthDay >= s.startDate || monthDay <= s.endDate
    })
    if (season) return Math.round(room.basePrice * season.priceMultiplier)

    return room.basePrice
  }, [rooms, priceOverrides, specialPeriods, seasons])

  function getPriceCategory(price: number, basePrice: number): SeasonType {
    const ratio = price / basePrice
    if (ratio >= 2.5) return "super-alta"
    if (ratio >= 1.7) return "alta"
    if (ratio >= 1.3) return "medio-alta"
    if (ratio >= 1.0) return "media"
    return "bassa"
  }

  function getSourceLabel(date: Date, roomId: string): string {
    const dateStr = format(date, "yyyy-MM-dd")
    if (priceOverrides.find((o) => o.roomId === roomId && o.date === dateStr)) return "Override"
    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const sp = specialPeriods.find((p) => {
      const s = p.startDate.split("-"); const e = p.endDate.split("-")
      return checkDate >= new Date(+s[0], +s[1]-1, +s[2]) && checkDate <= new Date(+e[0], +e[1]-1, +e[2])
    })
    if (sp) return sp.name
    const monthDay = format(date, "MM-dd")
    const season = seasons.find((s) => s.startDate <= s.endDate ? monthDay >= s.startDate && monthDay <= s.endDate : monthDay >= s.startDate || monthDay <= s.endDate)
    if (season) return season.name
    return "Base"
  }

  async function handleSingleOverride(roomId: string, date: string, price: number, reason: string) {
    try {
      const res = await fetch("/api/pricing/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, date, price, reason }),
      })
      if (!res.ok) throw new Error("Failed")
      toast({ title: "Prezzo aggiornato", description: `${format(new Date(date), "dd/MM/yyyy")} - ${SHORT_NAMES[roomId] || roomId}: €${price}` })
      await loadPricingData()
    } catch {
      toast({ title: "Errore", description: "Impossibile salvare il prezzo", variant: "destructive" })
    }
  }

  async function handleBulkOverride(roomId: string, startDate: Date, endDate: Date, price: number, reason: string) {
    const days = eachDayOfInterval({ start: startDate, end: endDate })
    try {
      await Promise.all(days.map((d) =>
        fetch("/api/pricing/overrides", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, date: format(d, "yyyy-MM-dd"), price, reason }),
        })
      ))
      toast({ title: "Prezzi aggiornati", description: `${days.length} giorni aggiornati per ${SHORT_NAMES[roomId] || roomId}` })
      await loadPricingData()
    } catch {
      toast({ title: "Errore", description: "Impossibile aggiornare i prezzi", variant: "destructive" })
    }
  }

  async function handleBasePriceUpdate(roomId: string, newPrice: number) {
    try {
      const res = await fetch("/api/pricing/update-base-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, basePrice: newPrice }),
      })
      if (!res.ok) throw new Error("Failed")
      toast({ title: "Successo", description: "Prezzo base aggiornato" })
      await loadPricingData()
    } catch {
      toast({ title: "Errore", description: "Impossibile aggiornare il prezzo base", variant: "destructive" })
    }
  }

  async function handleDeleteSeason(seasonId: string) {
    if (!confirm("Eliminare questa stagione?")) return
    try {
      await fetch(`/api/pricing/seasons?id=${seasonId}`, { method: "DELETE" })
      toast({ title: "Stagione eliminata" })
      await loadPricingData()
    } catch { toast({ title: "Errore", variant: "destructive" }) }
  }

  async function handleDeletePeriod(periodId: string) {
    if (!confirm("Eliminare questo periodo?")) return
    try {
      await fetch(`/api/pricing/special-periods?id=${periodId}`, { method: "DELETE" })
      toast({ title: "Periodo eliminato" })
      await loadPricingData()
    } catch { toast({ title: "Errore", variant: "destructive" }) }
  }

  // Calendar data
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const firstDayOffset = monthStart.getDay()

  // Range helpers
  function isInRange(date: Date): boolean {
    if (!rangeStart) return false
    if (!rangeEnd) return isSameDay(date, rangeStart)
    const d = date.getTime()
    const s = Math.min(rangeStart.getTime(), rangeEnd.getTime())
    const e = Math.max(rangeStart.getTime(), rangeEnd.getTime())
    return d >= s && d <= e
  }

  function handleDayClick(date: Date) {
    if (!rangeStart || rangeEnd) {
      setRangeStart(date)
      setRangeEnd(null)
    } else {
      setRangeEnd(date)
      setBulkDialogOpen(true)
    }
  }

  function handleCellClick(date: Date, roomId: string) {
    setSelectedCell({ date, roomId })
    setCellDialogOpen(true)
  }

  // Stats
  const thisMonthPrices = rooms.flatMap((room) =>
    daysInMonth.map((d) => ({ roomId: room.roomId, price: calculatePriceForDate(d, room.roomId), base: room.basePrice }))
  )
  const overrideCount = priceOverrides.filter((o) => o.date >= format(monthStart, "yyyy-MM-dd") && o.date <= format(monthEnd, "yyyy-MM-dd")).length

  if (loading) {
    return <div className="flex items-center justify-center p-8"><p>Caricamento sistema prezzi...</p></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestione Prezzi</h2>
          <p className="text-sm text-muted-foreground">Calendario prezzi stile Smoobu - clicca sulle celle per modificare</p>
        </div>
        <Button onClick={handleInitializeDefaults} disabled={initLoading} variant={isInitialized ? "outline" : "default"} className="gap-2">
          <Sparkles className="h-4 w-4" />
          {initLoading ? "Caricamento..." : isInitialized ? "Reinizializza" : "Inizializza Stagioni"}
        </Button>
      </div>

      {!isInitialized && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">Sistema non inizializzato</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">Clicca "Inizializza Stagioni" per creare automaticamente le fasce di prezzo per Polignano a Mare.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {rooms.map((r) => (
          <Card key={r.roomId} className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{SHORT_NAMES[r.roomId] || r.roomName}</p>
            <p className="text-2xl font-bold mt-1">{"\u20AC"}{r.basePrice}</p>
            <p className="text-xs text-muted-foreground">prezzo base / notte</p>
          </Card>
        ))}
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Stagioni</p>
          <p className="text-2xl font-bold mt-1">{seasons.length}</p>
          <p className="text-xs text-muted-foreground">configurate</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Override mese</p>
          <p className="text-2xl font-bold mt-1">{overrideCount}</p>
          <p className="text-xs text-muted-foreground">in {format(currentMonth, "MMMM", { locale: it })}</p>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calendar" className="gap-1.5"><CalendarIcon className="h-4 w-4 hidden sm:block" />Calendario</TabsTrigger>
          <TabsTrigger value="base" className="gap-1.5"><Euro className="h-4 w-4 hidden sm:block" />Prezzi Base</TabsTrigger>
          <TabsTrigger value="seasons" className="gap-1.5"><Settings className="h-4 w-4 hidden sm:block" />Stagioni</TabsTrigger>
          <TabsTrigger value="special" className="gap-1.5"><Sparkles className="h-4 w-4 hidden sm:block" />Periodi Speciali</TabsTrigger>
        </TabsList>

        {/* ==================== CALENDAR TAB ==================== */}
        <TabsContent value="calendar" className="space-y-4">
          {/* Month nav */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}><ChevronLeft className="h-4 w-4 mr-1" />Precedente</Button>
            <h3 className="text-lg font-semibold capitalize">{format(currentMonth, "MMMM yyyy", { locale: it })}</h3>
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>Successivo<ChevronRight className="h-4 w-4 ml-1" /></Button>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3">
            {(Object.entries(SEASON_COLORS) as [SeasonType, typeof SEASON_COLORS["bassa"]][]).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${val.dot}`} />
                <span className="text-xs capitalize">{key.replace("-", " ")}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
              <span className="text-xs">Override manuale</span>
            </div>
          </div>

          {/* Range selection hint */}
          {rangeStart && !rangeEnd && (
            <div className="p-2 bg-primary/10 rounded text-sm text-center">
              Seleziona la data di fine per modificare i prezzi in blocco. <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => { setRangeStart(null); setRangeEnd(null) }}>Annulla</Button>
            </div>
          )}

          {/* Calendar Grid - Smoobu style */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left text-xs font-medium text-muted-foreground w-24 sticky left-0 bg-background z-10">Giorno</th>
                    {rooms.map((r) => (
                      <th key={r.roomId} className="p-2 text-center text-xs font-medium text-muted-foreground">{SHORT_NAMES[r.roomId] || r.roomName}</th>
                    ))}
                    <th className="p-2 text-center text-xs font-medium text-muted-foreground w-20">Azione</th>
                  </tr>
                </thead>
                <tbody>
                  {daysInMonth.map((day) => {
                    const dayName = format(day, "EEE", { locale: it })
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6
                    const inRange = isInRange(day)

                    return (
                      <tr key={day.toISOString()} className={`border-b transition-colors ${isWeekend ? "bg-muted/30" : ""} ${inRange ? "bg-primary/5" : ""} hover:bg-muted/20`}>
                        <td className="p-2 sticky left-0 bg-background z-10">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${isWeekend ? "text-primary" : ""}`}>{format(day, "d")}</span>
                            <span className="text-xs text-muted-foreground capitalize">{dayName}</span>
                          </div>
                        </td>
                        {rooms.map((r) => {
                          const price = calculatePriceForDate(day, r.roomId)
                          const cat = getPriceCategory(price, r.basePrice)
                          const colors = SEASON_COLORS[cat]
                          const dateStr = format(day, "yyyy-MM-dd")
                          const hasOverride = priceOverrides.some((o) => o.roomId === r.roomId && o.date === dateStr)
                          const source = getSourceLabel(day, r.roomId)

                          return (
                            <td key={r.roomId} className="p-1">
                              <button
                                type="button"
                                onClick={() => handleCellClick(day, r.roomId)}
                                className={`w-full rounded-md p-2 text-center transition-all hover:ring-2 hover:ring-primary/50 ${hasOverride ? "bg-violet-50 dark:bg-violet-950/30 ring-1 ring-violet-300" : colors.bg}`}
                              >
                                <span className={`text-sm font-bold ${hasOverride ? "text-violet-700 dark:text-violet-300" : colors.text}`}>{"\u20AC"}{price}</span>
                                <span className={`block text-[10px] leading-tight ${hasOverride ? "text-violet-500" : "text-muted-foreground"}`}>{source}</span>
                              </button>
                            </td>
                          )
                        })}
                        <td className="p-1 text-center">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDayClick(day)}><CalendarIcon className="h-3.5 w-3.5" /></Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== BASE PRICES TAB ==================== */}
        <TabsContent value="base" className="space-y-4">
          {rooms.map((room) => (
            <Card key={room.roomId}>
              <CardHeader>
                <CardTitle>{room.roomName}</CardTitle>
                <CardDescription>Prezzo base per notte (prima dei moltiplicatori stagionali). Questo prezzo si propaga in tutto il sito.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label htmlFor={`base-price-${room.roomId}`}>Prezzo Base ({"\u20AC"})</Label>
                    <Input id={`base-price-${room.roomId}`} type="number" min="0" step="1" defaultValue={room.basePrice} />
                  </div>
                  <Button onClick={(e) => {
                    const input = e.currentTarget.parentElement?.querySelector("input")
                    if (input) handleBasePriceUpdate(room.roomId, Number.parseFloat(input.value))
                  }}>Aggiorna</Button>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Prezzo attuale: {"\u20AC"}{room.basePrice}/notte</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ==================== SEASONS TAB ==================== */}
        <TabsContent value="seasons" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Stagioni Ricorrenti</CardTitle>
                  <CardDescription>Le stagioni si ripetono automaticamente ogni anno</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="mr-2 h-4 w-4" />Aggiungi</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Nuova Stagione</DialogTitle></DialogHeader>
                    <SeasonForm onSave={loadPricingData} />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {seasons.map((season) => {
                  const colors = SEASON_COLORS[season.type]
                  return (
                    <div key={season.id} className={`flex items-center justify-between p-3 rounded-lg border ${colors.bg}`}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className={`w-3 h-3 rounded-full shrink-0 ${colors.dot}`} />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{season.name}</p>
                          <p className="text-xs text-muted-foreground">{season.startDate} - {season.endDate} (ogni anno) | x{season.priceMultiplier}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="secondary" className="text-xs">{season.priceMultiplier > 1 ? "+" : ""}{Math.round((season.priceMultiplier - 1) * 100)}%</Badge>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Modifica Stagione</DialogTitle></DialogHeader>
                            <SeasonForm onSave={loadPricingData} initialData={season} />
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteSeason(season.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    </div>
                  )
                })}
                {seasons.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nessuna stagione configurata</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== SPECIAL PERIODS TAB ==================== */}
        <TabsContent value="special" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Periodi Speciali</CardTitle>
                  <CardDescription>Feste, eventi e periodi con prezzi speciali (priorita sulle stagioni)</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="mr-2 h-4 w-4" />Aggiungi</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Nuovo Periodo Speciale</DialogTitle></DialogHeader>
                    <SpecialPeriodForm onSave={loadPricingData} />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {specialPeriods.map((period) => (
                  <div key={period.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{period.name}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(period.startDate), "dd/MM/yyyy", { locale: it })} - {format(new Date(period.endDate), "dd/MM/yyyy", { locale: it })} | x{period.priceMultiplier}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="secondary" className="text-xs">{period.priceMultiplier > 1 ? "+" : ""}{Math.round((period.priceMultiplier - 1) * 100)}%</Badge>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Modifica Periodo</DialogTitle></DialogHeader>
                          <SpecialPeriodForm onSave={loadPricingData} initialData={period} />
                        </DialogContent>
                      </Dialog>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeletePeriod(period.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
                {specialPeriods.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nessun periodo speciale configurato</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ==================== SINGLE CELL DIALOG ==================== */}
      <Dialog open={cellDialogOpen} onOpenChange={setCellDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Prezzo</DialogTitle>
          </DialogHeader>
          {selectedCell && (
            <CellOverrideForm
              date={selectedCell.date}
              roomId={selectedCell.roomId}
              roomName={SHORT_NAMES[selectedCell.roomId] || selectedCell.roomId}
              currentPrice={calculatePriceForDate(selectedCell.date, selectedCell.roomId)}
              source={getSourceLabel(selectedCell.date, selectedCell.roomId)}
              onSave={(price, reason) => {
                handleSingleOverride(selectedCell.roomId, format(selectedCell.date, "yyyy-MM-dd"), price, reason)
                setCellDialogOpen(false)
              }}
              onCancel={() => setCellDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== BULK RANGE DIALOG ==================== */}
      <Dialog open={bulkDialogOpen} onOpenChange={(open) => { setBulkDialogOpen(open); if (!open) { setRangeStart(null); setRangeEnd(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Prezzi in Blocco</DialogTitle>
          </DialogHeader>
          {rangeStart && rangeEnd && (
            <BulkOverrideForm
              startDate={rangeStart < rangeEnd ? rangeStart : rangeEnd}
              endDate={rangeStart < rangeEnd ? rangeEnd : rangeStart}
              rooms={rooms}
              onSave={(roomId, price, reason) => {
                const s = rangeStart < rangeEnd ? rangeStart : rangeEnd
                const e = rangeStart < rangeEnd ? rangeEnd : rangeStart
                handleBulkOverride(roomId, s, e, price, reason)
                setBulkDialogOpen(false)
                setRangeStart(null)
                setRangeEnd(null)
              }}
              onCancel={() => { setBulkDialogOpen(false); setRangeStart(null); setRangeEnd(null) }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ===================== SUB-COMPONENTS ===================== */

function CellOverrideForm({ date, roomId, roomName, currentPrice, source, onSave, onCancel }: {
  date: Date; roomId: string; roomName: string; currentPrice: number; source: string
  onSave: (price: number, reason: string) => void; onCancel: () => void
}) {
  const [price, setPrice] = useState(currentPrice.toString())
  const [reason, setReason] = useState("")

  return (
    <div className="space-y-4">
      <div className="p-3 bg-muted rounded-lg text-sm">
        <p><strong>{roomName}</strong> - {format(date, "EEEE d MMMM yyyy", { locale: it })}</p>
        <p className="text-muted-foreground">Prezzo attuale: {"\u20AC"}{currentPrice} ({source})</p>
      </div>
      <div>
        <Label>Nuovo prezzo ({"\u20AC"})</Label>
        <Input type="number" min="0" step="1" value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      <div>
        <Label>Motivo (opzionale)</Label>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="es: Sconto last minute" />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Annulla</Button>
        <Button onClick={() => onSave(Number.parseFloat(price), reason)}>Salva</Button>
      </div>
    </div>
  )
}

function BulkOverrideForm({ startDate, endDate, rooms, onSave, onCancel }: {
  startDate: Date; endDate: Date; rooms: RoomBasePrice[]
  onSave: (roomId: string, price: number, reason: string) => void; onCancel: () => void
}) {
  const [roomId, setRoomId] = useState(rooms[0]?.roomId || "")
  const [price, setPrice] = useState("")
  const [reason, setReason] = useState("")
  const days = eachDayOfInterval({ start: startDate, end: endDate })

  return (
    <div className="space-y-4">
      <div className="p-3 bg-muted rounded-lg text-sm">
        <p>Dal <strong>{format(startDate, "dd/MM/yyyy")}</strong> al <strong>{format(endDate, "dd/MM/yyyy")}</strong></p>
        <p className="text-muted-foreground">{days.length} giorni selezionati</p>
      </div>
      <div>
        <Label>Camera</Label>
        <Select value={roomId} onValueChange={setRoomId}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {rooms.map((r) => (
              <SelectItem key={r.roomId} value={r.roomId}>{SHORT_NAMES[r.roomId] || r.roomName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Prezzo per notte ({"\u20AC"})</Label>
        <Input type="number" min="0" step="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="es: 200" />
      </div>
      <div>
        <Label>Motivo (opzionale)</Label>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="es: Promozione settimanale" />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Annulla</Button>
        <Button onClick={() => onSave(roomId, Number.parseFloat(price), reason)} disabled={!price}>Applica a {days.length} giorni</Button>
      </div>
    </div>
  )
}

function SeasonForm({ onSave, initialData }: { onSave: () => void; initialData?: Season }) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const startDateFull = formData.get("startDate") as string
    const endDateFull = formData.get("endDate") as string
    const data = {
      name: formData.get("name") as string,
      type: formData.get("type") as SeasonType,
      startDate: startDateFull.substring(5),
      endDate: endDateFull.substring(5),
      priceMultiplier: Number.parseFloat(formData.get("priceMultiplier") as string),
      description: formData.get("description") as string,
    }
    try {
      const url = initialData ? `/api/pricing/seasons?id=${initialData.id}` : "/api/pricing/seasons"
      const res = await fetch(url, { method: initialData ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error("Failed")
      toast({ title: "Successo", description: initialData ? "Stagione aggiornata" : "Stagione creata" })
      onSave()
    } catch { toast({ title: "Errore", description: "Impossibile salvare", variant: "destructive" }) } finally { setLoading(false) }
  }

  const displayStartDate = initialData?.startDate ? `2025-${initialData.startDate}` : ""
  const displayEndDate = initialData?.endDate ? `2025-${initialData.endDate}` : ""

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><Label htmlFor="name">Nome</Label><Input id="name" name="name" required defaultValue={initialData?.name} placeholder="es: Estate Alta Stagione" /></div>
      <div>
        <Label htmlFor="type">Tipologia</Label>
        <Select name="type" required defaultValue={initialData?.type}>
          <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="bassa">Bassa</SelectItem>
            <SelectItem value="media">Media</SelectItem>
            <SelectItem value="medio-alta">Medio-Alta</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="super-alta">Super-Alta</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label htmlFor="startDate">Inizio</Label><Input id="startDate" name="startDate" type="date" required defaultValue={displayStartDate} /><p className="text-xs text-muted-foreground mt-1">Si ripete ogni anno</p></div>
        <div><Label htmlFor="endDate">Fine</Label><Input id="endDate" name="endDate" type="date" required defaultValue={displayEndDate} /><p className="text-xs text-muted-foreground mt-1">Si ripete ogni anno</p></div>
      </div>
      <div><Label htmlFor="priceMultiplier">Moltiplicatore</Label><Input id="priceMultiplier" name="priceMultiplier" type="number" step="0.1" min="0.5" max="3" required defaultValue={initialData?.priceMultiplier} placeholder="es: 1.5 per +50%" /><p className="text-xs text-muted-foreground mt-1">1.0 = base, 1.5 = +50%, 2.0 = +100%</p></div>
      <div><Label htmlFor="description">Descrizione</Label><Input id="description" name="description" defaultValue={initialData?.description} placeholder="es: Agosto Ferragosto" /></div>
      <Button type="submit" disabled={loading} className="w-full">{loading ? "Salvataggio..." : initialData ? "Aggiorna" : "Crea Stagione"}</Button>
    </form>
  )
}

function SpecialPeriodForm({ onSave, initialData }: { onSave: () => void; initialData?: SpecialPeriod }) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get("name") as string,
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string,
      priceMultiplier: Number.parseFloat(formData.get("priceMultiplier") as string),
      description: formData.get("description") as string,
      priority: 1,
    }
    try {
      const url = initialData ? `/api/pricing/special-periods?id=${initialData.id}` : "/api/pricing/special-periods"
      const res = await fetch(url, { method: initialData ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error("Failed")
      toast({ title: "Successo", description: initialData ? "Periodo aggiornato" : "Periodo creato" })
      onSave()
    } catch { toast({ title: "Errore", description: "Impossibile salvare", variant: "destructive" }) } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><Label htmlFor="name">Nome</Label><Input id="name" name="name" required defaultValue={initialData?.name} placeholder="es: Ferragosto 2025" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label htmlFor="startDate">Inizio</Label><Input id="startDate" name="startDate" type="date" required defaultValue={initialData?.startDate} /></div>
        <div><Label htmlFor="endDate">Fine</Label><Input id="endDate" name="endDate" type="date" required defaultValue={initialData?.endDate} /></div>
      </div>
      <div><Label htmlFor="priceMultiplier">Moltiplicatore</Label><Input id="priceMultiplier" name="priceMultiplier" type="number" step="0.1" min="0.5" max="5" required defaultValue={initialData?.priceMultiplier} placeholder="es: 2.5 per +150%" /><p className="text-xs text-muted-foreground mt-1">1.0 = base, 2.0 = +100%, 2.5 = +150%</p></div>
      <div><Label htmlFor="description">Descrizione</Label><Input id="description" name="description" defaultValue={initialData?.description} placeholder="es: Picco prenotazioni" /></div>
      <Button type="submit" disabled={loading} className="w-full">{loading ? "Salvataggio..." : initialData ? "Aggiorna" : "Crea Periodo"}</Button>
    </form>
  )
}
