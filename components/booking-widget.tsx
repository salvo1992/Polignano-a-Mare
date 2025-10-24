"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users } from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/components/language-provider"
import { useRoomPrices } from "@/hooks/use-room-prices"

interface BookingWidgetProps {
  roomId: string
}

export function BookingWidget({ roomId }: BookingWidgetProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const { prices } = useRoomPrices()

  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [guests, setGuests] = useState(2)

  const basePrice = prices[roomId] || 180
  const originalPrice = roomId === "1" ? 220 : 180
  const discount = originalPrice - basePrice

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0
    const ci = new Date(checkIn)
    const co = new Date(checkOut)
    const ms = co.getTime() - ci.getTime()
    const diff = Math.ceil(ms / (1000 * 60 * 60 * 24))
    return isFinite(diff) && diff > 0 ? diff : 0
  }, [checkIn, checkOut])

  const subtotal = basePrice * (nights || 0)
  const taxes = 15
  const serviceFee = 10
  const total = subtotal + taxes + serviceFee

  const handleBooking = () => {
    if (!checkIn || !checkOut) {
      toast.error(t("selectDates"))
      return
    }
    if (nights <= 0) {
      toast.error(t("invalidDates"))
      return
    }
    const qs = new URLSearchParams({
      checkIn,
      checkOut,
      guests: String(guests),
      nights: String(nights),
      roomId,
    }).toString()
    router.push(`/prenota?${qs}`)
  }

  const formatMoney = (n: number) => `€${Intl.NumberFormat("it-IT", { minimumFractionDigits: 0 }).format(n)}`

  return (
    <div className="space-y-6">
      <Card className="sticky top-24">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t("bookNow")}</span>
            <div className="text-right">
              {originalPrice > basePrice && (
                <div className="text-sm line-through text-muted-foreground">
                  {formatMoney(originalPrice)}/{t("night")}
                </div>
              )}
              <div className="text-2xl font-bold text-primary">
                {formatMoney(basePrice)}
                <span className="text-sm font-normal text-muted-foreground">/{t("night")}</span>
              </div>
            </div>
          </CardTitle>

          {originalPrice > basePrice && (
            <Badge className="w-fit bg-green-600 text-white">
              {t("save")} {formatMoney(discount)}
            </Badge>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="checkin">{t("checkIn")}</Label>
              <div className="relative">
                <Input
                  id="checkin"
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="pl-10"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div>
              <Label htmlFor="checkout">{t("checkOut")}</Label>
              <div className="relative">
                <Input
                  id="checkout"
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="pl-10"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="guests">{t("guests")}</Label>
            <div className="relative">
              <Input
                id="guests"
                type="number"
                min="1"
                max="4"
                value={guests}
                onChange={(e) => setGuests(Number.parseInt(e.target.value || "1"))}
                className="pl-10"
              />
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          <div>
            <Label htmlFor="nights">{t("nights")}</Label>
            <Input id="nights" value={nights || ""} readOnly placeholder="—" />
            <p className="mt-1 text-xs text-muted-foreground">{t("nightsCalculated")}</p>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between">
              <span>
                {formatMoney(basePrice)} × {nights || 0} {t("nights")}
              </span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{t("taxesAndFees")}</span>
              <span>{formatMoney(taxes)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{t("serviceFee")}</span>
              <span>{formatMoney(serviceFee)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>{t("total")}</span>
              <span className="text-primary">{formatMoney(total)}</span>
            </div>
          </div>

          <Button onClick={handleBooking} className="w-full" size="lg">
            {t("bookNow")}
          </Button>

          <p className="text-xs text-muted-foreground text-center">{t("noChargeYet")}</p>
        </CardContent>
      </Card>
    </div>
  )
}

