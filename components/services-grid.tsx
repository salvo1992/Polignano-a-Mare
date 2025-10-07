"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, Star, Phone, Heart, Share2 } from "lucide-react"
import { useStaggeredAnimation } from "@/hooks/use-scroll-animation"

const services = [
  {
    id: 1,
    category: "Benessere",
    name: "Massaggio Rilassante Romano",
    description:
      "Trattamento rilassante con oli essenziali e tecniche tradizionali romane per rigenerare corpo e mente",
    image: "/luxury-spa-massage-room-with-roman-columns-and-gol.jpg",
    duration: "60 min",
    price: 80,
    capacity: 1,
    rating: 4.9,
    reviews: 34,
    available: true,
    popular: true,
  },
  {
    id: 2,
    category: "Gastronomia",
    name: "Cena Romantica Imperiale",
    description:
      "Menu degustazione con piatti della tradizione romana servito in terrazza panoramica con vista sui Fori",
    image: "/romantic-dinner-terrace-overlooking-roman-forum-at.jpg",
    duration: "2 ore",
    price: 120,
    capacity: 2,
    rating: 5.0,
    reviews: 28,
    available: true,
    popular: true,
  },
  {
    id: 3,
    category: "Attività",
    name: "Tour Enogastronomico dei Castelli",
    description: "Visita guidata alle cantine dei Castelli Romani con degustazione di vini DOC e prodotti tipici",
    image: "/italian-wine-cellar-in-castelli-romani-with-wine-b.jpg",
    duration: "4 ore",
    price: 95,
    capacity: 8,
    rating: 4.8,
    reviews: 52,
    available: true,
    popular: false,
  },
  {
    id: 4,
    category: "Benessere",
    name: "Trattamento Viso alle Terme",
    description: "Pulizia del viso con prodotti termali romani e maschera rigenerante ai minerali",
    image: "/luxury-facial-treatment-spa-room-with-roman-therma.jpg",
    duration: "45 min",
    price: 65,
    capacity: 1,
    rating: 4.7,
    reviews: 19,
    available: true,
    popular: false,
  },
  {
    id: 5,
    category: "Attività",
    name: "Passeggiata a Cavallo in Campagna",
    description: "Escursione a cavallo nella campagna romana con guida esperta e aperitivo al tramonto",
    image: "/horseback-riding-in-roman-countryside-at-sunset-wi.jpg",
    duration: "2 ore",
    price: 75,
    capacity: 6,
    rating: 4.9,
    reviews: 41,
    available: false,
    popular: true,
  },
  {
    id: 6,
    category: "Gastronomia",
    name: "Corso di Cucina Romana",
    description: "Impara a preparare i piatti tradizionali romani come carbonara, amatriciana e cacio e pepe",
    image: "/italian-cooking-class-kitchen-with-pasta-making-an.jpg",
    duration: "3 ore",
    price: 85,
    capacity: 10,
    rating: 4.8,
    reviews: 37,
    available: true,
    popular: false,
  },
  {
    id: 7,
    category: "Attività",
    name: "Tour Fotografico Roma Antica",
    description: "Cattura la bellezza della Roma eterna con un fotografo professionista tra Colosseo e Fori",
    image: "/photography-tour-at-colosseum-and-roman-forum-with.jpg",
    duration: "3 ore",
    price: 110,
    capacity: 4,
    rating: 5.0,
    reviews: 15,
    available: true,
    popular: true,
  },
  {
    id: 8,
    category: "Benessere",
    name: "Yoga al Tramonto sui Colli",
    description: "Sessione di yoga rilassante sui colli romani con vista panoramica al tramonto",
    image: "/yoga-session-on-roman-hills-at-sunset-with-panoram.jpg",
    duration: "90 min",
    price: 45,
    capacity: 12,
    rating: 4.6,
    reviews: 23,
    available: true,
    popular: false,
  },
]

export function ServicesGrid() {
  const [selectedCategory, setSelectedCategory] = useState<string>("Tutti")
  const [favorites, setFavorites] = useState<Set<number>>(new Set())
  const { ref, visibleItems } = useStaggeredAnimation(150)

  const categories = ["Tutti", "Benessere", "Gastronomia", "Attività"]

  const filteredServices =
    selectedCategory === "Tutti" ? services : services.filter((service) => service.category === selectedCategory)

  const toggleFavorite = (serviceId: number) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev)
      if (newFavorites.has(serviceId)) {
        newFavorites.delete(serviceId)
      } else {
        newFavorites.add(serviceId)
      }
      return newFavorites
    })
  }

  return (
    <section className="py-16 bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4">
        {/* Enhanced Category Filter */}
        <div className="flex flex-wrap gap-3 mb-12 justify-center">
          {categories.map((category, index) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() => setSelectedCategory(category)}
              className={`rounded-full px-8 py-3 text-lg font-medium transition-all duration-300 hover:scale-105 ${
                selectedCategory === category
                  ? "bg-gradient-to-r from-primary to-primary/80 shadow-lg animate-shimmer"
                  : "hover:bg-primary/10"
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Enhanced Services Grid */}
        <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredServices.map((service, index) => (
            <div
              key={service.id}
              data-index={index}
              className={`group overflow-hidden card-invisible transition-all duration-500 hover:shadow-2xl ${
                visibleItems.has(index) ? "animate-fade-in-up" : "opacity-0 translate-y-10"
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="relative overflow-hidden">
                <Image
                  src={service.image || "/placeholder.svg"}
                  alt={service.name}
                  width={400}
                  height={300}
                  className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-700"
                />

                {/* Enhanced overlay with gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Enhanced Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <Badge className="bg-primary/90 text-primary-foreground text-sm font-medium backdrop-blur-sm">
                    {service.category}
                  </Badge>
                  {service.popular && (
                    <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm font-medium animate-pulse">
                      ⭐ Popolare
                    </Badge>
                  )}
                  {!service.available && (
                    <Badge variant="destructive" className="text-sm backdrop-blur-sm">
                      Non Disponibile
                    </Badge>
                  )}
                </div>

                {/* Enhanced Price */}
                <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm text-white px-3 py-2 rounded-full text-lg font-bold border border-white/20">
                  €{service.price}
                </div>

                {/* Action buttons overlay */}
                <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border border-white/20"
                    onClick={() => toggleFavorite(service.id)}
                  >
                    <Heart className={`w-4 h-4 ${favorites.has(service.id) ? "fill-red-500 text-red-500" : ""}`} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border border-white/20"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-xl text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                    {service.name}
                  </h3>
                  <div className="flex items-center gap-1 ml-3 bg-secondary/50 px-2 py-1 rounded-full">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-bold">{service.rating}</span>
                  </div>
                </div>

                <p className="text-muted-foreground text-sm mb-4 line-clamp-3 leading-relaxed">{service.description}</p>

                {/* Enhanced Service Details */}
                <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
                  <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="font-medium">{service.duration}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="font-medium">Max {service.capacity}</span>
                  </div>
                </div>

                {/* Reviews */}
                <div className="text-xs text-muted-foreground mb-4">
                  {service.reviews} recensioni • Valutazione media {service.rating}/5
                </div>

                {/* Enhanced Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    size="sm"
                    className={`flex-1 text-sm font-medium transition-all duration-300 ${
                      service.available
                        ? "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary hover:scale-105 shadow-lg"
                        : ""
                    }`}
                    disabled={!service.available}
                  >
                    {service.available ? "Prenota Ora" : "Non Disponibile"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="px-4 bg-transparent hover:bg-primary/10 hover:scale-105 transition-all duration-300"
                  >
                    <Phone className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredServices.length === 0 && (
          <div className="text-center py-16">
            <div className="animate-bounce-in">
              <p className="text-muted-foreground text-xl">Nessun servizio trovato per la categoria selezionata.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
