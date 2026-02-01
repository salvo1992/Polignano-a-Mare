"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Bed, Bath, Star, ArrowRight } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { useRoomPrices } from "@/hooks/use-room-prices"

const rooms = [
  {
    id: 1,
    roomId: "2",
    name: "Aquarum co jacuzzi Privata e sauna ",
    description: "Camera matrimoniale con Vasca Idromassaggio",
    image: "/images/room-1.jpg",
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
    roomId: "1",
    name: "Acies con 2 bagni e balconcino privato",
    description: "Elegante camera con arredi tradizionali Pugliesi e comfort moderni",
    image: "/images/room-2.jpg",
    guests: 2,
    beds: 1,
    bathrooms: 1,
    amenities: ["Aria condizionata", "TV satellitare", "Cassaforte", "Asciugacapelli"],
    rating: 4.8,
    reviews: 32,
    featured: false,
  },
]

export function RoomsPreview() {
  const [hoveredRoom, setHoveredRoom] = useState<number | null>(null)
  const { t } = useLanguage()
  const { prices: roomPrices, loading } = useRoomPrices()

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6">{t("roomsTitle")}</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">{t("roomsDescription")}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {rooms.map((room, index) => {
            const roomPrice = roomPrices[room.roomId] || 0
            const priceDisplay = loading ? "..." : `€${roomPrice}`

            return (
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
                    <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">{t("featured")}</Badge>
                  )}
                  <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {priceDisplay}/{t("perNight")}
                  </div>
                  <Link href={`/camere/${room.id}`} className="absolute top-14 right-4">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-xs h-7 hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      {t("details")}
                    </Button>
                  </Link>
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

                  <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>
                        {room.guests} {t("guests")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bed className="w-4 h-4" />
                      <span>
                        {room.beds} {t("bed")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bath className="w-4 h-4" />
                      <span>
                        {room.bathrooms} {t("bathroom")}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {room.amenities.slice(0, 3).map((amenity, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                    {room.amenities.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{room.amenities.length - 3} {t("moreAmenities")}
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button asChild className="flex-1">
                      <Link href={`/camere/${room.id}`}>{t("viewDetails")}</Link>
                    </Button>
                    <Button asChild variant="outline" className="flex-1 bg-transparent">
                      <Link href="/prenota">{t("bookRoom")}</Link>
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="text-center">
          <Button asChild size="lg" variant="outline" className="group bg-transparent">
            <Link href="/camere" className="flex items-center gap-2">
              {t("viewAllRooms")}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
