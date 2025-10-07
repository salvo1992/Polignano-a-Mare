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
import { Badge } from "@/components/ui/badge"
import { Mail, Phone, MapPin, Clock, Send, Star, MessageCircle, Heart, Users, Award } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

const reviews = [
  {
    id: 1,
    name: "Marco Rossi",
    location: "Milano",
    rating: 5,
    comment: "Esperienza fantastica! Il servizio è impeccabile e la vista mozzafiato. Torneremo sicuramente!",
    date: "Dicembre 2024",
    verified: true,
  },
  {
    id: 2,
    name: "Sarah Johnson",
    location: "London, UK",
    rating: 5,
    comment:
      "Perfect location in Rome! The staff was incredibly helpful and the rooms are beautiful. Highly recommended!",
    date: "Novembre 2024",
    verified: true,
  },
  {
    id: 3,
    name: "Giuseppe Bianchi",
    location: "Roma",
    rating: 4,
    comment: "Ottima struttura nel cuore di Roma. Colazione eccellente e personale molto cortese.",
    date: "Ottobre 2024",
    verified: true,
  },
  {
    id: 4,
    name: "Marie Dubois",
    location: "Paris, France",
    rating: 5,
    comment: "Un séjour merveilleux! L'emplacement est parfait pour visiter Rome et le service est exceptionnel.",
    date: "Settembre 2024",
    verified: true,
  },
]

export default function ContactsPage() {
  const { t } = useLanguage()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })

  const [newsletterEmail, setNewsletterEmail] = useState("")
  const [isSubscribed, setIsSubscribed] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Contact form submitted:", formData)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
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
          {/* Hero Section */}
          <div className="text-center mb-12 animate-fade-in-up">
            <h1 className="text-4xl md:text-6xl font-cinzel font-bold text-roman-gradient mb-4">Contattaci</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Siamo qui per rispondere a tutte le tue domande e aiutarti a pianificare il soggiorno perfetto
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-6 mb-12">
            {/* Contact Form - Reduced width */}
            <div className="lg:col-span-2">
              <Card className="card-semi-transparent animate-slide-in-left">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-cinzel text-primary">Invia un Messaggio</CardTitle>
                  <CardDescription className="text-sm">Ti risponderemo entro 24 ore</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
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

                    <div>
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

                    <div>
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

                    <div>
                      <Label htmlFor="message" className="text-sm">
                        Messaggio
                      </Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        placeholder="Scrivi qui il tuo messaggio..."
                        className="mt-1"
                        rows={4}
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 py-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Invia
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-3 grid sm:grid-cols-2 gap-4 animate-slide-in-right">
              <div className="card-invisible p-5">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-cinzel font-semibold text-primary mb-2 text-base">Dove Siamo</h3>
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
                    <h3 className="font-cinzel font-semibold text-primary mb-2 text-base">Contatti Diretti</h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium">+39 06 1234 5678</p>
                        <p className="text-xs text-muted-foreground">Disponibile 24/7</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">info@villabellavista.it</p>
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
                        <span className="font-medium">Lun - Ven</span>
                        <span className="text-muted-foreground">08:00 - 22:00</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="font-medium">Sab - Dom</span>
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

              <div className="card-invisible p-5">
                <h3 className="font-cinzel text-base font-semibold text-primary mb-2">Servizio Concierge</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Il nostro team è a disposizione per aiutarti con prenotazioni ristoranti, tour guidati e
                  trasferimenti.
                </p>
                <Button variant="outline" size="sm" className="w-full bg-transparent text-sm">
                  Scopri i Servizi
                </Button>
              </div>
            </div>
          </div>

          <div className="mb-12 max-w-3xl mx-auto">
            <Card className="card-semi-transparent border-primary/20">
              <CardContent className="p-5">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Mail className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-cinzel font-bold text-primary">Newsletter Esclusiva</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Iscriviti per ricevere offerte speciali ed eventi esclusivi!
                  </p>

                  {!isSubscribed ? (
                    <form
                      onSubmit={handleNewsletterSubmit}
                      className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
                    >
                      <Input
                        type="email"
                        placeholder="La tua email..."
                        value={newsletterEmail}
                        onChange={(e) => setNewsletterEmail(e.target.value)}
                        required
                        className="flex-1 h-10"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 h-10"
                      >
                        Iscriviti
                      </Button>
                    </form>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 max-w-md mx-auto">
                      <div className="flex items-center justify-center gap-2 text-green-800">
                        <Heart className="w-4 h-4 fill-current" />
                        <span className="text-sm font-medium">Grazie per l'iscrizione!</span>
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

          <div className="mb-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-cinzel font-bold text-roman-gradient mb-4">Cosa Dicono i Nostri Ospiti</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Le recensioni autentiche dei nostri ospiti sono la nostra migliore pubblicità
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {reviews.map((review, index) => (
                <Card key={review.id} className="card-semi-transparent hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      {review.verified && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 px-1.5 py-0">
                          Verificata
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-3">{review.comment}</p>
                    <div className="border-t pt-2">
                      <p className="font-medium text-sm">{review.name}</p>
                      <p className="text-xs text-muted-foreground">{review.location}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{review.date}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">4.8</div>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">Valutazione Media</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">250+</div>
                  <div className="text-xs text-muted-foreground">Recensioni</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">98%</div>
                  <div className="text-xs text-muted-foreground">Soddisfazione</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">85%</div>
                  <div className="text-xs text-muted-foreground">Ritornano</div>
                </div>
              </div>
              <Button variant="outline" size="sm" className="bg-transparent hover:bg-primary/10">
                <MessageCircle className="w-4 h-4 mr-2" />
                Leggi Tutte le Recensioni
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
