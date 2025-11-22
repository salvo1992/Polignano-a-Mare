"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Clock, CheckCircle2, XCircle } from "lucide-react"
import { useAuth } from "@/components/auth-provider"

interface ServiceRequest {
  id: string
  services: Array<{ name: string; price: number }>
  notes: string
  status: "pending" | "confirmed" | "cancelled"
  createdAt: string
  userEmail: string
  userName: string
}

export function UserServicesRequests() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.email) return

    const loadRequests = async () => {
      try {
        const response = await fetch(`/api/extra-services/list?userEmail=${encodeURIComponent(user.email)}`)
        if (response.ok) {
          const data = await response.json()
          setRequests(data.requests || [])
        }
      } catch (error) {
        console.error("[v0] Error loading service requests:", error)
      } finally {
        setLoading(false)
      }
    }

    loadRequests()
  }, [user])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Richieste Servizi Extra
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Caricamento...</p>
        </CardContent>
      </Card>
    )
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Richieste Servizi Extra
          </CardTitle>
          <CardDescription>Nessuna richiesta di servizi extra effettuata</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            In Attesa
          </Badge>
        )
      case "confirmed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Confermata
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Annullata
          </Badge>
        )
      default:
        return null
    }
  }

  const totalPrice = (services: Array<{ price: number }>) => {
    return services.reduce((sum, s) => sum + s.price, 0)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Richieste Servizi Extra
        </CardTitle>
        <CardDescription>Visualizza lo stato delle tue richieste di servizi aggiuntivi</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests.map((request) => (
          <div key={request.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="font-medium">Richiesta del {new Date(request.createdAt).toLocaleDateString("it-IT")}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {request.services.length} serviz{request.services.length > 1 ? "i" : "io"} richiesti
                </p>
              </div>
              {getStatusBadge(request.status)}
            </div>

            <div className="space-y-2">
              {request.services.map((service, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>{service.name}</span>
                  <span className="font-medium">€{service.price}</span>
                </div>
              ))}
            </div>

            {request.notes && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">Note:</p>
                <p className="text-sm mt-1">{request.notes}</p>
              </div>
            )}

            <div className="pt-2 border-t flex justify-between items-center">
              <span className="text-sm font-semibold">Totale Stimato:</span>
              <span className="text-lg font-bold text-primary">€{totalPrice(request.services)}</span>
            </div>

            {request.status === "pending" && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Il gestore ti risponderà via email per confermare la disponibilità e fornirti i dettagli di pagamento.
                </p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
