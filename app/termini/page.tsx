"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Scale, CreditCard, Calendar, AlertTriangle, Mail, Phone } from "lucide-react"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"

export default function TerminiPage() {
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
              <Scale className="w-8 h-8 text-primary animate-pulse" />
              <h1 className="text-4xl md:text-6xl font-cinzel font-bold text-roman-gradient animate-text-shimmer">
                Termini e Condizioni
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Leggi i termini e le condizioni per l'utilizzo dei nostri servizi di ospitalità.
            </p>
          </div>

          <div className="space-y-8">
            <Card className="card-invisible">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <FileText className="w-5 h-5" />
                  Informazioni Generali
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Villa Bella Vista è gestita da EkoBit S.r.l., con sede in Via dei Colli Romani, 123 - 00100 Roma,
                  Italia. P.IVA: 12345678901
                </p>
                <p>
                  Utilizzando i nostri servizi, accetti questi termini e condizioni. Ti preghiamo di leggerli
                  attentamente prima di effettuare una prenotazione.
                </p>
              </CardContent>
            </Card>

            <Card className="card-invisible">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Calendar className="w-5 h-5" />
                  Prenotazioni e Cancellazioni
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Politica di Prenotazione:</h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Le prenotazioni sono confermate solo dopo il pagamento dell'acconto</li>
                    <li>Check-in: dalle 15:00 alle 20:00</li>
                    <li>Check-out: dalle 08:00 alle 11:00</li>
                    <li>È richiesto un documento di identità valido</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Politica di Cancellazione:</h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Cancellazione gratuita fino a 7 giorni prima dell'arrivo</li>
                    <li>Cancellazione da 7 a 3 giorni prima: 50% di penale</li>
                    <li>Cancellazione entro 3 giorni: 100% di penale</li>
                    <li>No-show: addebito dell'intero soggiorno</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="card-invisible">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <CreditCard className="w-5 h-5" />
                  Pagamenti e Prezzi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Modalità di Pagamento:</h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Acconto del 30% richiesto alla prenotazione</li>
                    <li>Saldo al check-in o 7 giorni prima dell'arrivo</li>
                    <li>Accettiamo carte di credito, bonifico bancario e contanti</li>
                    <li>Tassa di soggiorno non inclusa (€3/persona/notte)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Prezzi:</h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>I prezzi sono soggetti a variazioni stagionali</li>
                    <li>IVA inclusa dove applicabile</li>
                    <li>Offerte speciali soggette a disponibilità</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="card-invisible">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <AlertTriangle className="w-5 h-5" />
                  Responsabilità e Comportamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Responsabilità dell'Ospite:</h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Rispettare il regolamento interno della struttura</li>
                    <li>Non disturbare gli altri ospiti (silenzio dalle 22:00 alle 08:00)</li>
                    <li>Non fumare nelle aree interne</li>
                    <li>Segnalare immediatamente eventuali danni</li>
                    <li>Rispettare il numero massimo di ospiti per camera</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Limitazioni di Responsabilità:</h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Non siamo responsabili per oggetti di valore non depositati in cassaforte</li>
                    <li>Assicurazione di viaggio consigliata</li>
                    <li>Responsabilità limitata secondo la normativa italiana</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="card-invisible">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Scale className="w-5 h-5" />
                  Legge Applicabile e Foro Competente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Questi termini e condizioni sono regolati dalla legge italiana. Per qualsiasi controversia è
                  competente il Foro di Roma.
                </p>
                <p>In caso di conflitto tra la versione italiana e altre traduzioni, prevale la versione italiana.</p>
              </CardContent>
            </Card>

            <Card className="card-invisible bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Mail className="w-5 h-5" />
                  Contatti e Assistenza
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">Per domande sui termini e condizioni o assistenza:</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <span>info@villabellavista.it</span>
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
