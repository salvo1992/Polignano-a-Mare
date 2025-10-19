"use client"

import Link from "next/link"
import Image from "next/image"
import { MapPin, Phone, Mail, Facebook, Instagram, Twitter, Clock, Star } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="bg-foreground text-background">
  <div className="container mx-auto px-3 sm:px-4 py-10 sm:py-12">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
      {/* Villa Info */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          {/* LOGO senza cerchio */}
          <div className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 shrink-0">
            <Image
              src="/images/logo22.jpg"
              alt="Logo Al 22 Suite & Spa Luxury Experience"
              fill
              className="object-contain"
              sizes="(max-width: 640px) 40px, (max-width: 768px) 48px, 56px"
            />
          </div>

          {/* Nome breve (mobile) */}
          <span className="font-display font-semibold text-sm sm:hidden max-w-[55vw] truncate">
            Al 22 Suite & Spa
          </span>
          {/* Nome completo da sm in su */}
          <span className="hidden sm:inline font-display text-lg md:text-xl font-semibold whitespace-nowrap">
            Al 22 Suite & <br className="hidden sm:block" /> Spa Luxury Experience
          </span>
        </div>

        <p className="text-background/80 mb-4 text-sm leading-relaxed">
          {t("footerDescription")}
        </p>

        <div className="flex items-center gap-1 mb-2">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          ))}
          <span className="text-sm ml-2">
            4.9/5 (127 {t("reviewsTitle").toLowerCase()})
          </span>
        </div>
      </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold text-lg mb-4">{t("contacts")}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
                <div>
                  <p>Vico Gelso I n 22</p>
                  <p>70044 Polignano a Mare (BA)</p>
                  <p>Puglia, Italia</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-primary" />
                <a href="tel:+390577123456" className="hover:text-primary transition-colors">
                  +39 3283287303
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-primary" />
                <a href="mailto:info@villabellavista.it" className="hover:text-primary transition-colors">
                  info@AL22Suite&<br className="hidden sm:block" /> SPALUXURYEXPERIENCE.it
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-primary" />
                <span>
                  {t("checkIn")}: 15:00 - {t("checkOut")}: 11:00
                </span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">{t("quickLinks")}</h3>
            <div className="space-y-2 text-sm">
              <Link href="/camere" className="block hover:text-primary transition-colors">
                {t("rooms")}
              </Link>
              <Link href="/servizi" className="block hover:text-primary transition-colors">
                {t("services")}
              </Link>
              <Link href="/prenota" className="block hover:text-primary transition-colors">
                {t("bookNow")}
              </Link>
              <Link href="/contatti" className="block hover:text-primary transition-colors">
                {t("contacts")}
              </Link>
              <Link href="/admin" className="block hover:text-primary transition-colors">
                {t("admin")}
              </Link>
              <Link href="/user" className="block hover:text-primary transition-colors">
                {t("user")}
              </Link>
            </div>
          </div>

          {/* Social & Legal */}
          <div>
            <h3 className="font-semibold text-lg mb-4">{t("followUs")}</h3>
            <div className="flex gap-4 mb-6">
              <a href="#" className="text-background/80 hover:text-primary transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-background/80 hover:text-primary transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-background/80 hover:text-primary transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
            </div>

            <div className="space-y-2 text-sm">
              <Link href="/privacy" className="block hover:text-primary transition-colors">
                {t("privacyPolicy")}
              </Link>
              <Link href="/cookies" className="block hover:text-primary transition-colors">
                {t("cookiePolicy")}
              </Link>
              <Link href="/termini" className="block hover:text-primary transition-colors">
                {t("termsOfService")}
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-background/20 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-background/80">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <p>© COPYRIGHT 2025 - AL 22 Suite & SPA LUXURY EXPERIENCE {t("allRightsReserved")}.</p>
            </div>

            <div className="flex items-center gap-2">
              <span>POWERED BY </span>
              <div className="flex items-center gap-1">
                <Image src="/images/ekobit-logo.png" alt="EkoBit S.r.l." width={16} height={16} className="rounded" />
                <span className="font-medium">EkoBit S.r.l.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
