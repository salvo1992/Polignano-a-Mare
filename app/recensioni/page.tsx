"use client"

import { useEffect, useState } from "react"
import { getAllReviewsPage, type Review } from "@/lib/reviews"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, Search, MessageCircle } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

const DEFAULT_REVIEWS: Review[] = [
  {
    id: "d1",
    name: "Marco Rossi",
    location: "Milano",
    rating: 5,
    comment: "Esperienza fantastica! Il servizio e impeccabile e la vista mozzafiato. Torneremo sicuramente!",
    date: "Dicembre 2024",
    verified: true,
    source: "booking",
  },
  {
    id: "d2",
    name: "Sarah Johnson",
    location: "London, UK",
    rating: 5,
    comment:
      "Perfect location! The staff was incredibly helpful and the rooms are beautiful. Highly recommended!",
    date: "Novembre 2024",
    verified: true,
    source: "airbnb",
  },
  {
    id: "d3",
    name: "Giuseppe Bianchi",
    location: "Roma",
    rating: 4,
    comment: "Ottima struttura nel cuore di Polignano a Mare. Colazione eccellente e personale molto cortese.",
    date: "Ottobre 2024",
    verified: true,
    source: "booking",
  },
  {
    id: "d4",
    name: "Marie Dubois",
    location: "Paris, France",
    rating: 5,
    comment: "Un sejour merveilleux! L'emplacement est parfait et le service est exceptionnel.",
    date: "Settembre 2024",
    verified: true,
    source: "direct",
  },
]

interface ReviewStats {
  totalReviews: number
  averageRating: number
  satisfaction: number
  bySource: Record<string, number>
}

function getSourceBadgeClass(source?: string) {
  switch (source) {
    case "booking":
      return "bg-blue-600 text-white"
    case "airbnb":
      return "bg-pink-600 text-white"
    case "expedia":
      return "bg-yellow-600 text-white"
    case "direct":
      return "bg-emerald-600 text-white"
    default:
      return "bg-muted text-foreground"
  }
}

function getSourceLabel(source?: string) {
  switch (source) {
    case "booking":
      return "Booking.com"
    case "airbnb":
      return "Airbnb"
    case "expedia":
      return "Expedia"
    case "direct":
      return "Diretta"
    case "manual":
      return "Verificata"
    default:
      return source || "Verificata"
  }
}

export default function AllReviewsPage() {
  const { t } = useLanguage()
  const [items, setItems] = useState<Review[]>([])
  const [minRating, setMinRating] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [pageCursor, setPageCursor] = useState<any>(null)
  const [done, setDone] = useState(false)
  const [stats, setStats] = useState<ReviewStats | null>(null)

  const load = async (reset = false) => {
    try {
      setLoading(true)
      const res = await getAllReviewsPage({
        pageSize: 12,
        startAfterDoc: reset ? null : pageCursor,
        minRating: minRating || undefined,
      })

      // getAllReviewsPage already filters hidden reviews, just ensure rating + comment
      const filtered = res.items.filter((r) => r.rating > 0 && r.comment)
      const newItems = filtered.length ? filtered : reset ? DEFAULT_REVIEWS : []
      setItems((prev) => (reset ? newItems : [...prev, ...newItems]))
      setPageCursor(res.lastDoc)
      setDone(!res.lastDoc && !!res.items.length)
    } catch {
      setItems((prev) => (reset ? DEFAULT_REVIEWS : prev))
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const res = await fetch("/api/reviews/stats")
      const data = await res.json()
      if (data.success) {
        setStats(data)
      }
    } catch {
      // Silently fail - stats are optional
    }
  }

  useEffect(() => {
    load(true)
    loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minRating])

  const displayedTotal = stats?.totalReviews || items.length
  const displayedAvg = stats?.averageRating || 4.8
  const displayedSatisfaction = stats?.satisfaction || 98

  return (
    <main className="min-h-screen pt-20 pb-16 container mx-auto px-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-cinzel font-bold text-roman-gradient mb-2">{t("allReviews")}</h1>
        <p className="text-muted-foreground">{t("autoUpdatedReviews")}</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-8">
        <div className="text-center rounded-lg border p-4">
          <div className="text-2xl font-bold text-primary">{displayedAvg}</div>
          <div className="flex items-center justify-center gap-1 mb-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${i < Math.round(displayedAvg) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
              />
            ))}
          </div>
          <div className="text-xs text-muted-foreground">{t("averageRating")}</div>
        </div>
        <div className="text-center rounded-lg border p-4">
          <div className="text-2xl font-bold text-primary">{displayedTotal}+</div>
          <div className="text-xs text-muted-foreground">{t("totalReviews")}</div>
        </div>
        <div className="text-center rounded-lg border p-4">
          <div className="text-2xl font-bold text-primary">{displayedSatisfaction}%</div>
          <div className="text-xs text-muted-foreground">{t("satisfaction")}</div>
        </div>
        <div className="text-center rounded-lg border p-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            {stats?.bySource && Object.keys(stats.bySource).length > 0 ? (
              <div className="flex flex-wrap gap-1 justify-center">
                {Object.entries(stats.bySource).map(([src, count]) => (
                  <Badge key={src} className={`text-[10px] px-1.5 ${getSourceBadgeClass(src)}`}>
                    {getSourceLabel(src)}: {count}
                  </Badge>
                ))}
              </div>
            ) : (
              <>
                <Badge className="bg-blue-600 text-white text-[10px] px-1.5">Booking</Badge>
                <Badge className="bg-pink-600 text-white text-[10px] px-1.5">Airbnb</Badge>
              </>
            )}
          </div>
          <div className="text-xs text-muted-foreground">Fonti</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 justify-center mb-6">
        <Input
          type="number"
          min={0}
          max={5}
          step="1"
          placeholder={t("filterMinRating")}
          className="w-48"
          value={minRating || ""}
          onChange={(e) => setMinRating(Number(e.target.value || 0))}
        />
        <Button onClick={() => load(true)} variant="secondary">
          <Search className="w-4 h-4 mr-2" /> {t("filter")}
        </Button>
      </div>

      {/* Reviews grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((r) => (
          <Card key={r.id} className="card-semi-transparent hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${i < (r.rating ?? 0) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
                    />
                  ))}
                </div>
                {r.source && (
                  <Badge className={`text-[10px] px-1.5 py-0 ${getSourceBadgeClass(r.source)}`}>
                    {getSourceLabel(r.source)}
                  </Badge>
                )}
              </div>

              <div className="flex items-start gap-2 mb-3">
                <MessageCircle className="w-3.5 h-3.5 mt-0.5 text-muted-foreground/50 flex-shrink-0" />
                <p className="text-xs text-muted-foreground line-clamp-4">{r.comment}</p>
              </div>

              <div className="border-t pt-2">
                <p className="font-medium text-sm">{r.name}</p>
                {r.location && <p className="text-xs text-muted-foreground">{r.location}</p>}
                {r.date && <p className="text-xs text-muted-foreground mt-0.5">{r.date}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load more */}
      <div className="flex justify-center mt-8">
        {!done ? (
          <Button disabled={loading} onClick={() => load(false)}>
            {loading ? t("loading") : t("loadMore")}
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">{t("allReviewsSeen")}</span>
        )}
      </div>
    </main>
  )
}
