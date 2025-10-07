"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { RoomsGrid } from "@/components/rooms-grid"
import { RoomFilters } from "@/components/room-filters"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import { Sparkles, MapPin, Wifi, Car } from "lucide-react"

export default function CamerePage() {
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation()
  const { ref: descRef, isVisible: descVisible } = useScrollAnimation()

  return (
    <main className="min-h-screen">
      <Header />

      <section className="pt-20 pb-12 bg-gradient-to-b from-secondary/20 to-background relative overflow-hidden">
        {/* Animated background elements */}
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
                  Le Nostre Camere
                </h1>
                <Sparkles className="w-8 h-8 text-accent animate-pulse" style={{ animationDelay: "0.5s" }} />
              </div>
            </div>

            <div
              ref={descRef}
              className={`transition-all duration-1000 delay-300 ${descVisible ? "animate-fade-in-up opacity-100" : "opacity-0 translate-y-[30px]"}`}
            >
              <p
                className="text-xl text-muted-foreground text-balance mb-8 animate-fade-in-up"
                style={{ animationDelay: "0.5s" }}
              >
                Scopri il comfort e l'eleganza delle nostre camere, ognuna progettata per offrirti un'esperienza di
                soggiorno indimenticabile nel cuore della Città Eterna
              </p>

              <div
                className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto animate-fade-in-up"
                style={{ animationDelay: "0.7s" }}
              >
                <div className="flex flex-col items-center gap-2 group hover:scale-110 transition-transform duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center group-hover:shadow-lg transition-shadow">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-sm font-medium">Centro Roma</span>
                </div>
                <div className="flex flex-col items-center gap-2 group hover:scale-110 transition-transform duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center group-hover:shadow-lg transition-shadow">
                    <Wifi className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-sm font-medium">WiFi Gratuito</span>
                </div>
                <div className="flex flex-col items-center gap-2 group hover:scale-110 transition-transform duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center group-hover:shadow-lg transition-shadow">
                    <Car className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-sm font-medium">Parcheggio</span>
                </div>
                <div className="flex flex-col items-center gap-2 group hover:scale-110 transition-transform duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center group-hover:shadow-lg transition-shadow">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-sm font-medium">Servizio 5★</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="container mx-auto px-4">
          <div className="text-center animate-fade-in-up">
            <p className="text-lg font-medium text-roman-gradient italic">
              "Ogni camera racconta una storia, ogni soggiorno diventa un ricordo indimenticabile"
            </p>
          </div>
        </div>
      </section>

      {/* Filters and Rooms */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <RoomFilters />
          <RoomsGrid />
        </div>
      </section>

      <Footer />
    </main>
  )
}
