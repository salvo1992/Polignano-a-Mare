"use client"

import { useState } from "react"
import { Wifi, Car, Waves, Space as Spa, Wine, Mountain, Camera, Users, Bus, Utensils, MapPin } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export function ServicesSection() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const { t } = useLanguage()

  const services = [
    {
      icon: Waves,
      titleKey: "outdoorPool",
      descriptionKey: "outdoorPoolDesc",
      color: "bg-blue-100 text-blue-700",
    },
    {
      icon: Wifi,
      titleKey: "freeWifi",
      descriptionKey: "freeWifiDesc",
      color: "bg-green-100 text-green-700",
    },
    {
      icon: Car,
      titleKey: "privateParking",
      descriptionKey: "privateParkingDesc",
      color: "bg-purple-100 text-purple-700",
    },
    {
      icon: Spa,
      titleKey: "wellnessCenter",
      descriptionKey: "wellnessCenterDesc",
      color: "bg-pink-100 text-pink-700",
    },
    {
      icon: Wine,
      titleKey: "bar",
      descriptionKey: "barDesc",
      color: "bg-red-100 text-red-700",
    },
    {
      icon: Mountain,
      titleKey: "guidedTours",
      descriptionKey: "guidedToursDesc",
      color: "bg-emerald-100 text-emerald-700",
    },
    {
      icon: Camera,
      titleKey: "terrace",
      descriptionKey: "terraceDesc",
      color: "bg-indigo-100 text-indigo-700",
    },
    {
      icon: Bus,
      titleKey: "airportShuttle",
      descriptionKey: "airportShuttleDesc",
      color: "bg-indigo-100 text-indigo-700",
    },
  ]

  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6">{t("servicesTitle")}</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-balance">{t("servicesDescription")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {services.map((service, index) => {
            const Icon = service.icon
            return (
              <div
                key={index}
                className={`card-invisible group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                  hoveredIndex === index ? "animate-float" : ""
                }`}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="p-6 text-center">
                  <div
                    className={`w-16 h-16 rounded-full ${service.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2 text-foreground">{t(service.titleKey)}</h3>
                  <p className="text-muted-foreground text-sm">{t(service.descriptionKey)}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="card-invisible rounded-2xl p-8 shadow-lg">
          <h3 className="font-display text-2xl font-bold text-center mb-8 text-foreground">
            {t("additionalServices")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <Users className="w-12 h-12 text-primary mx-auto mb-4" />
              <h4 className="font-semibold text-lg mb-2">{t("reception")}</h4>
              <p className="text-muted-foreground">{t("receptionDesc")}</p>
            </div>
            <div className="text-center">
              <Utensils className="w-12 h-12 text-primary mx-auto mb-4" />
              <h4 className="font-semibold text-lg mb-2">{t("localCuisine")}</h4>
              <p className="text-muted-foreground">{t("localCuisineDesc")}</p>
            </div>
            <div className="text-center">
              <MapPin className="w-12 h-12 text-primary mx-auto mb-4" />
              <h4 className="font-semibold text-lg mb-2">{t("conciergeService")}</h4>
              <p className="text-muted-foreground">{t("conciergeServiceDesc")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
