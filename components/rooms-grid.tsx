"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Bed, Bath, Mountain, Star, Heart, Share2 } from "lucide-react"

const rooms = [
  {
    id: 1,
    name: "Suite Panoramica",
    description: "Camera matrimoniale con vista mozzafiato sulle colline toscane e balcone privato",
    images: ["/images/room-1.jpg", "/images/room-2.jpg"],
    price: 180,
    originalPrice: 220,
    guests: 2,
    beds: 1,
    bathrooms: 1,
    size: 35,
    amenities: [
      "Vista panoramica",
      "Balcone privato",
      "WiFi gratuito",
      "Minibar",
      "Aria condizionata",
      "TV satellitare",
    ],
    rating: 4.9,
    reviews: 45,
    featured: true,
    available: true,
  },
  {
    id: 2,
    name: "Camera Deluxe",
    description: "Elegante camera con arredi tradizionali toscani e comfort moderni",
    images: ["/images/room-2.jpg", "/images/room-1.jpg"],
    price: 150,
    originalPrice: 180,
    guests: 2,
    beds: 1,
    bathrooms: 1,
    size: 28,
    amenities: ["Aria condizionata", "TV satellitare", "Cassaforte", "Asciugacapelli", "WiFi gratuito", "Minibar"],
    rating: 4.8,
    reviews: 32,
    featured: false,
    available: true,
  },
  {
    id: 3,
    name: "Suite Familiare",
    description: "Spaziosa suite ideale per famiglie con area living separata e terrazza privata",
    images: ["/images/room-1.jpg", "/images/room-2.jpg"],
    price: 220,
    originalPrice: 260,
    guests: 4,
    beds: 2,
    bathrooms: 2,
    size: 50,
    amenities: ["Area living", "Cucina attrezzata", "Terrazza privata", "WiFi gratuito", "2 TV", "Frigorifero"],
    rating: 4.9,
    reviews: 28,
    featured: true,
    available: true,
  },
  {
    id: 4,
    name: "Camera Standard",
    description: "Accogliente camera con tutti i comfort essenziali per un soggiorno perfetto",
    images: ["/images/room-2.jpg", "/images/room-1.jpg"],
    price: 120,
    originalPrice: 150,
    guests: 2,
    beds: 1,
    bathrooms: 1,
    size: 22,
    amenities: ["WiFi gratuito", "TV", "Aria condizionata", "Asciugacapelli", "Cassaforte"],
    rating: 4.7,
    reviews: 56,
    featured: false,
    available: false,
  },
  {
    id: 5,
    name: "Suite Romantica",
    description: "Suite intima con vasca idromassaggio e vista sul tramonto toscano",
    images: ["/images/room-1.jpg", "/images/room-2.jpg"],
    price: 250,
    originalPrice: 300,
    guests: 2,
    beds: 1,
    bathrooms: 1,
    size: 40,
    amenities: ["Vasca idromassaggio", "Vista tramonto", "Balcone privato", "Champagne di benvenuto", "WiFi gratuito"],
    rating: 5.0,
    reviews: 23,
    featured: true,
    available: true,
  },
  {
    id: 6,
    name: "Camera Giardino",
    description: "Camera al piano terra con accesso diretto al giardino e patio privato",
    images: ["/images/room-2.jpg", "/images/room-1.jpg"],
    price: 140,
    originalPrice: 170,
    guests: 2,
    beds: 1,
    bathrooms: 1,
    size: 30,
    amenities: ["Accesso giardino", "Patio privato", "WiFi gratuito", "TV satellitare", "Frigorifero"],
    rating: 4.6,
    reviews: 41,
    featured: false,
    available: true,
  },
]

export function RoomsGrid() {
  const [favorites, setFavorites] = useState<number[]>([])

  const toggleFavorite = (roomId: number) => {
    setFavorites((prev) => (prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]))
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {rooms.map((room) => (
        <div key={room.id} className="card-invisible group overflow-hidden hover:shadow-xl transition-all duration-300">
          <div className="relative overflow-hidden">
            <Image
              src={room.images[0] || "/placeholder.svg"}
              alt={room.name}
              width={400}
              height={300}
              className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500"
            />

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {room.featured && <Badge className="bg-primary text-primary-foreground">Più Richiesta</Badge>}
              {!room.available && <Badge variant="destructive">Non Disponibile</Badge>}
              {room.originalPrice > room.price && <Badge className="bg-green-600 text-white">Offerta Speciale</Badge>}
            </div>

            {/* Action Buttons */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <Button
                size="icon"
                variant="secondary"
                className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => toggleFavorite(room.id)}
              >
                <Heart className={`w-4 h-4 ${favorites.includes(room.id) ? "fill-red-500 text-red-500" : ""}`} />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Price */}
            <div className="absolute bottom-4 right-4 bg-black/80 text-white px-3 py-2 rounded-lg">
              <div className="text-right">
                {room.originalPrice > room.price && (
                  <div className="text-xs line-through opacity-75">€{room.originalPrice}</div>
                )}
                <div className="font-bold">€{room.price}/notte</div>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-display text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                {room.name}
              </h3>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{room.rating}</span>
                <span className="text-xs text-muted-foreground">({room.reviews})</span>
              </div>
            </div>

            <p className="text-muted-foreground mb-4 text-sm line-clamp-2">{room.description}</p>

            {/* Room Details */}
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-muted-foreground">
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
              <div className="flex items-center gap-1">
                <Mountain className="w-4 h-4" />
                <span>{room.size} m²</span>
              </div>
            </div>

            {/* Amenities */}
            <div className="flex flex-wrap gap-1 mb-6">
              {room.amenities.slice(0, 3).map((amenity, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {amenity}
                </Badge>
              ))}
              {room.amenities.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{room.amenities.length - 3}
                </Badge>
              )}
            </div>

            <div className="flex gap-2">
              <Button asChild className="flex-1" disabled={!room.available}>
                <Link href={`/camere/${room.id}`}>{room.available ? "Dettagli" : "Non Disponibile"}</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1 bg-transparent" disabled={!room.available}>
                <Link href={`/prenota?room=${room.id}`}>Prenota</Link>
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
