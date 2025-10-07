"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Star, MapPin } from "lucide-react"

const heroImages = [
  {
    src: "/images/bb-hero.jpg",
    alt: "Villa Bella Vista - Vista principale",
    title: "Benvenuti a Villa Bella Vista",
    subtitle: "Un'esperienza autentica nel cuore di Roma",
  },
  {
    src: "/images/pool.jpg",
    alt: "Piscina panoramica",
    title: "Relax e Tranquillità",
    subtitle: "Goditi la nostra piscina con vista mozzafiato",
  },
  {
    src: "/images/breakfast.jpg",
    alt: "Colazione tradizionale",
    title: "Sapori Autentici",
    subtitle: "Inizia la giornata con la nostra colazione tipica romana",
  },
]

export function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroImages.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroImages.length) % heroImages.length)
  }

  return (
    <section className="relative h-screen overflow-hidden">
      {/* Background Images with enhanced transitions */}
      {heroImages.map((image, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-all duration-2000 ease-in-out ${
            index === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-105"
          }`}
        >
          <Image
            src={image.src || "/placeholder.svg?height=1080&width=1920&query=luxury B&B villa in Rome"}
            alt={image.alt}
            fill
            className="object-cover"
            priority={index === 0}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/50" />
        </div>
      ))}

      {/* Floating particles animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Content with enhanced animations */}
      <div className="relative z-10 h-full flex items-center justify-center">
        <div className="text-center text-white px-4 max-w-5xl mx-auto">
          <div
            className={`transition-all duration-1500 ${isLoaded ? "animate-fade-in-up" : "opacity-0 translate-y-10"}`}
          >
            <h1 className="font-roman text-6xl md:text-8xl font-bold mb-8 text-balance text-roman-gradient animate-shimmer">
              {heroImages[currentSlide].title}
            </h1>
            <p className="text-2xl md:text-3xl mb-10 text-balance opacity-90 font-light tracking-wide">
              {heroImages[currentSlide].subtitle}
            </p>

            {/* Enhanced rating section */}
            <div
              className="flex items-center justify-center gap-3 mb-10 animate-bounce-in"
              style={{ animationDelay: "0.5s" }}
            >
              <div className="flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-4 py-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-6 h-6 fill-yellow-400 text-yellow-400 animate-pulse-slow"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
              <span className="text-2xl font-bold">4.9/5</span>
              <span className="text-lg opacity-75">(127 recensioni)</span>
            </div>

            {/* Enhanced location */}
            <div
              className="flex items-center justify-center gap-3 mb-12 animate-slide-in-up"
              style={{ animationDelay: "0.8s" }}
            >
              <div className="bg-primary/20 backdrop-blur-sm rounded-full p-2">
                <MapPin className="w-6 h-6 text-primary animate-pulse" />
              </div>
              <span className="text-xl font-medium">Roma, Lazio, Italia</span>
            </div>

            {/* Enhanced CTA Buttons */}
            <div
              className="flex flex-col sm:flex-row gap-6 justify-center animate-slide-in-up"
              style={{ animationDelay: "1s" }}
            >
              <Button
                size="lg"
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-xl px-12 py-4 rounded-full shadow-2xl hover:shadow-primary/25 transition-all duration-300 hover:scale-105 animate-shimmer"
              >
                Prenota il Tuo Soggiorno
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white text-white hover:bg-white hover:text-foreground text-xl px-12 py-4 rounded-full bg-white/10 backdrop-blur-sm transition-all duration-300 hover:scale-105"
              >
                Scopri di Più
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Navigation Arrows */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-6 top-1/2 -translate-y-1/2 z-20 text-white hover:bg-white/20 w-14 h-14 rounded-full backdrop-blur-sm border border-white/20 transition-all duration-300 hover:scale-110"
        onClick={prevSlide}
      >
        <ChevronLeft className="w-8 h-8" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-6 top-1/2 -translate-y-1/2 z-20 text-white hover:bg-white/20 w-14 h-14 rounded-full backdrop-blur-sm border border-white/20 transition-all duration-300 hover:scale-110"
        onClick={nextSlide}
      >
        <ChevronRight className="w-8 h-8" />
      </Button>

      {/* Enhanced Slide Indicators */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex gap-3">
        {heroImages.map((_, index) => (
          <button
            key={index}
            className={`w-4 h-4 rounded-full transition-all duration-300 ${
              index === currentSlide ? "bg-white scale-125 shadow-lg" : "bg-white/50 hover:bg-white/75 hover:scale-110"
            }`}
            onClick={() => setCurrentSlide(index)}
          />
        ))}
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/70 rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  )
}
