"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import { useLanguage } from "@/components/language-provider"
import { ROOMS } from "@/lib/rooms-data"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import {
  Sparkles,
  MapPin,
  Wifi,
  Car,
  Check,
  Bed,
  Users,
  Maximize,
  Bath,
  Wind,
  Tv,
  Coffee,
  Waves,
  Eye,
  Building2,
  Droplets,
  Sofa,
  Shirt,
  Zap,
  Snowflake,
  WashingMachine,
  Armchair,
  UtensilsCrossed,
  ParkingCircle,
  Refrigerator,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react"
import { useRoomPrices } from "@/hooks/use-room-prices"

export default function CamerePage() {
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation()
  const { ref: descRef, isVisible: descVisible } = useScrollAnimation()
  const { t } = useLanguage()

  const { prices: dynamicPrices } = useRoomPrices()

  const [galleryOpen, setGalleryOpen] = useState(false)
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const roomDescriptions = {
    "1": "Immergiti nel lusso della nostra Camera Familiare con Balcone, dove l'eleganza incontra il comfort. Perfetta per famiglie o gruppi, questa spaziosa suite di 35m² offre una vista mozzafiato sul mare e sui luoghi storici di Polignano. Rilassati sul tuo balcone privato mentre ammiri il tramonto sulla costa pugliese, o goditi un momento di relax nella piscina panoramica all'ultimo piano. Ogni dettaglio è stato curato per offrirti un'esperienza indimenticabile.",
    "2": "Scopri il paradiso del relax nella nostra Camera Matrimoniale con Vasca Idromassaggio. Questa elegante suite di 33m² è un'oasi di tranquillità, dotata di una lussuosa vasca idromassaggio privata e sauna per momenti di puro benessere. La vista panoramica sul mare e sulla città vecchia ti lascerà senza fiato, mentre gli arredi raffinati e i servizi premium garantiscono un soggiorno da sogno. Perfetta per coppie in cerca di romanticismo e relax assoluto.",
  }

  const roomPhotoGalleries = {
    "1": [
      { src: "/images/room-1.jpg", alt: "Camera Familiare" },
      { src: "/camera/camera4.jpg", alt: "Vista mare dal balcone" },
      { src: "/polignano-old-town-view.jpg", alt: "Vista centro storico" },
      { src: "/camera/camera1.jpg", alt: "Piscina panoramica" },
      { src: "/polignano-sunset-terrace.jpg", alt: "Terrazza al tramonto" },
      { src: "/polignano-beach-cliffs.jpg", alt: "Spiaggia e scogliere" },
      { src: "/polignano-historic-center.jpg", alt: "Centro storico" },
      { src: "/polignano-adriatic-coast.jpg", alt: "Costa adriatica" },
      { src: "/camera/camera6.jpg", alt: "Camera spaziosa" },
      { src: "/camera/camera8.jpg", alt: "Camera spaziosa" },
      { src: "/camera/camera9.jpg", alt: "Camera spaziosa" },
      { src: "/camera/camera11.jpg", alt: "Camera spaziosa" },
      { src: "/camera/camera15.jpg", alt: "Camera con vista" },
    ],
    "2": [
      { src: "/images/room-2.jpg", alt: "Camera con Jacuzzi" },
      { src: "/images/spa.jpg", alt: "Vasca idromassaggio" },
      { src: "/camera/camera18.jpg", alt: "Sauna privata" },
      { src: "/camera/camera17.jpg", alt: "Camera romantica" },
      { src: "/polignano-sea-panorama.jpg", alt: "Panorama sul mare" },
      { src: "/polignano-cala-porto.jpg", alt: "Cala Porto" },
      { src: "/polignano-lama-monachile.jpg", alt: "Lama Monachile" },
      { src: "/camera/camera5.jpg", alt: "Polignano di notte" },
      { src: "/camera/camera.jpg", alt: "Camera con vista" },
       { src: "/camera/camera3.jpg", alt: "Camera con vista" },
       { src: "/camera/camera6.jpg", alt: "Camera con vista" },
       { src: "/camera/camera7.jpg", alt: "Camera con vista" },
       { src: "/camera/camera16.jpg", alt: "Camera con vista" },
    ],
  }

  const openGallery = (roomId: string, imageIndex: number) => {
    setCurrentRoomId(roomId)
    setCurrentImageIndex(imageIndex)
    setGalleryOpen(true)
  }

  const nextImage = () => {
    if (!currentRoomId) return
    const gallery = roomPhotoGalleries[currentRoomId as keyof typeof roomPhotoGalleries]
    setCurrentImageIndex((prev) => (prev + 1) % gallery.length)
  }

  const prevImage = () => {
    if (!currentRoomId) return
    const gallery = roomPhotoGalleries[currentRoomId as keyof typeof roomPhotoGalleries]
    setCurrentImageIndex((prev) => (prev - 1 + gallery.length) % gallery.length)
  }

  const currentGallery = currentRoomId ? roomPhotoGalleries[currentRoomId as keyof typeof roomPhotoGalleries] : []

  const sharedAmenities = [
    { icon: Bed, label: "1 letto matrimoniale large + 1 divano letto" },
    { icon: Eye, label: "Vista mare" },
    { icon: Building2, label: "Vista luogo di interesse" },
    { icon: MapPin, label: "Vista città" },
    { icon: Waves, label: "Piscina con vista" },
    { icon: Waves, label: "Piscina all'ultimo piano" },
    { icon: Wind, label: "Aria condizionata" },
    { icon: Bath, label: "Bagno privato" },
    { icon: Tv, label: "TV a schermo piatto" },
    { icon: MapPin, label: "Terrazza" },
    { icon: Coffee, label: "Macchina da caffè" },
    { icon: Wifi, label: "WiFi gratis" },
    { icon: Bath, label: "Vasca o doccia" },
    { icon: Check, label: "Bidet" },
    { icon: Tv, label: "Servizio streaming (es. Netflix)" },
    { icon: Sofa, label: "Divano" },
    { icon: Shirt, label: "Asciugamani" },
    { icon: Bed, label: "Biancheria da letto" },
    { icon: Zap, label: "Presa elettrica vicino al letto" },
    { icon: Armchair, label: "Scrivania" },
    { icon: Sofa, label: "Zona soggiorno" },
    { icon: ParkingCircle, label: "Parcheggio" },
    { icon: Refrigerator, label: "Frigorifero" },
    { icon: Coffee, label: "Bollitore tè/macchina caffè" },
    { icon: Snowflake, label: "Riscaldamento" },
    { icon: WashingMachine, label: "Asciugacapelli" },
    { icon: Armchair, label: "Armadio o guardaroba" },
    { icon: UtensilsCrossed, label: "Tavolo da pranzo" },
    { icon: Bed, label: "Divano letto" },
    { icon: Droplets, label: "Vasca idromassaggio" },
    { icon: Waves, label: "Sauna" },
    { icon: Refrigerator, label: "Minibar" },
  ]

  return (
    <main className="min-h-screen overflow-x-hidden">
      <Header />

      {/* Hero Section */}
      <section className="pt-20 pb-12 bg-gradient-to-b from-secondary/20 to-background relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full animate-float" />
          <div
            className="absolute bottom-10 right-20 w-24 h-24 bg-accent/15 rounded-full animate-float"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="absolute top-1/2 right-1/4 w-16 h-16 bg-secondary/20 rounded-full animate-float"
            style={{ animationDelay: "2s" }}
          />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div
              ref={heroRef}
              className={`transition-all duration-1000 ${heroVisible ? "animate-slide-in-up opacity-100" : "opacity-0 translate-y-[50px]"}`}
            >
              <div className="flex items-center justify-center gap-3 mb-4">
                <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                <h1 className="font-cinzel text-4xl md:text-6xl font-bold text-roman-gradient animate-text-shimmer">
                  {t("roomsPageTitle")}
                </h1>
                <Sparkles className="w-8 h-8 text-accent animate-pulse" style={{ animationDelay: "0.5s" }} />
              </div>
            </div>

            <div
              ref={descRef}
              className={`transition-all duration-1000 delay-300 ${descVisible ? "animate-fade-in-up opacity-100" : "opacity-0 translate-y-[30px]"}`}
            >
              <p className="text-xl text-muted-foreground text-balance mb-8">{t("roomsPageSubtitle")}</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
                <div className="flex flex-col items-center gap-2 group hover:scale-110 transition-transform duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center group-hover:shadow-lg transition-shadow">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{t("centerPolignano")}</span>
                </div>
                <div className="flex flex-col items-center gap-2 group hover:scale-110 transition-transform duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center group-hover:shadow-lg transition-shadow">
                    <Wifi className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{t("freeWifiShort")}</span>
                </div>
                <div className="flex flex-col items-center gap-2 group hover:scale-110 transition-transform duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center group-hover:shadow-lg transition-shadow">
                    <Car className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{t("parking")}</span>
                </div>
                <div className="flex flex-col items-center gap-2 group hover:scale-110 transition-transform duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center group-hover:shadow-lg transition-shadow">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{t("service5Star")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-gradient-to-b from-background to-secondary/10 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 mb-16">
            {ROOMS.map((room) => {
              const currentPrice = dynamicPrices[room.id] || room.price
              const currentOriginalPrice = room.originalPrice
              const gallery = roomPhotoGalleries[room.id as keyof typeof roomPhotoGalleries]
              const totalPhotos = gallery.length
              const visiblePhotos = 5
              const remainingPhotos = totalPhotos - visiblePhotos

              return (
                <Card
                  key={room.id}
                  className="p-4 sm:p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-cyan-200/60 dark:border-cyan-800/60 bg-gradient-to-br from-cyan-50/40 via-blue-50/30 to-cyan-50/40 dark:from-cyan-950/20 dark:via-blue-950/15 dark:to-cyan-950/20 hover:border-cyan-300/80 dark:hover:border-cyan-700/80"
                >
                  {/* Room Header */}
                  <div className="text-center mb-4">
                    <h2 className="font-cinzel text-xl sm:text-2xl font-bold text-roman-gradient mb-3">{room.name}</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed text-balance px-2">
                      {roomDescriptions[room.id as keyof typeof roomDescriptions]}
                    </p>
                  </div>

                  {/* Price Section */}
                  <div className="mb-4 flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-lg border border-cyan-200/40 dark:border-cyan-800/40">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">A partire da</p>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-2xl sm:text-3xl font-bold text-primary">€{currentPrice}</span>
                        <span className="text-base sm:text-lg text-muted-foreground line-through">
                          €{currentOriginalPrice}
                        </span>
                        <span className="text-xs sm:text-sm text-muted-foreground">/ notte</span>
                      </div>
                    </div>
                    <Button asChild size="sm" className="shadow-lg shrink-0">
                      <Link href={`/prenota?room=${room.id}`}>
                        Prenota
                        <Sparkles className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-4">
                    {/* Large main image - takes 2 columns and 2 rows */}
                    <button
                      onClick={() => openGallery(room.id, 0)}
                      className="col-span-2 row-span-2 relative aspect-square overflow-hidden rounded-lg shadow-md group cursor-pointer"
                    >
                      <Image
                        src={gallery[0].src || "/placeholder.svg"}
                        alt={gallery[0].alt}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </button>

                    {/* 4 smaller images with "+X foto" overlay on the last one */}
                    {gallery.slice(1, 5).map((photo, i) => (
                      <button
                        key={i}
                        onClick={() => openGallery(room.id, i + 1)}
                        className="relative aspect-square overflow-hidden rounded-lg shadow-sm group cursor-pointer"
                      >
                        <Image
                          src={photo.src || "/placeholder.svg"}
                          alt={photo.alt}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        {i === 3 && remainingPhotos > 0 && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px] pointer-events-none">
                            <span className="text-white font-semibold text-sm sm:text-base">
                              +{remainingPhotos} foto
                            </span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Room Details Cards */}
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    <div className="p-2 sm:p-3 text-center bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors border border-cyan-200/30 dark:border-cyan-800/30">
                      <Users className="w-4 sm:w-5 h-4 sm:h-5 text-primary mx-auto mb-1" />
                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Ospiti</p>
                      <p className="text-base sm:text-lg font-bold text-primary">{room.guests}</p>
                    </div>
                    <div className="p-2 sm:p-3 text-center bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors border border-cyan-200/30 dark:border-cyan-800/30">
                      <Bed className="w-4 sm:w-5 h-4 sm:h-5 text-primary mx-auto mb-1" />
                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Letti</p>
                      <p className="text-base sm:text-lg font-bold text-primary">{room.beds}</p>
                    </div>
                    <div className="p-2 sm:p-3 text-center bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors border border-cyan-200/30 dark:border-cyan-800/30">
                      <Bath className="w-4 sm:w-5 h-4 sm:h-5 text-primary mx-auto mb-1" />
                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Bagni</p>
                      <p className="text-base sm:text-lg font-bold text-primary">{room.bathrooms}</p>
                    </div>
                    <div className="p-2 sm:p-3 text-center bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors border border-cyan-200/30 dark:border-cyan-800/30">
                      <Maximize className="w-4 sm:w-5 h-4 sm:h-5 text-primary mx-auto mb-1" />
                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">m²</p>
                      <p className="text-base sm:text-lg font-bold text-primary">{room.size}</p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Shared Amenities Section */}
          <Card className="p-8 shadow-2xl bg-gradient-to-br from-cyan-50/50 to-blue-50/50 dark:from-cyan-950/20 dark:to-blue-950/20 max-w-6xl mx-auto border-2 border-cyan-200/50 dark:border-cyan-800/50">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
              </div>
              Servizi della Camera
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sharedAmenities.map((amenity, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-cyan-100/50 dark:hover:bg-cyan-900/20 hover:shadow-md transition-all duration-300 border border-transparent hover:border-cyan-300/50 dark:hover:border-cyan-700/50"
                >
                  <div className="w-8 h-8 bg-cyan-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <amenity.icon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <span className="text-sm font-medium">{amenity.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* Photo Gallery Modal */}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] w-[95vw] md:w-full p-2 md:p-4 bg-black/95 border-none">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Main Image */}
            <div className="relative w-full h-[60vh] md:h-[70vh] flex items-center justify-center">
              <Image
                src={currentGallery[currentImageIndex]?.src || "/placeholder.svg"}
                alt={currentGallery[currentImageIndex]?.alt || ""}
                fill
                className="object-contain"
              />
            </div>

            {/* Close Button */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white z-50 w-8 h-8 md:w-10 md:h-10"
              onClick={() => setGalleryOpen(false)}
            >
              <X className="w-4 h-4 md:w-5 md:h-5" />
            </Button>

            {/* Navigation Buttons */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-8 h-8 md:w-10 md:h-10"
              onClick={prevImage}
            >
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-8 h-8 md:w-10 md:h-10"
              onClick={nextImage}
            >
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
            </Button>

            {/* Image Counter */}
            <Badge className="absolute top-2 left-2 bg-black/70 text-white text-xs md:text-sm px-2 md:px-3 py-1">
              {currentImageIndex + 1} / {currentGallery.length}
            </Badge>

            {/* Thumbnail Navigation */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 md:gap-2 overflow-x-auto max-w-[90vw] pb-1 px-2">
              {currentGallery.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`relative flex-shrink-0 w-12 h-9 md:w-16 md:h-12 rounded overflow-hidden border-2 transition-all ${
                    index === currentImageIndex
                      ? "border-primary shadow-lg scale-110"
                      : "border-white/30 hover:border-white/60"
                  }`}
                >
                  <Image
                    src={photo.src || "/placeholder.svg"}
                    alt={`Thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </main>
  )
}

