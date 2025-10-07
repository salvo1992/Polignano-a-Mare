"use client"

import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Bed, Bath, Mountain, Star } from "lucide-react"

// Sample related rooms data - in a real app this would come from props or API
const relatedRooms = [
  {
    id: 2,
    name: "Camera Deluxe",
    description: "Elegante camera con arredi tradizionali toscani",
    image: "/elegant-hotel-room-with-traditional-tuscan-decor.jpg",
    price: 150,
    originalPrice: 180,
    guests: 2,
    beds: 1,
    bathrooms: 1,
    size: 28,
    rating: 4.8,
    reviews: 32,
    available: true,
  },
  {
    id: 3,
    name: "Suite Familiare",
    description: "Spaziosa suite ideale per famiglie con terrazza",
    image: "/spacious-family-hotel-suite-with-terrace.jpg",
    price: 220,
    originalPrice: 260,
    guests: 4,
    beds: 2,
    bathrooms: 2,
    size: 50,
    rating: 4.9,
    reviews: 28,
    available: true,
  },
  {
    id: 5,
    name: "Suite Romantica",
    description: "Suite intima con vasca idromassaggio",
    image: "/romantic-hotel-suite-with-jacuzzi-and-sunset-view.jpg",
    price: 250,
    originalPrice: 300,
    guests: 2,
    beds: 1,
    bathrooms: 1,
    size: 40,
    rating: 5.0,
    reviews: 23,
    available: true,
  },
]

interface RelatedRoomsProps {
  currentRoomId: string
}

export function RelatedRooms({ currentRoomId }: RelatedRoomsProps) {
  // Filter out the current room
  const filteredRooms = relatedRooms.filter((room) => room.id.toString() !== currentRoomId)

  return (
    <div className="py-12">
      <div className="mb-8">
        <h2 className="font-display text-3xl font-bold text-foreground mb-4">Altre Camere Disponibili</h2>
        <p className="text-muted-foreground text-lg">Scopri le altre eleganti sistemazioni del nostro B&B</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredRooms.map((room) => (
          <Card key={room.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300">
            <div className="relative overflow-hidden">
              <Image
                src={room.image || "/placeholder.svg"}
                alt={room.name}
                width={400}
                height={300}
                className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500"
              />

              {/* Price Badge */}
              <div className="absolute bottom-4 right-4 bg-black/80 text-white px-3 py-2 rounded-lg">
                <div className="text-right">
                  {room.originalPrice > room.price && (
                    <div className="text-xs line-through opacity-75">€{room.originalPrice}</div>
                  )}
                  <div className="font-bold">€{room.price}/notte</div>
                </div>
              </div>

              {/* Discount Badge */}
              {room.originalPrice > room.price && (
                <Badge className="absolute top-4 left-4 bg-green-600 text-white">Offerta Speciale</Badge>
              )}
            </div>

            <CardContent className="p-6">
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

              <div className="flex gap-2">
                <Button asChild className="flex-1" disabled={!room.available}>
                  <Link href={`/camere/${room.id}`}>{room.available ? "Dettagli" : "Non Disponibile"}</Link>
                </Button>
                <Button asChild variant="outline" className="flex-1 bg-transparent" disabled={!room.available}>
                  <Link href={`/prenota?room=${room.id}`}>Prenota</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View All Rooms Button */}
      <div className="text-center mt-8">
        <Button asChild variant="outline" size="lg">
          <Link href="/camere">Vedi Tutte le Camere</Link>
        </Button>
      </div>
    </div>
  )
}
