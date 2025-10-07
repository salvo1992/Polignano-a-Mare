"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Eye, Lock, Users, Mail, Phone } from "lucide-react"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"

export default function PrivacyPage() {
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation()

  return (
    <main className="min-h-screen">
      <Header />

      <div className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Hero Section */}
          <div
            ref={heroRef}
            className={`text-center mb-12 transition-all duration-1000 ${heroVisible ? "animate-fade-in-up opacity-100" : "opacity-0 translate-y-[50px]"}`}
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Shield className="w-8 h-8 text-primary animate-pulse" />
              <h1 className="text-4xl md:text-6xl font-cinzel font-bold text-roman-gradient animate-text-shimmer">
                Privacy Policy
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              La tua privacy è importante per noi. Scopri come proteggiamo i tuoi dati personali.
            </p>
          </div>

          <div className="space-y-8">
            <Card className="card-invisible">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Eye className="w-5 h-5" />
                  Informazioni che Raccogliamo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Raccogliamo le seguenti informazioni quando utilizzi i nostri servizi:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Dati di contatto (nome, email, telefono)</li>
                  <li>Informazioni di prenotazione (date, preferenze, richieste speciali)</li>
                  <li>Dati di pagamento (elaborati tramite gateway sicuri)</li>
                  <li>Informazioni di utilizzo del sito web (cookies, analytics)</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="card-invisible">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Lock className="w-5 h-5" />
                  Come Utilizziamo i Tuoi Dati
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Utilizziamo i tuoi dati personali per:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Gestire le tue prenotazioni e fornire i nostri servizi</li>
                  <li>Comunicare con te riguardo al tuo soggiorno</li>
                  <li>Migliorare la qualità dei nostri servizi</li>
                  <li>Inviarti offerte speciali (solo con il tuo consenso)</li>
                  <li>Rispettare gli obblighi legali e fiscali</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="card-invisible">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Users className="w-5 h-5" />
                  Condivisione dei Dati
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Non vendiamo mai i tuoi dati personali. Condividiamo informazioni solo quando:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>È necessario per fornire i servizi richiesti</li>
                  <li>Richiesto dalla legge o dalle autorità competenti</li>
                  <li>Con fornitori di servizi fidati (processori di pagamento, servizi di pulizia)</li>
                  <li>Hai dato il tuo consenso esplicito</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="card-invisible">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Shield className="w-5 h-5" />I Tuoi Diritti
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Secondo il GDPR, hai diritto a:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Accedere ai tuoi dati personali</li>
                  <li>Correggere informazioni inesatte</li>
                  <li>Richiedere la cancellazione dei tuoi dati</li>
                  <li>Limitare il trattamento dei tuoi dati</li>
                  <li>Portabilità dei dati</li>
                  <li>Opporti al trattamento per marketing diretto</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="card-invisible bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Mail className="w-5 h-5" />
                  Contattaci
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">Per qualsiasi domanda sulla privacy o per esercitare i tuoi diritti:</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <span>privacy@villabellavista.it</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    <span>+39 06 1234 5678</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">Ultimo aggiornamento: Gennaio 2025</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
