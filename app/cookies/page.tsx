"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Cookie, Settings, BarChart, Eye } from "lucide-react"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import { useState, useEffect } from "react"
import { useLanguage } from "@/components/language-provider"

interface CookiePreferences {
  necessary: boolean
  analytics: boolean
  marketing: boolean
}

export default function CookiesPage() {
  const { t } = useLanguage()
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
          setPreferences(JSON.parse(saved))
        }
      } catch (error) {
        console.error("Error loading preferences:", error)
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
      return true
    } catch (error) {
      console.error("Error saving preferences:", error)
      return false
    }
  }

  const acceptAll = () => {
    if (savePreferences({ necessary: true, analytics: true, marketing: true })) {
      showNotification(t("allPreferencesSaved"))
    } else {
      showNotification(t("errorSavingPreferences"))
    }
  }

  const acceptNecessaryOnly = () => {
    if (savePreferences({ necessary: true, analytics: false, marketing: false })) {
      showNotification(t("onlyNecessaryAccepted"))
    } else {
      showNotification(t("errorSavingPreferences"))
    }
  }

  const togglePreference = (type: keyof CookiePreferences) => {
    if (type === "necessary") return
    setPreferences({ ...preferences, [type]: !preferences[type] })
  }

  const saveCustomPreferences = () => {
    if (savePreferences(preferences)) {
      showNotification(t("yourPreferencesSaved"))
    } else {
      showNotification(t("errorSavingPreferences"))
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
          <div
            ref={heroRef}
            className={`text-center mb-12 transition-all duration-1000 ${heroVisible ? "animate-fade-in-up opacity-100" : "opacity-0 translate-y-[50px]"}`}
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Cookie className="w-8 h-8 text-primary animate-pulse" />
              <h1 className="text-4xl md:text-6xl font-cinzel font-bold text-roman-gradient animate-text-shimmer">
                {t("cookiePolicy")}
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{t("cookiePolicySubtitle")}</p>
          </div>

          <div className="space-y-8">
            <Card className="card-enhanced bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Settings className="w-5 h-5" />
                  {t("manageCookiePreferences")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground">{t("customizeCookiePreferences")}</p>

                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-4 border border-border/50 rounded-lg bg-green-50/50">
                    <div>
                      <h4 className="font-semibold text-green-800">{t("necessaryCookiesTitle")}</h4>
                      <p className="text-sm text-green-600">{t("necessaryCookiesAlwaysActive")}</p>
                    </div>
                    <div className="w-12 h-6 bg-green-500 rounded-full flex items-center justify-end px-1">
                      <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-border/50 rounded-lg hover:bg-muted/20 transition-colors">
                    <div>
                      <h4 className="font-semibold">{t("analyticsCookiesTitle")}</h4>
                      <p className="text-sm text-muted-foreground">{t("analyticsCookiesHelp")}</p>
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

                  <div className="flex items-center justify-between p-4 border border-border/50 rounded-lg hover:bg-muted/20 transition-colors">
                    <div>
                      <h4 className="font-semibold">{t("marketingCookiesTitle")}</h4>
                      <p className="text-sm text-muted-foreground">{t("marketingCookiesAds")}</p>
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
                    {t("onlyNecessaryButton")}
                  </Button>
                  <Button
                    onClick={saveCustomPreferences}
                    className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all duration-300 hover:scale-105"
                  >
                    {t("savePreferencesButton")}
                  </Button>
                  <Button
                    onClick={acceptAll}
                    className="flex-1 bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 transition-all duration-300 hover:scale-105"
                  >
                    {t("acceptAllButton")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="card-enhanced">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Cookie className="w-5 h-5" />
                  {t("whatAreCookies")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>{t("cookiesExplanation")}</p>
              </CardContent>
            </Card>

            <Card className="card-enhanced">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Settings className="w-5 h-5" />
                  {t("technicalDetails")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>{t("technicalExplanation")}</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>{t("technicalItem1")}</li>
                  <li>{t("technicalItem2")}</li>
                  <li>{t("technicalItem3")}</li>
                  <li>{t("technicalItem4")}</li>
                </ul>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">{t("alwaysActive")}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="card-enhanced">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <BarChart className="w-5 h-5" />
                  {t("analyticsCookies")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>{t("analyticsExplanation")}</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>{t("analyticsItem1")}</li>
                  <li>{t("analyticsItem2")}</li>
                  <li>{t("analyticsItem3")}</li>
                  <li>{t("analyticsItem4")}</li>
                </ul>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 font-medium">{t("requireConsent")}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="card-enhanced">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Eye className="w-5 h-5" />
                  {t("marketingCookies")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>{t("marketingExplanation")}</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>{t("marketingItem1")}</li>
                  <li>{t("marketingItem2")}</li>
                  <li>{t("marketingItem3")}</li>
                  <li>{t("marketingItem4")}</li>
                </ul>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-orange-800 font-medium">{t("requireConsent")}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="card-enhanced bg-gradient-to-br from-primary/5 to-accent/5">
              <CardContent className="p-6">
                <div className="text-center">
                  <h3 className="font-cinzel text-lg font-semibold text-primary mb-3">{t("questionsTitle")}</h3>
                  <p className="text-muted-foreground mb-4">{t("questionsDescription")}</p>
                  <Button variant="outline" className="bg-transparent hover:bg-primary/10">
                    {t("contactUs")}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground text-center mt-4">{t("lastUpdated")}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
