"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Waves, Utensils, Mountain, Dumbbell } from "lucide-react"

const categories = [
  {
    icon: Waves,
    name: "Benessere",
    description: "Rilassati con i nostri trattamenti spa e massaggi",
    count: 8,
    color: "bg-blue-100 text-blue-700",
  },
  {
    icon: Utensils,
    name: "Gastronomia",
    description: "Scopri i sapori autentici della Toscana",
    count: 6,
    color: "bg-orange-100 text-orange-700",
  },
  {
    icon: Mountain,
    name: "Attività",
    description: "Esplora la bellezza del territorio toscano",
    count: 12,
    color: "bg-green-100 text-green-700",
  },
  {
    icon: Dumbbell,
    name: "Fitness",
    description: "Mantieniti in forma durante il soggiorno",
    count: 4,
    color: "bg-purple-100 text-purple-700",
  },
]

export function ServiceCategories() {
  return (
    <section className="py-12 bg-secondary/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">Categorie di Servizi</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Scopri tutte le categorie di servizi disponibili per rendere il tuo soggiorno indimenticabile
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category, index) => {
            const Icon = category.icon
            return (
              <Card
                key={index}
                className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                <CardContent className="p-6 text-center">
                  <div
                    className={`w-16 h-16 rounded-full ${category.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2 text-foreground">{category.name}</h3>
                  <p className="text-muted-foreground text-sm mb-3">{category.description}</p>
                  <div className="text-xs text-primary font-medium">{category.count} servizi disponibili</div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
