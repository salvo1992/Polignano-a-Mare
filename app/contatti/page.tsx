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

const CONTACT_INFO = {
  name: "AL 22 Suite & SPA LUXURY EXPERIENCE",
  address: "Vico Gelso I n 22",
  city: "70044 Polignano a Mare (BA), Italia",
  phone: process.env.NEXT_PUBLIC_PRIVACY_PHONE || "+39 375 701 7689",
  email: process.env.NEXT_PUBLIC_PRIVACY_EMAIL || "progettocale@gmail.com",
}

export default function ContactsPage() {
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
            <h1 className="text-4xl md:text-6xl font-cinzel font-bold text-roman-gradient mb-4">Contatti</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Siamo qui per rendere il tuo soggiorno indimenticabile
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-12 animate-slide-in-right">
            <div className="card-invisible p-5">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-cinzel font-semibold text-primary mb-2 text-base">Dove Siamo</h3>
                  <p className="text-sm font-medium">{CONTACT_INFO.name}</p>
                  <p className="text-sm text-muted-foreground">{CONTACT_INFO.address}</p>
                  <p className="text-sm text-muted-foreground">{CONTACT_INFO.city}</p>
                </div>
              </div>
            </div>

            <div className="card-invisible p-5">
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-cinzel font-semibold text-primary mb-2 text-base">Contatti Diretti</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium">{CONTACT_INFO.phone}</p>
                      <p className="text-xs text-muted-foreground">Disponibile 24/7</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{CONTACT_INFO.email}</p>
                      <p className="text-xs text-muted-foreground">Risposta entro 24h</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-invisible p-5">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-cinzel font-semibold text-primary mb-2 text-base">Orari</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">Lun-Ven</span>
                      <span className="text-muted-foreground">08:00 - 22:00</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">Sab-Dom</span>
                      <span className="text-muted-foreground">09:00 - 21:00</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">Check-in/out</span>
                      <span className="text-muted-foreground">24/7</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 card-invisible p-5">
              <h3 className="font-cinzel text-base font-semibold text-primary mb-2">Servizio Concierge</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Il nostro team è a disposizione per organizzare esperienze uniche e personalizzate
              </p>
              <Button variant="outline" size="sm" className="bg-transparent text-sm">
                Scopri i Servizi
              </Button>
            </div>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-3">
              <div className="mx-auto w-full max-w-3xl">
                <Card className="card-semi-transparent animate-slide-in-left">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-cinzel text-primary">Invia un Messaggio</CardTitle>
                    <CardDescription className="text-sm">Ti risponderemo entro 24 ore</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
                      <div className="md:col-span-1">
                        <Label htmlFor="name" className="text-sm">
                          Nome Completo
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
                          Email
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
                          Oggetto
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
                          Messaggio
                        </Label>
                        <Textarea
                          id="message"
                          name="message"
                          value={formData.message}
                          onChange={handleInputChange}
                          placeholder="Scrivi il tuo messaggio..."
                          className="mt-1"
                          rows={4}
                          required
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Button type="submit" className="w-full py-5">
                          Invia
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <div className="mt-8 sm:mt-12 mb-12 max-w-3xl mx-auto animate-fade-in-up">
            <Card className="card-semi-transparent border-primary/20">
              <CardContent className="p-5">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Mail className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-cinzel font-bold text-primary">Newsletter Esclusiva</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ricevi offerte speciali e aggiornamenti direttamente nella tua casella di posta
                  </p>

                  {!isSubscribed ? (
                    <form
                      onSubmit={handleNewsletterSubmit}
                      className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
                    >
                      <Input
                        type="email"
                        placeholder="La tua email"
                        value={newsletterEmail}
                        onChange={(e) => setNewsletterEmail(e.target.value)}
                        required
                        className="flex-1 h-10"
                      />
                      <Button type="submit" size="sm" className="h-10">
                        Iscriviti
                      </Button>
                    </form>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 max-w-md mx-auto">
                      <div className="flex items-center justify-center gap-2 text-green-800">
                        <Heart className="w-4 h-4 fill-current" />
                        <span className="text-sm font-medium">Grazie per esserti iscritto!</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>2.500+ iscritti</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      <span>Offerte esclusive</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
