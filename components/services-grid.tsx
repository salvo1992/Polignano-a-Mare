"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, Phone, Sparkles, Wine, Ship, Car, Heart, HandMetal } from "lucide-react"
import { useStaggeredAnimation } from "@/hooks/use-scroll-animation"

const services = [
  {
    id: 1,
    category: "Benessere",
    name: "Massaggio Rilassante",
    description:
      "Un trattamento rilassante di 50 minuti con oli essenziali e tecniche professionali per rigenerare corpo e mente durante il vostro soggiorno a Polignano a Mare.",
    image: "/images/servizi-massaggio.jpg",
    duration: "50 min",
    price: "80",
    priceLabel: "a persona",
    icon: Sparkles,
    details: [
      "Massaggio rilassante completo",
      "Oli essenziali naturali",
      "Trattamento personalizzato",
      "Nella comodita' della vostra camera o location dedicata",
    ],
  },
  {
    id: 2,
    category: "Gastronomia",
    name: "Cena Romantica",
    description:
      "Cena romantica presso Villa degli Aranci con un menu completo: antipasti, primo, secondo e dolce. Bevande escluse. Un'esperienza gastronomica unica per due.",
    image: "/images/servizi-cena-romantica.jpg",
    duration: "2 ore",
    price: "120",
    priceLabel: "a coppia",
    icon: Heart,
    details: [
      "Location: Villa degli Aranci",
      "Menu completo con Antipasti",
      "Primo piatto della tradizione pugliese",
      "Secondo piatto di carne o pesce",
      "Dolce artigianale",
      "Bevande escluse",
    ],
  },
  {
    id: 3,
    category: "Esperienze",
    name: "Tour in Barca a Polignano",
    description:
      "Scopri le grotte e la costa mozzafiato di Polignano a Mare dal mare. Tour di 1 ora e 30 minuti o 2 ore lungo le scogliere, con possibilita' di tour esclusivo privato.",
    image: "/images/servizi-tour-barca.jpg",
    duration: "1.30h / 2h",
    price: "40",
    priceLabel: "a persona",
    icon: Ship,
    details: [
      "Durata: 1 ora e 30 / 2 ore",
      "Costa e grotte di Polignano a Mare",
      "Guida locale esperta",
      "Tour Exclusive privato a partire da 400,00 EUR",
    ],
  },
  {
    id: 4,
    category: "Trasporti",
    name: "Trasferimenti Aeroporto",
    description:
      "Servizio di trasferimento privato dall'aeroporto di Bari o Brindisi direttamente a Polignano a Mare. Comodi, puntuali e senza stress. Disponibili anche trasferimenti personalizzati.",
    image: "/images/servizi-trasferimenti.jpg",
    duration: "1 - 1.5 ore",
    price: "130",
    priceLabel: "per 2 persone",
    icon: Car,
    details: [
      "Da Aeroporto di Bari a Polignano a Mare",
      "Da Aeroporto di Brindisi a Polignano a Mare",
      "130,00 EUR per 2 persone",
      "Vari trasferimenti personalizzati su richiesta",
    ],
  },
  {
    id: 5,
    category: "In Camera",
    name: "Bottiglia in Camera",
    description:
      "Fai trovare una bottiglia di bollicine in camera per una sorpresa speciale. Scegli tra Berlucchi 61 Pas Dose, Rose' o Champagne per celebrare ogni momento.",
    image: "/images/servizi-bottiglia-camera.jpg",
    duration: "Da prenotare",
    price: "70",
    priceLabel: "da",
    icon: Wine,
    details: [
      "Berlucchi 61 Pas Dose - 75,00 EUR",
      "Berlucchi Rose' - 70,00 EUR",
      "Champagne - 129,00 EUR",
      "Consegnata in camera prima del vostro arrivo",
    ],
  },
  {
    id: 6,
    category: "Esperienze",
    name: "Richieste Speciali",
    description:
      "Organizziamo per voi compleanni, anniversari, proposte di matrimonio e qualsiasi evento speciale. Contattateci per info e costi personalizzati.",
    image: "/images/servizi-richieste-speciali.jpg",
    duration: "Su misura",
    price: "Su richiesta",
    priceLabel: "",
    icon: HandMetal,
    details: [
      "Compleanni a sorpresa",
      "Anniversari romantici",
      "Proposte di matrimonio scenografiche",
      "Organizzazione completa su misura",
      "Contattateci per info e preventivi",
    ],
  },
]

export function ServicesGrid() {
  const [selectedCategory, setSelectedCategory] = useState<string>("Tutti")
  const { ref, visibleItems } = useStaggeredAnimation(150)

  const categories = ["Tutti", "Benessere", "Gastronomia", "Esperienze", "Trasporti", "In Camera"]

  const filteredServices =
    selectedCategory === "Tutti" ? services : services.filter((s) => s.category === selectedCategory)

  return (
    <section className="py-16 bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-3 mb-12 justify-center">
          {categories.map((category, index) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() => setSelectedCategory(category)}
              className={`rounded-full px-6 py-2.5 text-base font-medium transition-all duration-300 hover:scale-105 ${
                selectedCategory === category
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "hover:bg-primary/10"
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Services Grid */}
        <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredServices.map((service, index) => {
            const Icon = service.icon
            return (
              <div
                key={service.id}
                data-index={index}
                className={`group overflow-hidden rounded-2xl bg-card border border-border shadow-sm transition-all duration-500 hover:shadow-xl hover:-translate-y-1 ${
                  visibleItems.has(index) ? "animate-fade-in-up" : "opacity-0 translate-y-10"
                }`}
                style={{ animationDelay: `${index * 0.12}s` }}
              >
                {/* Image */}
                <div className="relative overflow-hidden h-56">
                  <Image
                    src={service.image}
                    alt={service.name}
                    width={600}
                    height={400}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                  {/* Category badge */}
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-primary/90 text-primary-foreground text-sm font-medium backdrop-blur-sm">
                      {service.category}
                    </Badge>
                  </div>

                  {/* Price */}
                  <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-xl border border-white/20">
                    <span className="text-xl font-bold">
                      {service.price.startsWith("Su") ? "" : "\u20AC"}
                      {service.price}
                    </span>
                    {service.priceLabel && (
                      <span className="text-xs block text-white/80">{service.priceLabel}</span>
                    )}
                  </div>

                  {/* Icon */}
                  <div className="absolute bottom-4 left-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="font-bold text-xl text-foreground mb-2 group-hover:text-primary transition-colors">
                    {service.name}
                  </h3>

                  <p className="text-muted-foreground text-sm mb-5 leading-relaxed">
                    {service.description}
                  </p>

                  {/* Details list */}
                  <ul className="space-y-2 mb-5">
                    {service.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-0.5 flex-shrink-0">&#x2022;</span>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Meta info */}
                  <div className="flex items-center gap-4 mb-5 text-sm">
                    <div className="flex items-center gap-2 bg-secondary/60 rounded-lg px-3 py-1.5">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="font-medium text-foreground">{service.duration}</span>
                    </div>
                    {service.priceLabel.includes("persona") || service.priceLabel.includes("coppia") || service.priceLabel.includes("persone") ? (
                      <div className="flex items-center gap-2 bg-secondary/60 rounded-lg px-3 py-1.5">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="font-medium text-foreground">{service.priceLabel}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* CTA */}
                  <Button
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:scale-[1.02] shadow-md"
                    asChild
                  >
                    <a
                      href={`https://wa.me/393339aborti?text=Ciao! Vorrei prenotare il servizio: ${encodeURIComponent(service.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Prenota su WhatsApp
                    </a>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        {filteredServices.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-xl">Nessun servizio trovato per la categoria selezionata.</p>
          </div>
        )}
      </div>
    </section>
  )
}
