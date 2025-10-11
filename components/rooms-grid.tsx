"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Bed, Bath, Mountain, Star, Heart, Share2 } from "lucide-react"

// 🔧 CAMBIA QUI: se in futuro cambi dominio, aggiorna questo valore
const SITE_URL = "https://22suite.ekobit.it" as const

// Dati demo; i tuoi reali possono arrivare da props o API
const rooms = [
  {
    id: 1,
    name: "Camera Familiare con Balcone",
    description: "Camera matrimoniale  e balcone privato",
    images: ["/images/room-2.jpg", "/images/room-1.jpg"],
    price: 180,
    originalPrice: 220,
    guests: 4,
    beds: 2,
    bathrooms: 2,
    size: 35,
    amenities: [
      "Vista luogo di interesse",
      "vista mare",
      "Balcone privato",
      "WiFi gratuito",
      "Minibar",
      "Aria condizionata",
      "TV satellitare",
    ],
    rating: 4.9,
    reviews: 56,
    featured: true,
    available: true,
  },
  {
    id: 2,
    name: "Camera Matrimoniale con Vasca Idromassaggio",
    description: "Elegante camera con vasca idromassaggio e arredi di lusso",
    images: ["/images/room-1.jpg", "/images/room-2.jpg"],
    price: 150,
    originalPrice: 180,
    guests: 4,
    beds: 2,
    bathrooms: 1,
    size: 33,
    amenities: ["Aria condizionata", "TV satellitare", "Vasca idromassaggio", "Asciugacapelli", "WiFi gratuito", "Minibar"],
    rating: 4.9,
    reviews: 56,
    featured: false,
    available: true,
  },
]

export function RoomsGrid() {
  // Preferiti persistenti per ID (localStorage)
  const [favorites, setFavorites] = useState<number[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const raw = localStorage.getItem("favoritesRooms")
      return raw ? (JSON.parse(raw) as number[]) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem("favoritesRooms", JSON.stringify(favorites))
    } catch {}
  }, [favorites])

  const toggleFavorite = (roomId: number) => {
    setFavorites((prev) => (prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]))
  }

  // 🔧 CAMBIA QUI (se la route non è /camere/:id):
  // se usi slug o un path diverso, modifica questo costruttore di URL
  const getRoomUrl = (roomId: number) => `${SITE_URL}/camere/${roomId}`

  // Link WhatsApp: testo + URL camera, tutto codificato
  const getWhatsAppHref = (room: (typeof rooms)[number]) => {
    const text = `Guarda questa camera: ${room.name}
${getRoomUrl(room.id)}

Prezzo da €${room.price}/notte`
    return `https://wa.me/?text=${encodeURIComponent(text)}`
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-10">
      {rooms.map((room) => {
        const isFav = favorites.includes(room.id)
        const waHref = getWhatsAppHref(room)

        return (
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

              {/* Pulsanti azione */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                {/* ❤️ Preferito persistente */}
                <Button
                  size="icon"
                  variant="secondary"
                  className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => toggleFavorite(room.id)}
                  aria-pressed={isFav}
                  aria-label={isFav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
                >
                  <Heart className={`w-4 h-4 ${isFav ? "fill-red-500 text-red-500" : ""}`} />
                </Button>

                {/* 📲 Condividi WhatsApp */}
                <Button
                  asChild
                  size="icon"
                  variant="secondary"
                  className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Condividi ${room.name} su WhatsApp`}
                >
                  <a href={waHref} target="_blank" rel="noopener noreferrer">
                    <Share2 className="w-4 h-4" />
                  </a>
                </Button>
              </div>

              {/* Prezzo */}
              <div className="absolute bottom-4 right-4 bg-black/80 text-white px-3 py-2 rounded-lg">
                <div className="text-right">
                  {room.originalPrice > room.price && <div className="text-xs line-through opacity-75">€{room.originalPrice}</div>}
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

              {/* Dettagli */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1"><Users className="w-4 h-4" /><span>{room.guests} ospiti</span></div>
                <div className="flex items-center gap-1"><Bed className="w-4 h-4" /><span>{room.beds} letto</span></div>
                <div className="flex items-center gap-1"><Bath className="w-4 h-4" /><span>{room.bathrooms} bagno</span></div>
                <div className="flex items-center gap-1"><Mountain className="w-4 h-4" /><span>{room.size} m²</span></div>
              </div>

              <div className="flex gap-2">
                {/* 🔧 CAMBIA QUI se il path della pagina dettagli camera è diverso */}
                <Button asChild className="flex-1" disabled={!room.available}>
                  <Link href={`/camere/${room.id}`}>{room.available ? "Dettagli" : "Non Disponibile"}</Link>
                </Button>
                <Button asChild variant="outline" className="flex-1 bg-transparent" disabled={!room.available}>
                  <Link href={`/prenota?room=${room.id}`}>Prenota</Link>
                </Button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
