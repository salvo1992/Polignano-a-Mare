"use client"

import { useState } from "react"
import { Wifi, Car, Coffee, Waves, Utensils, MapPin, Space as Spa, Wine, Mountain, Camera, Users } from "lucide-react"

const services = [
  {
    icon: Coffee,
    title: "Colazione Gourmet",
    description: "Inizia la giornata con prodotti locali freschi e specialità toscane",
    color: "bg-amber-100 text-amber-700",
  },
  {
    icon: Waves,
    title: "Piscina Panoramica",
    description: "Rilassati nella nostra piscina infinity con vista sulle colline",
    color: "bg-blue-100 text-blue-700",
  },
  {
    icon: Wifi,
    title: "WiFi Gratuito",
    description: "Connessione internet ad alta velocità in tutta la struttura",
    color: "bg-green-100 text-green-700",
  },
  {
    icon: Car,
    title: "Parcheggio Privato",
    description: "Parcheggio gratuito e sicuro per tutti i nostri ospiti",
    color: "bg-purple-100 text-purple-700",
  },
  {
    icon: Spa,
    title: "Centro Benessere",
    description: "Trattamenti rilassanti e massaggi con prodotti naturali",
    color: "bg-pink-100 text-pink-700",
  },
  {
    icon: Wine,
    title: "Degustazioni Vino",
    description: "Scopri i migliori vini locali con le nostre degustazioni guidate",
    color: "bg-red-100 text-red-700",
  },
  {
    icon: Mountain,
    title: "Escursioni Guidate",
    description: "Esplora la bellezza della Toscana con le nostre guide esperte",
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    icon: Camera,
    title: "Tour Fotografici",
    description: "Cattura i momenti più belli con i nostri tour fotografici",
    color: "bg-indigo-100 text-indigo-700",
  },
]

export function ServicesSection() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6">I Nostri Servizi</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-balance">
            Scopri tutti i servizi che rendono il tuo soggiorno a Villa Bella Vista un'esperienza indimenticabile
          </p>
        </div>

        {/* Floating Service Clouds */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {services.map((service, index) => {
            const Icon = service.icon
            return (
              <div
                key={index}
                className={`card-invisible group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                  hoveredIndex === index ? "animate-float" : ""
                }`}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="p-6 text-center">
                  <div
                    className={`w-16 h-16 rounded-full ${service.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2 text-foreground">{service.title}</h3>
                  <p className="text-muted-foreground text-sm">{service.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Additional Services */}
        <div className="card-invisible rounded-2xl p-8 shadow-lg">
          <h3 className="font-display text-2xl font-bold text-center mb-8 text-foreground">Servizi Aggiuntivi</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <Users className="w-12 h-12 text-primary mx-auto mb-4" />
              <h4 className="font-semibold text-lg mb-2">Eventi Privati</h4>
              <p className="text-muted-foreground">Organizziamo eventi speciali e celebrazioni su misura</p>
            </div>
            <div className="text-center">
              <Utensils className="w-12 h-12 text-primary mx-auto mb-4" />
              <h4 className="font-semibold text-lg mb-2">Cucina Tipica</h4>
              <p className="text-muted-foreground">
                Cene con piatti tradizionali toscani preparati con ingredienti locali
              </p>
            </div>
            <div className="text-center">
              <MapPin className="w-12 h-12 text-primary mx-auto mb-4" />
              <h4 className="font-semibold text-lg mb-2">Concierge Service</h4>
              <p className="text-muted-foreground">Assistenza personalizzata per prenotazioni e consigli turistici</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
