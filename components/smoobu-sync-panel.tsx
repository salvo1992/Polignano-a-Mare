"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Download, Calendar, AlertCircle, CheckCircle2, AlertTriangle, Clock, Zap } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

const AUTO_SYNC_INTERVAL = 10 * 60 * 1000 // 10 minuti

export function SmoobuSyncPanel() {
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [nextAutoSync, setNextAutoSync] = useState<Date | null>(null)
  const [syncResult, setSyncResult] = useState<{
    success: boolean
    synced: number
    skipped: number
    total: number
    breakdown?: {
      booking: number
      airbnb: number
      expedia: number
      direct: number
      other: number
    }
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const syncLockRef = useRef(false)
  const hasAutoSyncedRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const syncBookingsAuto = useCallback(async () => {
    if (syncLockRef.current) return
    syncLockRef.current = true
    setSyncing(true)
    setError(null)

    try {
      const from = new Date()
      from.setMonth(from.getMonth() - 6)
      const to = new Date()
      to.setFullYear(to.getFullYear() + 1)

      const response = await fetch("/api/smoobu/sync-bookings", {
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
      setNextAutoSync(new Date(Date.now() + AUTO_SYNC_INTERVAL))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto")
    } finally {
      setSyncing(false)
      syncLockRef.current = false
    }
  }, [])

  // Auto-sync on mount + periodic interval
  useEffect(() => {
    if (!hasAutoSyncedRef.current) {
      hasAutoSyncedRef.current = true
      syncBookingsAuto()
    }

    intervalRef.current = setInterval(() => {
      syncBookingsAuto()
    }, AUTO_SYNC_INTERVAL)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [syncBookingsAuto])

  const syncBookings = async () => {
    await syncBookingsAuto()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Sincronizzazione Smoobu
        </CardTitle>
        <CardDescription>Sincronizza prenotazioni da Booking.com, Airbnb e Expedia</CardDescription>
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
          <div className="space-y-3">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="space-y-2">
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
                  {syncResult.breakdown && (
                    <div className="mt-3 pt-3 border-t border-green-300">
                      <p className="text-xs font-medium text-green-900 mb-2">Prenotazioni per fonte:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-green-800">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-600 text-white">Booking.com</Badge>
                          <span className="font-semibold">{syncResult.breakdown.booking}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-pink-600 text-white">Airbnb</Badge>
                          <span className="font-semibold">{syncResult.breakdown.airbnb}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-yellow-600 text-white">Expedia</Badge>
                          <span className="font-semibold">{syncResult.breakdown.expedia}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-600 text-white">Dirette</Badge>
                          <span className="font-semibold">{syncResult.breakdown.direct}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>

            {syncResult.breakdown && syncResult.breakdown.airbnb === 0 && (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-900">
                  <p className="font-medium mb-1">Nessuna prenotazione Airbnb trovata</p>
                  <p className="text-xs">
                    Verifica che Airbnb sia correttamente connesso al tuo account Smoobu. Se hai appena collegato
                    Airbnb, potrebbero volerci alcuni minuti prima che le prenotazioni vengano sincronizzate.
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="pt-4 border-t space-y-3">
          <h4 className="text-sm font-medium">Sincronizzazione Automatica</h4>
          
          <Alert className="bg-emerald-50 border-emerald-200">
            <Zap className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-900">
              <div className="space-y-1">
                <p className="font-medium">Sincronizzazione automatica attiva</p>
                <div className="text-xs space-y-0.5">
                  <p>Cron job server: ogni 2 ore (Smoobu &rarr; Firebase)</p>
                  <p>Auto-sync pannello: ogni 10 minuti mentre sei online</p>
                  <p>Webhook real-time: aggiornamenti istantanei da Smoobu</p>
                  {nextAutoSync && (
                    <p className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Prossimo auto-sync: {nextAutoSync.toLocaleTimeString("it-IT")}
                    </p>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>Sincronizza automaticamente all'apertura e ogni 10 minuti</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>Previene automaticamente doppie prenotazioni (dedup per smoobuId)</p>
            </div>
            <div className="flex items-start gap-2">
              <RefreshCw className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>Webhook real-time: aggiornamenti istantanei da Booking.com, Airbnb, Expedia</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Badge className="bg-blue-600 text-white">Booking.com</Badge>
            <Badge className="bg-pink-600 text-white">Airbnb</Badge>
            <Badge className="bg-yellow-600 text-white">Expedia</Badge>
            <Badge className="bg-green-600 text-white">Dirette</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
