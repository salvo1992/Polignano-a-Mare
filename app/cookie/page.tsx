"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Cookie, Settings, BarChart, Eye } from "lucide-react"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import { useState, useEffect } from "react"

interface CookiePreferences {
  necessary: boolean
  analytics: boolean
  marketing: boolean
}

export default function CookiePage() {
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation()
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
  })
  const [isLoaded, setIsLoaded] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  useEffect(() => {
    const loadPreferences = () => {
      try {
        const saved = localStorage.getItem("cookie-consent")
        if (saved) {
          const parsedPrefs = JSON.parse(saved)
          setPreferences(parsedPrefs)
          console.log("[v0] Loaded preferences:", parsedPrefs)
        }
      } catch (error) {
        console.log("[v0] Error loading preferences:", error)
      }
      setIsLoaded(true)
    }

    loadPreferences()
  }, [])

  const showNotification = (message: string) => {
    setNotification(message)
    setTimeout(() => setNotification(null), 3000)
  }

  const savePreferences = (newPrefs: CookiePreferences) => {
    try {
      localStorage.setItem("cookie-consent", JSON.stringify(newPrefs))
      localStorage.setItem("cookie-consent-date", new Date().toISOString())
      localStorage.setItem("cookie-banner-dismissed", "true")

      setPreferences(newPrefs)

      if (newPrefs.analytics) {
        console.log("[v0] Analytics cookies enabled")
      }
      if (newPrefs.marketing) {
        console.log("[v0] Marketing cookies enabled")
      }

      return true
    } catch (error) {
      console.log("[v0] Error saving preferences:", error)
      return false
    }
  }

  const acceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
    }

    if (savePreferences(allAccepted)) {
      showNotification("✅ Tutte le preferenze cookie sono state salvate!")
    } else {
      showNotification("❌ Errore nel salvare le preferenze")
    }
  }

  const acceptNecessaryOnly = () => {
    const necessaryOnly = {
      necessary: true,
      analytics: false,
      marketing: false,
    }

    if (savePreferences(necessaryOnly)) {
      showNotification("✅ Solo i cookie necessari sono stati accettati!")
    } else {
      showNotification("❌ Errore nel salvare le preferenze")
    }
  }

  const togglePreference = (type: keyof CookiePreferences) => {
    if (type === "necessary") return

    const newPreferences = {
      ...preferences,
      [type]: !preferences[type],
    }

    setPreferences(newPreferences)
  }

  const saveCustomPreferences = () => {
    if (savePreferences(preferences)) {
      showNotification("✅ Le tue preferenze cookie sono state salvate!")
    } else {
      showNotification("❌ Errore nel salvare le preferenze")
    }
  }

  if (!isLoaded) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      <Header />

      {notification && (
        <div className="fixed top-24 right-4 z-50 bg-primary text-primary-foreground px-6 py-3 rounded-lg shadow-lg animate-slide-in-right">
          {notification}
        </div>
      )}

      <div className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Hero Section */}
          <div
            ref={heroRef}
            className={`text-center mb-12 transition-all duration-1000 ${heroVisible ? "animate-fade-in-up opacity-100" : "opacity-0 translate-y-[50px]"}`}
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Cookie className="w-8 h-8 text-primary animate-pulse" />
              <h1 className="text-4xl md:text-6xl font-cinzel font-bold text-roman-gradient animate-text-shimmer">
                Cookie Policy
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Scopri come utilizziamo i cookie per migliorare la tua esperienza sul nostro sito.
            </p>
          </div>

          <div className="space-y-8">
            <Card className="card-invisible bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Settings className="w-5 h-5" />
                  Gestisci le Tue Preferenze Cookie
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground">
                  Personalizza le tue preferenze sui cookie. Puoi modificarle in qualsiasi momento.
                </p>

                <div className="grid gap-4">
                  {/* Necessary Cookies */}
                  <div className="flex items-center justify-between p-4 border border-border/50 rounded-lg bg-green-50/50">
                    <div>
                      <h4 className="font-semibold text-green-800">Cookie Necessari</h4>
                      <p className="text-sm text-green-600">Sempre attivi - Essenziali per il funzionamento</p>
                    </div>
                    <div className="w-12 h-6 bg-green-500 rounded-full flex items-center justify-end px-1">
                      <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                    </div>
                  </div>

                  {/* Analytics Cookies */}
                  <div className="flex items-center justify-between p-4 border border-border/50 rounded-lg hover:bg-muted/20 transition-colors">
                    <div>
                      <h4 className="font-semibold">Cookie Analitici</h4>
                      <p className="text-sm text-muted-foreground">Ci aiutano a migliorare il sito</p>
                    </div>
                    <button
                      onClick={() => togglePreference("analytics")}
                      className={`w-12 h-6 rounded-full flex items-center transition-all duration-300 shadow-inner ${
                        preferences.analytics ? "bg-primary justify-end" : "bg-gray-300 justify-start"
                      }`}
                    >
                      <div className="w-4 h-4 bg-white rounded-full mx-1 shadow-sm"></div>
                    </button>
                  </div>

                  {/* Marketing Cookies */}
                  <div className="flex items-center justify-between p-4 border border-border/50 rounded-lg hover:bg-muted/20 transition-colors">
                    <div>
                      <h4 className="font-semibold">Cookie Marketing</h4>
                      <p className="text-sm text-muted-foreground">Per pubblicità personalizzata</p>
                    </div>
                    <button
                      onClick={() => togglePreference("marketing")}
                      className={`w-12 h-6 rounded-full flex items-center transition-all duration-300 shadow-inner ${
                        preferences.marketing ? "bg-primary justify-end" : "bg-gray-300 justify-start"
                      }`}
                    >
                      <div className="w-4 h-4 bg-white rounded-full mx-1 shadow-sm"></div>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    onClick={acceptNecessaryOnly}
                    variant="outline"
                    className="flex-1 bg-transparent hover:bg-muted/50 transition-all duration-300"
                  >
                    Solo Necessari
                  </Button>
                  <Button
                    onClick={saveCustomPreferences}
                    className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all duration-300 hover:scale-105"
                  >
                    Salva Preferenze
                  </Button>
                  <Button
                    onClick={acceptAll}
                    className="flex-1 bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 transition-all duration-300 hover:scale-105"
                  >
                    Accetta Tutti
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="card-invisible">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Cookie className="w-5 h-5" />
                  Cosa Sono i Cookie
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  I cookie sono piccoli file di testo che vengono memorizzati sul tuo dispositivo quando visiti il
                  nostro sito web. Ci aiutano a fornire una migliore esperienza utente e a capire come utilizzi il
                  nostro sito.
                </p>
              </CardContent>
            </Card>

            <Card className="card-invisible">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Settings className="w-5 h-5" />
                  Cookie Tecnici (Necessari)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Questi cookie sono essenziali per il funzionamento del sito:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Gestione delle sessioni utente</li>
                  <li>Preferenze di lingua</li>
                  <li>Sicurezza e autenticazione</li>
                  <li>Funzionalità del carrello prenotazioni</li>
                </ul>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">✓ Sempre attivi - Non richiedono consenso</p>
                </div>
              </CardContent>
            </Card>

            <Card className="card-invisible">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <BarChart className="w-5 h-5" />
                  Cookie Analitici
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Ci aiutano a capire come i visitatori interagiscono con il sito:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Google Analytics (anonimizzato)</li>
                  <li>Statistiche di utilizzo delle pagine</li>
                  <li>Tempo di permanenza sul sito</li>
                  <li>Dispositivi e browser utilizzati</li>
                </ul>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 font-medium">ℹ️ Richiedono il tuo consenso</p>
                </div>
              </CardContent>
            </Card>

            <Card className="card-invisible">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Eye className="w-5 h-5" />
                  Cookie di Marketing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Utilizzati per personalizzare la pubblicità e misurarne l'efficacia:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Remarketing e retargeting</li>
                  <li>Personalizzazione degli annunci</li>
                  <li>Tracciamento delle conversioni</li>
                  <li>Social media integration</li>
                </ul>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-orange-800 font-medium">⚠️ Richiedono il tuo consenso esplicito</p>
                </div>
              </CardContent>
            </Card>

            <Card className="card-invisible bg-gradient-to-br from-primary/5 to-accent/5">
              <CardContent className="p-6">
                <div className="text-center">
                  <h3 className="font-cinzel text-lg font-semibold text-primary mb-3">Hai Domande sui Cookie?</h3>
                  <p className="text-muted-foreground mb-4">
                    Contattaci per qualsiasi chiarimento sulla nostra Cookie Policy
                  </p>
                  <Button variant="outline" className="bg-transparent hover:bg-primary/10">
                    Contattaci
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground text-center mt-4">Ultimo aggiornamento: Gennaio 2025</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
