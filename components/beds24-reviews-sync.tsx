"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, Download, MessageCircle, AlertCircle, CheckCircle2 } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function Beds24ReviewsSync() {
  const { t } = useLanguage()
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [syncResult, setSyncResult] = useState<{
    success: boolean
    synced: number
    skipped: number
    total: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const syncReviews = async () => {
    setSyncing(true)
    setError(null)
    setSyncResult(null)

    try {
      const response = await fetch("/api/beds24/sync-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync reviews")
      }

      setSyncResult(data)
      setLastSync(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          {t("reviewsSync")}
        </CardTitle>
        <CardDescription>{t("syncReviewsFromBeds24")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{t("lastSync")}</p>
            <p className="text-xs text-muted-foreground">
              {lastSync ? lastSync.toLocaleString("it-IT") : t("neverSynced")}
            </p>
          </div>
          <Button onClick={syncReviews} disabled={syncing}>
            {syncing ? (
              <>
                <Star className="w-4 h-4 mr-2 animate-spin" />
                {t("syncing")}
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                {t("syncReviews")}
              </>
            )}
          </Button>
        </div>

        {syncResult && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium text-green-900">{t("syncSuccessful")}</p>
                <div className="flex gap-4 text-sm text-green-800">
                  <span>
                    {t("synced")}: <strong>{syncResult.synced}</strong>
                  </span>
                  <span>
                    {t("skipped")}: <strong>{syncResult.skipped}</strong>
                  </span>
                  <span>
                    {t("total")}: <strong>{syncResult.total}</strong>
                  </span>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="pt-4 border-t space-y-3">
          <h4 className="text-sm font-medium">{t("reviewsSources")}</h4>
          <div className="flex gap-2">
            <Badge className="bg-blue-600">
              <Star className="w-3 h-3 mr-1" />
              Booking.com
            </Badge>
            <Badge className="bg-pink-600">
              <Star className="w-3 h-3 mr-1" />
              Airbnb
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{t("reviewsSyncNote")}</p>
        </div>
      </CardContent>
    </Card>
  )
}
