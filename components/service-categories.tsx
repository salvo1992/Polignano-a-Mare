"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, Utensils, Ship, Car, Wine, Heart } from "lucide-react"

const categories = [
  {
    icon: Sparkles,
    name: "Benessere",
    description: "Massaggi rilassanti e trattamenti per rigenerare corpo e mente",
    count: 1,
    color: "bg-blue-100 text-blue-700",
  },
  {
    icon: Utensils,
    name: "Gastronomia",
    description: "Cena romantica con menu completo presso Villa degli Aranci",
    count: 1,
    color: "bg-orange-100 text-orange-700",
  },
  {
    icon: Ship,
    name: "Esperienze",
    description: "Tour in barca lungo le grotte e la costa di Polignano a Mare",
    count: 2,
    color: "bg-cyan-100 text-cyan-700",
  },
  {
    icon: Car,
    name: "Trasporti",
    description: "Trasferimenti privati da aeroporto di Bari e Brindisi",
    count: 1,
    color: "bg-green-100 text-green-700",
  },
  {
    icon: Wine,
    name: "In Camera",
    description: "Bollicine e champagne consegnate direttamente in camera",
    count: 1,
    color: "bg-purple-100 text-purple-700",
  },
  {
    icon: Heart,
    name: "Eventi Speciali",
    description: "Compleanni, anniversari e proposte di matrimonio su misura",
    count: 1,
    color: "bg-rose-100 text-rose-700",
  },
]

export function ServiceCategories() {
  return (
    <section className="py-12 bg-secondary/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Le Nostre Categorie
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-balance">
            Scopri tutti i servizi disponibili per rendere il vostro soggiorno a Polignano a Mare indimenticabile
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category, index) => {
            const Icon = category.icon
            return (
              <Card
                key={index}
                className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                <CardContent className="p-5 text-center">
                  <div
                    className={`w-14 h-14 rounded-full ${category.color} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1 text-foreground">{category.name}</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">{category.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
