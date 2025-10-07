"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Cookie, Settings, X, Check } from "lucide-react"

interface CookiePreferences {
  necessary: boolean
  analytics: boolean
  marketing: boolean
}

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always true, cannot be disabled
    analytics: false,
    marketing: false,
  })

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem("cookie-consent")
    if (!consent) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => setShowBanner(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const acceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
    }
    setPreferences(allAccepted)
    saveCookiePreferences(allAccepted)
    setShowBanner(false)
    setShowSettings(false)
  }

  const acceptNecessaryOnly = () => {
    const necessaryOnly = {
      necessary: true,
      analytics: false,
      marketing: false,
    }
    setPreferences(necessaryOnly)
    saveCookiePreferences(necessaryOnly)
    setShowBanner(false)
    setShowSettings(false)
  }

  const saveCustomPreferences = () => {
    saveCookiePreferences(preferences)
    setShowBanner(false)
    setShowSettings(false)
  }

  const saveCookiePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem("cookie-consent", JSON.stringify(prefs))
    localStorage.setItem("cookie-consent-date", new Date().toISOString())

    // Here you would typically initialize your analytics/marketing scripts
    if (prefs.analytics) {
      console.log("[v0] Analytics cookies enabled")
      // Initialize Google Analytics, etc.
    }
    if (prefs.marketing) {
      console.log("[v0] Marketing cookies enabled")
      // Initialize marketing pixels, etc.
    }
  }

  const togglePreference = (type: keyof CookiePreferences) => {
    if (type === "necessary") return // Cannot disable necessary cookies
    setPreferences((prev) => ({
      ...prev,
      [type]: !prev[type],
    }))
  }

  if (!showBanner) return null

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur-md border-t border-border/50 animate-slide-in-up">
        <div className="container mx-auto max-w-6xl">
          <Card className="card-enhanced border-primary/20 bg-gradient-to-r from-background to-primary/5">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <Cookie className="w-8 h-8 text-primary animate-bounce" />
                  <div>
                    <h3 className="font-cinzel text-lg font-semibold text-primary mb-2">
                      🍪 Utilizziamo i Cookie per Migliorare la Tua Esperienza
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Utilizziamo cookie tecnici necessari per il funzionamento del sito e cookie opzionali per analisi
                      e marketing. Puoi scegliere quali accettare.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => setShowSettings(true)}
                    className="bg-transparent hover:bg-primary/10 border-primary/30"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Personalizza
                  </Button>
                  <Button variant="outline" onClick={acceptNecessaryOnly} className="bg-transparent hover:bg-muted/50">
                    Solo Necessari
                  </Button>
                  <Button
                    onClick={acceptAll}
                    className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Accetta Tutti
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cookie Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto card-enhanced">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Cookie className="w-6 h-6 text-primary" />
                  <h2 className="text-xl font-cinzel font-bold text-primary">Impostazioni Cookie</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)} className="hover:bg-muted/50">
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Necessary Cookies */}
                <div className="border border-border/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">Cookie Necessari</h3>
                      <Badge className="bg-green-100 text-green-800 text-xs">Sempre Attivi</Badge>
                    </div>
                    <div className="w-12 h-6 bg-green-500 rounded-full flex items-center justify-end px-1">
                      <div className="w-4 h-4 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Essenziali per il funzionamento del sito: autenticazione, sicurezza, preferenze di base.
                  </p>
                </div>

                {/* Analytics Cookies */}
                <div className="border border-border/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">Cookie Analitici</h3>
                      <Badge variant="outline" className="text-xs">
                        Opzionali
                      </Badge>
                    </div>
                    <button
                      onClick={() => togglePreference("analytics")}
                      className={`w-12 h-6 rounded-full flex items-center transition-all duration-300 ${
                        preferences.analytics ? "bg-primary justify-end" : "bg-gray-300 justify-start"
                      }`}
                    >
                      <div className="w-4 h-4 bg-white rounded-full mx-1"></div>
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ci aiutano a capire come utilizzi il sito per migliorare l'esperienza utente.
                  </p>
                </div>

                {/* Marketing Cookies */}
                <div className="border border-border/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">Cookie Marketing</h3>
                      <Badge variant="outline" className="text-xs">
                        Opzionali
                      </Badge>
                    </div>
                    <button
                      onClick={() => togglePreference("marketing")}
                      className={`w-12 h-6 rounded-full flex items-center transition-all duration-300 ${
                        preferences.marketing ? "bg-primary justify-end" : "bg-gray-300 justify-start"
                      }`}
                    >
                      <div className="w-4 h-4 bg-white rounded-full mx-1"></div>
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Utilizzati per personalizzare la pubblicità e misurarne l'efficacia.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <Button
                  variant="outline"
                  onClick={acceptNecessaryOnly}
                  className="flex-1 bg-transparent hover:bg-muted/50"
                >
                  Solo Necessari
                </Button>
                <Button
                  onClick={saveCustomPreferences}
                  className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                >
                  Salva Preferenze
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
