"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Download, Calendar, AlertCircle, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function Beds24SyncPanel() {
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [syncResult, setSyncResult] = useState<{
    success: boolean
    synced: number
    skipped: number
    total: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const syncLockRef = useRef(false)
  const hasAutoSyncedRef = useRef(false)

  useEffect(() => {
    if (!hasAutoSyncedRef.current) {
      hasAutoSyncedRef.current = true
      syncBookings()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const syncBookings = async () => {
    if (syncLockRef.current) {
      console.log("[v0] Sync already in progress, skipping")
      return
    }

    syncLockRef.current = true
    setSyncing(true)
    setError(null)
    setSyncResult(null)

    try {
      const from = new Date()
      from.setMonth(from.getMonth() - 6)
      const to = new Date()
      to.setFullYear(to.getFullYear() + 1)

      const response = await fetch("/api/beds24/sync-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: from.toISOString().split("T")[0],
          to: to.toISOString().split("T")[0],
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Sincronizzazione fallita")
      }

      setSyncResult(data)
      setLastSync(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto")
    } finally {
      setSyncing(false)
      syncLockRef.current = false
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Sincronizzazione Beds24
        </CardTitle>
        <CardDescription>Sincronizza prenotazioni da Airbnb e Booking.com</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Ultima sincronizzazione</p>
            <p className="text-xs text-muted-foreground">
              {lastSync ? lastSync.toLocaleString("it-IT") : "Mai sincronizzato"}
            </p>
          </div>
          <Button onClick={syncBookings} disabled={syncing}>
            {syncing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Sincronizzazione...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Sincronizza Ora
              </>
            )}
          </Button>
        </div>

        {syncResult && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium text-green-900">Sincronizzazione completata!</p>
                <div className="flex gap-4 text-sm text-green-800">
                  <span>
                    Sincronizzate: <strong>{syncResult.synced}</strong>
                  </span>
                  <span>
                    Saltate: <strong>{syncResult.skipped}</strong>
                  </span>
                  <span>
                    Totali: <strong>{syncResult.total}</strong>
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
          <h4 className="text-sm font-medium">Informazioni</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>Sincronizza automaticamente all'apertura del pannello admin</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>Previene automaticamente doppie prenotazioni</p>
            </div>
            <div className="flex items-start gap-2">
              <RefreshCw className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>Ricevi aggiornamenti in tempo reale tramite webhook</p>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Badge className="bg-blue-600">Booking.com</Badge>
            <Badge className="bg-pink-600">Airbnb</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

