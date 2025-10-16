"use client"
import type React from "react"
import { useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Phone, MapPin, Clock, Heart, Users, Award } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export default function ContactsPage() {
  const { t } = useLanguage()
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" })
  const [newsletterEmail, setNewsletterEmail] = useState("")
  const [isSubscribed, setIsSubscribed] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Contact form submitted:", formData)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Newsletter subscription:", newsletterEmail)
    setIsSubscribed(true)
    setNewsletterEmail("")
  }

  return (
    <main className="min-h-screen">
      <Header />

      <div className="pt-20 pb-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10 animate-fade-in-up">
            <h1 className="text-4xl md:text-6xl font-cinzel font-bold text-roman-gradient mb-4">{t("contactTitle")}</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{t("contactSubtitle")}</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-12 animate-slide-in-right">
            <div className="card-invisible p-5">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-cinzel font-semibold text-primary mb-2 text-base">{t("whereWeAre")}</h3>
                  <p className="text-sm font-medium">Villa Bella Vista</p>
                  <p className="text-sm text-muted-foreground">Via dei Colli Romani, 123</p>
                  <p className="text-sm text-muted-foreground">00100 Roma, Italia</p>
                </div>
              </div>
            </div>

            <div className="card-invisible p-5">
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-cinzel font-semibold text-primary mb-2 text-base">{t("directContacts")}</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium">+39 06 1234 5678</p>
                      <p className="text-xs text-muted-foreground">{t("available247")}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">info@villabellavista.it</p>
                      <p className="text-xs text-muted-foreground">{t("responseWithin24h")}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-invisible p-5">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-cinzel font-semibold text-primary mb-2 text-base">{t("hours")}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{t("monFri")}</span>
                      <span className="text-muted-foreground">08:00 - 22:00</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{t("satSun")}</span>
                      <span className="text-muted-foreground">09:00 - 21:00</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{t("checkInOut")}</span>
                      <span className="text-muted-foreground">24/7</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 card-invisible p-5">
              <h3 className="font-cinzel text-base font-semibold text-primary mb-2">{t("conciergeService")}</h3>
              <p className="text-sm text-muted-foreground mb-3">{t("conciergeDescription")}</p>
              <Button variant="outline" size="sm" className="bg-transparent text-sm">
                {t("discoverServices")}
              </Button>
            </div>
          </div>

          <div className="mb-12 max-w-3xl mx-auto">
            <Card className="card-semi-transparent border-primary/20">
              <CardContent className="p-5">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Mail className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-cinzel font-bold text-primary">{t("exclusiveNewsletter")}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{t("newsletterDescription")}</p>

                  {!isSubscribed ? (
                    <form
                      onSubmit={handleNewsletterSubmit}
                      className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
                    >
                      <Input
                        type="email"
                        placeholder={t("yourEmail")}
                        value={newsletterEmail}
                        onChange={(e) => setNewsletterEmail(e.target.value)}
                        required
                        className="flex-1 h-10"
                      />
                      <Button type="submit" size="sm" className="h-10">
                        {t("subscribe")}
                      </Button>
                    </form>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 max-w-md mx-auto">
                      <div className="flex items-center justify-center gap-2 text-green-800">
                        <Heart className="w-4 h-4 fill-current" />
                        <span className="text-sm font-medium">{t("thanksForSubscribing")}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>2.500+ {t("subscribers")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      <span>{t("exclusiveOffers")}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-3">
              <Card className="card-semi-transparent animate-slide-in-left">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-cinzel text-primary">{t("sendMessage")}</CardTitle>
                  <CardDescription className="text-sm">{t("responseTime")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-1">
                      <Label htmlFor="name" className="text-sm">
                        {t("fullName")}
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="mt-1"
                      />
                    </div>

                    <div className="md:col-span-1">
                      <Label htmlFor="email" className="text-sm">
                        {t("email")}
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="mt-1"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="subject" className="text-sm">
                        {t("subject")}
                      </Label>
                      <Input
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        required
                        className="mt-1"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="message" className="text-sm">
                        {t("message")}
                      </Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        placeholder={t("writeMessage")}
                        className="mt-1"
                        rows={4}
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Button type="submit" className="w-full py-5">
                        {t("send")}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}

