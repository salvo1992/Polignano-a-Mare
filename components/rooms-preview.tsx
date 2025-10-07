"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Bed, Bath, Star, ArrowRight } from "lucide-react"

const rooms = [
  {
    id: 1,
    name: "Suite Panoramica",
    description: "Camera matrimoniale con vista mozzafiato sulle colline toscane",
    image: "/images/room-1.jpg",
    price: "€180",
    guests: 2,
    beds: 1,
    bathrooms: 1,
    amenities: ["Vista panoramica", "Balcone privato", "WiFi gratuito", "Minibar"],
    rating: 4.9,
    reviews: 45,
    featured: true,
  },
  {
    id: 2,
    name: "Camera Deluxe",
    description: "Elegante camera con arredi tradizionali toscani e comfort moderni",
    image: "/images/room-2.jpg",
    price: "€150",
    guests: 2,
    beds: 1,
    bathrooms: 1,
    amenities: ["Aria condizionata", "TV satellitare", "Cassaforte", "Asciugacapelli"],
    rating: 4.8,
    reviews: 32,
    featured: false,
  },
  {
    id: 3,
    name: "Suite Familiare",
    description: "Spaziosa suite ideale per famiglie con area living separata",
    image: "/images/room-1.jpg",
    price: "€220",
    guests: 4,
    beds: 2,
    bathrooms: 2,
    amenities: ["Area living", "Cucina attrezzata", "Terrazza privata", "WiFi gratuito"],
    rating: 4.9,
    reviews: 28,
    featured: true,
  },
]

export function RoomsPreview() {
  const [hoveredRoom, setHoveredRoom] = useState<number | null>(null)

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6">Le Nostre Camere</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-balance">
            Ogni camera è un rifugio di comfort e eleganza, progettata per offrirti un'esperienza di soggiorno
            indimenticabile
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {rooms.map((room, index) => (
            <div
              key={room.id}
              className={`card-invisible group overflow-hidden transition-all duration-300 hover:shadow-2xl ${
                room.featured ? "ring-2 ring-primary/20" : ""
              } ${hoveredRoom === index ? "scale-105" : ""}`}
              onMouseEnter={() => setHoveredRoom(index)}
              onMouseLeave={() => setHoveredRoom(null)}
            >
              <div className="relative overflow-hidden">
                <Image
                  src={room.image || "/placeholder.svg"}
                  alt={room.name}
                  width={400}
                  height={300}
                  className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                />
                {room.featured && (
                  <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">Più Richiesta</Badge>
                )}
                <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  {room.price}/notte
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display text-xl font-bold text-foreground">{room.name}</h3>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{room.rating}</span>
                    <span className="text-xs text-muted-foreground">({room.reviews})</span>
                  </div>
                </div>

                <p className="text-muted-foreground mb-4 text-sm">{room.description}</p>

                {/* Room Details */}
                <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{room.guests} ospiti</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Bed className="w-4 h-4" />
                    <span>{room.beds} letto</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Bath className="w-4 h-4" />
                    <span>{room.bathrooms} bagno</span>
                  </div>
                </div>

                {/* Amenities */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {room.amenities.slice(0, 3).map((amenity, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {amenity}
                    </Badge>
                  ))}
                  {room.amenities.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{room.amenities.length - 3} altri
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button asChild className="flex-1">
                    <Link href={`/camere/${room.id}`}>Dettagli</Link>
                  </Button>
                  <Button asChild variant="outline" className="flex-1 bg-transparent">
                    <Link href="/prenota">Prenota</Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button asChild size="lg" variant="outline" className="group bg-transparent">
            <Link href="/camere" className="flex items-center gap-2">
              Vedi Tutte le Camere
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
