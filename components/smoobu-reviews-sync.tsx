"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Star,
  Plus,
  MessageCircle,
  AlertCircle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Download,
  Users,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ReviewForm {
  name: string
  location: string
  rating: number
  comment: string
  source: string
  date: string
}

interface CompletedBooking {
  id: string
  firstName: string
  lastName: string
  arrival: string
  departure: string
  referer: string
  roomId: string
  channelName: string
}

interface ExistingReview {
  id: string
  name: string
  rating: number
  comment: string
  source: string
  date: string
  location?: string
}

const emptyReview: ReviewForm = {
  name: "",
  location: "",
  rating: 5,
  comment: "",
  source: "booking",
  date: "",
}

export function SmoobuReviewsSync() {
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [review, setReview] = useState<ReviewForm>({ ...emptyReview })
  const [recentReviews, setRecentReviews] = useState<Array<ReviewForm & { id?: string }>>([])

  // Completed bookings from Smoobu (potential review sources)
  const [completedBookings, setCompletedBookings] = useState<CompletedBooking[]>([])
  const [loadingBookings, setLoadingBookings] = useState(false)

  // Existing reviews from Firebase
  const [existingReviews, setExistingReviews] = useState<ExistingReview[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)

  const hasLoadedRef = useRef(false)

  // Auto-load on mount
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true
      fetchCompletedBookings()
      fetchExistingReviews()
    }
  }, [])

  const fetchCompletedBookings = async () => {
    setLoadingBookings(true)
    try {
      const now = new Date()
      const yearAgo = new Date(now)
      yearAgo.setFullYear(yearAgo.getFullYear() - 1)

      const from = yearAgo.toISOString().split("T")[0]
      const to = now.toISOString().split("T")[0]

      const response = await fetch(
        `/api/smoobu/sync-bookings?from=${from}&to=${to}&source=all`
      )
      const data = await response.json()

      if (response.ok && data.bookings) {
        // Filter only completed bookings (departure date in the past)
        const completed = data.bookings.filter(
          (b: any) =>
            new Date(b.departure) < now &&
            b.status !== "blocked" &&
            b.referer !== "blocked"
        )
        setCompletedBookings(completed)
      }
    } catch (err) {
      console.error("[Reviews] Error fetching completed bookings:", err)
    } finally {
      setLoadingBookings(false)
    }
  }

  const fetchExistingReviews = async () => {
    setLoadingReviews(true)
    try {
      const response = await fetch("/api/smoobu/sync-reviews")
      const data = await response.json()

      if (response.ok && data.reviews) {
        setExistingReviews(data.reviews)
      }
    } catch (err) {
      console.error("[Reviews] Error fetching existing reviews:", err)
    } finally {
      setLoadingReviews(false)
    }
  }

  const handleAddReview = async () => {
    if (!review.name || !review.comment || !review.rating) {
      setError("Nome, commento e rating sono obbligatori")
      return
    }

    setSaving(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/smoobu/sync-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-review",
          ...review,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Errore nell'aggiunta della recensione")
      }

      setResult({ success: true, message: data.message })
      setRecentReviews((prev) => [{ ...review, id: data.reviewId }, ...prev])
      setReview({ ...emptyReview })

      // Refresh existing reviews
      fetchExistingReviews()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto")
    } finally {
      setSaving(false)
    }
  }

  const handleRatingClick = (star: number) => {
    setReview((prev) => ({ ...prev, rating: star }))
  }

  // Pre-fill review form from a completed booking
  const prefillFromBooking = (booking: CompletedBooking) => {
    const sourceMap: Record<string, string> = {
      booking: "booking",
      airbnb: "airbnb",
      expedia: "expedia",
      direct: "direct",
    }
    const arrivalDate = new Date(booking.arrival)
    const dateStr = arrivalDate.toLocaleDateString("it-IT", {
      month: "long",
      year: "numeric",
    })

    setReview({
      name: `${booking.firstName} ${booking.lastName}`.trim(),
      location: "",
      rating: 5,
      comment: "",
      source: sourceMap[booking.referer] || "manual",
      date: dateStr,
    })
  }

  // Count bookings that don't have reviews yet
  const bookingsWithoutReviews = completedBookings.filter((b) => {
    const guestName = `${b.firstName} ${b.lastName}`.trim().toLowerCase()
    return !existingReviews.some(
      (r) => r.name.toLowerCase() === guestName
    )
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Recensioni da Smoobu
        </CardTitle>
        <CardDescription>
          Recupera le prenotazioni completate da Smoobu e gestisci le recensioni.
          Le recensioni vengono sincronizzate automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sync status */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Prenotazioni completate da Smoobu</p>
            <p className="text-xs text-muted-foreground">
              {loadingBookings
                ? "Caricamento..."
                : `${completedBookings.length} prenotazioni completate trovate`}
            </p>
          </div>
          <Button
            onClick={() => {
              fetchCompletedBookings()
              fetchExistingReviews()
            }}
            disabled={loadingBookings}
            variant="outline"
            size="sm"
          >
            {loadingBookings ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span className="ml-2">Aggiorna</span>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border p-3 text-center">
            <p className="text-2xl font-bold">{existingReviews.length}</p>
            <p className="text-xs text-muted-foreground">Recensioni salvate</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-2xl font-bold">{completedBookings.length}</p>
            <p className="text-xs text-muted-foreground">Soggiorni completati</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {bookingsWithoutReviews.length}
            </p>
            <p className="text-xs text-muted-foreground">Senza recensione</p>
          </div>
        </div>

        {/* Completed bookings without reviews */}
        {bookingsWithoutReviews.length > 0 && (
          <div className="space-y-3 rounded-lg border p-4">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" />
              Ospiti senza recensione ({bookingsWithoutReviews.length})
            </h4>
            <p className="text-xs text-muted-foreground">
              Clicca su un ospite per pre-compilare il modulo con i dati da Smoobu
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {bookingsWithoutReviews.slice(0, 20).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => prefillFromBooking(b)}
                  className="w-full flex items-center justify-between p-2 rounded-md border text-sm hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {b.firstName} {b.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(b.arrival).toLocaleDateString("it-IT")} &rarr;{" "}
                      {new Date(b.departure).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                  <Badge
                    className={`text-xs text-white ml-2 ${
                      b.referer === "booking"
                        ? "bg-blue-600"
                        : b.referer === "airbnb"
                          ? "bg-pink-600"
                          : b.referer === "expedia"
                            ? "bg-yellow-600"
                            : "bg-emerald-600"
                    }`}
                  >
                    {b.referer === "direct" ? "Diretta" : b.referer}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add Review Form */}
        <div className="space-y-4 rounded-lg border p-4">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Aggiungi Recensione
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="review-name">Nome ospite *</Label>
              <Input
                id="review-name"
                placeholder="es. Marco Rossi"
                value={review.name}
                onChange={(e) =>
                  setReview((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="review-location">Provenienza</Label>
              <Input
                id="review-location"
                placeholder="es. Milano, Italia"
                value={review.location}
                onChange={(e) =>
                  setReview((prev) => ({ ...prev, location: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fonte *</Label>
              <Select
                value={review.source}
                onValueChange={(val) =>
                  setReview((prev) => ({ ...prev, source: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona fonte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="booking">Booking.com</SelectItem>
                  <SelectItem value="airbnb">Airbnb</SelectItem>
                  <SelectItem value="expedia">Expedia</SelectItem>
                  <SelectItem value="direct">Prenotazione diretta</SelectItem>
                  <SelectItem value="manual">Altro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="review-date">Data (opzionale)</Label>
              <Input
                id="review-date"
                placeholder="es. Gennaio 2025"
                value={review.date}
                onChange={(e) =>
                  setReview((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rating *</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRatingClick(star)}
                  className="p-0.5 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= review.rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {review.rating}/5
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="review-comment">Testo recensione *</Label>
            <Textarea
              id="review-comment"
              placeholder="Incolla qui il testo della recensione dal portale Booking.com, Airbnb, ecc..."
              rows={4}
              value={review.comment}
              onChange={(e) =>
                setReview((prev) => ({ ...prev, comment: e.target.value }))
              }
            />
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleAddReview} disabled={saving}>
              {saving ? (
                <>
                  <Star className="w-4 h-4 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Aggiungi Recensione
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => setReview({ ...emptyReview })}
              disabled={saving}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Cancella
            </Button>
          </div>
        </div>

        {/* Result messages */}
        {result && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <p className="font-medium text-green-900">{result.message}</p>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Recently added reviews */}
        {recentReviews.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">
              Aggiunte di recente in questa sessione
            </h4>
            <div className="space-y-2">
              {recentReviews.map((r, i) => (
                <div
                  key={r.id || i}
                  className="flex items-center gap-3 rounded-md border p-3 text-sm"
                >
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${
                          s < r.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-medium">{r.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {r.source === "booking"
                      ? "Booking.com"
                      : r.source === "airbnb"
                        ? "Airbnb"
                        : r.source}
                  </Badge>
                  <span className="text-muted-foreground truncate flex-1">
                    {r.comment.substring(0, 60)}...
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Source badges */}
        <div className="pt-4 border-t space-y-3">
          <h4 className="text-sm font-medium">Fonti supportate</h4>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-blue-600 text-white">
              <Star className="w-3 h-3 mr-1" />
              Booking.com
            </Badge>
            <Badge className="bg-pink-600 text-white">
              <Star className="w-3 h-3 mr-1" />
              Airbnb
            </Badge>
            <Badge className="bg-yellow-600 text-white">
              <Star className="w-3 h-3 mr-1" />
              Expedia
            </Badge>
            <Badge className="bg-green-600 text-white">
              <Star className="w-3 h-3 mr-1" />
              Dirette
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Le prenotazioni completate vengono recuperate automaticamente da
            Smoobu. Seleziona un ospite dalla lista per aggiungere velocemente
            la sua recensione copiandola dal portale originale (Booking.com,
            Airbnb, ecc.).
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
