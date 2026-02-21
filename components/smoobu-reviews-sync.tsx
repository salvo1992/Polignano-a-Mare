"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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
  Users,
  Zap,
  Clock,
  Edit3,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ReviewForm {
  name: string
  location: string
  rating: number
  comment: string
  source: string
  date: string
  bookingId?: string
}

interface CompletedBooking {
  id: string
  firstName: string
  lastName: string
  arrival: string
  departure: string
  referer: string
  roomId: string
  channelName?: string
  apiSource?: string
}

interface ExistingReview {
  id: string
  name: string
  rating: number
  comment: string
  source: string
  date: string
  location?: string
  pendingReview?: boolean
  bookingId?: string
}

interface ReviewStats {
  total: number
  completed: number
  pending: number
  averageRating: number
  bySource: Record<string, number>
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
  const [autoSyncing, setAutoSyncing] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [review, setReview] = useState<ReviewForm>({ ...emptyReview })
  const [recentReviews, setRecentReviews] = useState<Array<ReviewForm & { id?: string }>>([])

  // Smoobu completed bookings
  const [completedBookings, setCompletedBookings] = useState<CompletedBooking[]>([])
  const [loadingBookings, setLoadingBookings] = useState(false)

  // Firebase reviews
  const [existingReviews, setExistingReviews] = useState<ExistingReview[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [stats, setStats] = useState<ReviewStats | null>(null)

  // Edit mode for pending reviews
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null)

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

      const response = await fetch(`/api/smoobu/sync-bookings?from=${from}&to=${to}&source=all`)
      const data = await response.json()

      if (response.ok && data.bookings) {
        const completed = data.bookings.filter(
          (b: CompletedBooking & { status?: string }) =>
            new Date(b.departure) < now && b.referer !== "blocked" && (b as any).status !== "blocked",
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
      const response = await fetch("/api/smoobu/sync-reviews?limit=200")
      const data = await response.json()

      if (response.ok && data.reviews) {
        setExistingReviews(data.reviews)
      }
      if (data.stats) {
        setStats(data.stats)
      }
    } catch (err) {
      console.error("[Reviews] Error fetching existing reviews:", err)
    } finally {
      setLoadingReviews(false)
    }
  }

  // Auto-sync: create review stubs from completed Smoobu bookings
  const autoSyncFromBookings = useCallback(async () => {
    if (completedBookings.length === 0) {
      setError("Nessuna prenotazione completata da sincronizzare. Aggiorna prima le prenotazioni.")
      return
    }

    setAutoSyncing(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/smoobu/sync-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "auto-sync-from-bookings",
          bookings: completedBookings,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Errore nella sincronizzazione automatica")
      }

      setResult({ success: true, message: data.message })
      fetchExistingReviews()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto")
    } finally {
      setAutoSyncing(false)
    }
  }, [completedBookings])

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
      setEditingReviewId(null)
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

  // Pre-fill from a completed booking
  const prefillFromBooking = (booking: CompletedBooking) => {
    const arrivalDate = new Date(booking.arrival)
    const dateStr = arrivalDate.toLocaleDateString("it-IT", { month: "long", year: "numeric" })

    setReview({
      name: `${booking.firstName} ${booking.lastName}`.trim(),
      location: "",
      rating: 5,
      comment: "",
      source: booking.referer || "manual",
      date: dateStr,
      bookingId: booking.id,
    })
    setEditingReviewId(null)
  }

  // Edit a pending review
  const editPendingReview = (rev: ExistingReview) => {
    setReview({
      name: rev.name,
      location: rev.location || "",
      rating: rev.rating || 5,
      comment: rev.comment || "",
      source: rev.source || "manual",
      date: rev.date || "",
      bookingId: rev.bookingId,
    })
    setEditingReviewId(rev.id)
  }

  // Bookings that don't have reviews yet
  const bookingsWithoutReviews = completedBookings.filter((b) => {
    const guestName = `${b.firstName} ${b.lastName}`.trim().toLowerCase()
    return !existingReviews.some(
      (r) => r.name.toLowerCase() === guestName || r.bookingId === b.id,
    )
  })

  // Pending reviews (have booking stub but no comment yet)
  const pendingReviews = existingReviews.filter(
    (r) => r.pendingReview === true && (!r.comment || r.rating === 0),
  )

  // Completed reviews (have rating + comment)
  const completedReviewsList = existingReviews.filter(
    (r) => r.rating > 0 && r.comment,
  )

  const getSourceColor = (source: string) => {
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

  const getSourceLabel = (source: string) => {
    switch (source) {
      case "booking":
        return "Booking.com"
      case "airbnb":
        return "Airbnb"
      case "expedia":
        return "Expedia"
      case "direct":
        return "Diretta"
      default:
        return source
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Recensioni da Smoobu
        </CardTitle>
        <CardDescription>
          Recupera automaticamente le prenotazioni completate da Smoobu e gestisci le recensioni.
          Le recensioni verranno mostrate nella pagina Recensioni e nella Home.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auto-sync bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border p-4 bg-muted/20">
          <div>
            <p className="text-sm font-medium">Sincronizzazione automatica da Smoobu</p>
            <p className="text-xs text-muted-foreground">
              {loadingBookings
                ? "Caricamento prenotazioni..."
                : `${completedBookings.length} prenotazioni completate, ${bookingsWithoutReviews.length} senza recensione`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                fetchCompletedBookings()
                fetchExistingReviews()
              }}
              disabled={loadingBookings || loadingReviews}
              variant="outline"
              size="sm"
            >
              {loadingBookings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span className="ml-1.5">Aggiorna</span>
            </Button>
            <Button
              onClick={autoSyncFromBookings}
              disabled={autoSyncing || completedBookings.length === 0}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {autoSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              <span className="ml-1.5">Auto-Sync Recensioni</span>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border p-3 text-center">
            <p className="text-2xl font-bold">{stats?.completed ?? completedReviewsList.length}</p>
            <p className="text-xs text-muted-foreground">Recensioni pubblicate</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats?.pending ?? pendingReviews.length}</p>
            <p className="text-xs text-muted-foreground">In attesa</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-2xl font-bold">{completedBookings.length}</p>
            <p className="text-xs text-muted-foreground">Soggiorni completati</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <p className="text-2xl font-bold">{stats?.averageRating?.toFixed(1) ?? "0"}</p>
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            </div>
            <p className="text-xs text-muted-foreground">Media voto</p>
          </div>
        </div>

        {/* Pending reviews - reviews that need the admin to fill in */}
        {pendingReviews.length > 0 && (
          <div className="space-y-3 rounded-lg border p-4 bg-amber-50/50">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-amber-800">
              <Clock className="w-4 h-4" />
              Recensioni in attesa ({pendingReviews.length})
            </h4>
            <p className="text-xs text-muted-foreground">
              Queste prenotazioni sono state sincronizzate da Smoobu. Clicca per aggiungere il testo della recensione
              copiandolo dal portale originale.
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {pendingReviews.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => editPendingReview(r)}
                  className={`w-full flex items-center justify-between p-2 rounded-md border text-sm transition-colors text-left ${
                    editingReviewId === r.id
                      ? "bg-amber-100 border-amber-300"
                      : "hover:bg-amber-50 border-amber-200"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${getSourceColor(r.source)}`}>{getSourceLabel(r.source)}</Badge>
                    <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Completed bookings without any review entry */}
        {bookingsWithoutReviews.length > 0 && (
          <div className="space-y-3 rounded-lg border p-4">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" />
              Ospiti senza recensione ({bookingsWithoutReviews.length})
            </h4>
            <p className="text-xs text-muted-foreground">
              Clicca su un ospite per pre-compilare il modulo, oppure usa "Auto-Sync" per creare stub automaticamente.
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
                  <Badge className={`text-xs ml-2 ${getSourceColor(b.referer)}`}>{getSourceLabel(b.referer)}</Badge>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add / Edit Review Form */}
        <div className="space-y-4 rounded-lg border p-4">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {editingReviewId ? "Completa Recensione" : "Aggiungi Recensione"}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="review-name">Nome ospite *</Label>
              <Input
                id="review-name"
                placeholder="es. Marco Rossi"
                value={review.name}
                onChange={(e) => setReview((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-location">Provenienza</Label>
              <Input
                id="review-location"
                placeholder="es. Milano, Italia"
                value={review.location}
                onChange={(e) => setReview((prev) => ({ ...prev, location: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fonte *</Label>
              <Select value={review.source} onValueChange={(val) => setReview((prev) => ({ ...prev, source: val }))}>
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
                onChange={(e) => setReview((prev) => ({ ...prev, date: e.target.value }))}
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
                      star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">{review.rating}/5</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="review-comment">Testo recensione *</Label>
            <Textarea
              id="review-comment"
              placeholder="Incolla qui il testo della recensione dal portale Booking.com, Airbnb, ecc..."
              rows={4}
              value={review.comment}
              onChange={(e) => setReview((prev) => ({ ...prev, comment: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleAddReview} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  {editingReviewId ? "Salva Recensione" : "Aggiungi Recensione"}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setReview({ ...emptyReview })
                setEditingReviewId(null)
              }}
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

        {/* Recently added reviews this session */}
        {recentReviews.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Aggiunte di recente in questa sessione</h4>
            <div className="space-y-2">
              {recentReviews.map((r, i) => (
                <div key={r.id || i} className="flex items-center gap-3 rounded-md border p-3 text-sm">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${
                          s < r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-medium">{r.name}</span>
                  <Badge className={`text-xs ${getSourceColor(r.source)}`}>{getSourceLabel(r.source)}</Badge>
                  <span className="text-muted-foreground truncate flex-1">{r.comment.substring(0, 60)}...</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last completed reviews in Firebase */}
        {completedReviewsList.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="text-sm font-medium">Ultime recensioni pubblicate ({completedReviewsList.length})</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {completedReviewsList.slice(0, 10).map((r) => (
                <div key={r.id} className="flex items-start gap-3 rounded-md border p-3 text-sm">
                  <div className="flex items-center gap-0.5 pt-0.5">
                    {[...Array(5)].map((_, s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${
                          s < r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.name}</span>
                      <Badge className={`text-xs ${getSourceColor(r.source)}`}>{getSourceLabel(r.source)}</Badge>
                    </div>
                    <p className="text-muted-foreground line-clamp-2 mt-0.5">{r.comment}</p>
                    {r.date && <p className="text-xs text-muted-foreground mt-1">{r.date}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info footer */}
        <div className="pt-4 border-t space-y-3">
          <h4 className="text-sm font-medium">Come funziona</h4>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <Zap className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-600" />
              <p>
                <strong>Auto-Sync:</strong> Crea automaticamente uno stub per ogni prenotazione completata da Smoobu
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Edit3 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-600" />
              <p>
                <strong>In attesa:</strong> Clicca su uno stub per compilare la recensione copiandola dal portale
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-green-600" />
              <p>
                <strong>Pubblicata:</strong> Le recensioni completate appaiono nella Home e nella pagina Recensioni
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
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
            <Badge className="bg-emerald-600 text-white">
              <Star className="w-3 h-3 mr-1" />
              Dirette
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
