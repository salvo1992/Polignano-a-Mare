import Link from "next/link"
import Image from "next/image"
import { MapPin, Phone, Mail, Facebook, Instagram, Twitter, Clock, Star } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Villa Info */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">VB</span>
              </div>
              <span className="font-display text-xl font-semibold">Villa Bella Vista</span>
            </div>
            <p className="text-background/80 mb-4 text-sm leading-relaxed">
              Un'esperienza autentica nel cuore della Toscana, dove tradizione e comfort si incontrano per creare
              ricordi indimenticabili.
            </p>
            <div className="flex items-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="text-sm ml-2">4.9/5 (127 recensioni)</span>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Contatti</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
                <div>
                  <p>Via delle Colline, 123</p>
                  <p>53024 Montalcino (SI)</p>
                  <p>Toscana, Italia</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-primary" />
                <a href="tel:+390577123456" className="hover:text-primary transition-colors">
                  +39 0577 123 456
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-primary" />
                <a href="mailto:info@villabellavista.it" className="hover:text-primary transition-colors">
                  info@villabellavista.it
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-primary" />
                <span>Check-in: 15:00 - Check-out: 11:00</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Link Utili</h3>
            <div className="space-y-2 text-sm">
              <Link href="/camere" className="block hover:text-primary transition-colors">
                Le Nostre Camere
              </Link>
              <Link href="/servizi" className="block hover:text-primary transition-colors">
                I Nostri Servizi
              </Link>
              <Link href="/prenota" className="block hover:text-primary transition-colors">
                Prenota Ora
              </Link>
              <Link href="/contatti" className="block hover:text-primary transition-colors">
                Contatti
              </Link>
              <Link href="/admin" className="block hover:text-primary transition-colors">
                Area Admin
              </Link>
              <Link href="/user" className="block hover:text-primary transition-colors">
                Area Utente
              </Link>
            </div>
          </div>

          {/* Social & Legal */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Seguici</h3>
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
                Privacy Policy
              </Link>
              <Link href="/cookies" className="block hover:text-primary transition-colors">
                Cookie Policy
              </Link>
              <Link href="/termini" className="block hover:text-primary transition-colors">
                Termini e Condizioni
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-background/20 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-background/80">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <p>© 2025 Villa Bella Vista. Tutti i diritti riservati.</p>
            </div>

            <div className="flex items-center gap-2">
              <span>Sviluppato da</span>
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
