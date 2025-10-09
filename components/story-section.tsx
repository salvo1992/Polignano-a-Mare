"use client"

import Image from "next/image"
import { Heart, Award, Users, Calendar } from "lucide-react"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"

export function StorySection() {
  const { ref: titleRef, isVisible: titleVisible } = useScrollAnimation()
  const { ref: contentRef, isVisible: contentVisible } = useScrollAnimation()
  const { ref: statsRef, isVisible: statsVisible } = useScrollAnimation()
  const { ref: imagesRef, isVisible: imagesVisible } = useScrollAnimation()

  return (
    <section className="py-20 bg-accent/10 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-10 left-10 w-32 h-32 bg-primary/10 rounded-full animate-float" />
        <div
          className="absolute bottom-20 right-20 w-24 h-24 bg-accent/20 rounded-full animate-float"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute top-1/2 left-1/4 w-16 h-16 bg-secondary/15 rounded-full animate-float"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div>
            <div
              ref={titleRef}
              className={`transition-all duration-1000 ${titleVisible ? "animate-slide-in-left opacity-100" : "opacity-0 translate-x-[-100px]"}`}
            >
              <h2 className="font-cinzel text-4xl md:text-5xl font-bold text-roman-gradient mb-6 animate-text-shimmer">
                La Nostra Storia
              </h2>
            </div>

            <div
              ref={contentRef}
              className={`prose prose-lg max-w-none transition-all duration-1000 delay-300 ${contentVisible ? "animate-slide-in-left opacity-100" : "opacity-0 translate-x-[-50px]"}`}
            >
              <p
                className="text-muted-foreground mb-6 text-lg leading-relaxed animate-fade-in-up"
                style={{ animationDelay: "0.5s" }}
              >
                Benvenuti ad Al 22 Suite & Spa Luxury Experience Ciao a tutti! Mi chiamo Angelo e ho l'onore di essere il gestore dell'Al 22 Suite & Spa Luxury Experience, situato nella splendida Polignano a Mare. È un piacere potervi raccontare un po' di più su di noi e su cosa rende la nostra struttura così speciale. Sin da quando ho aperto le porte del nostro angolo di paradiso, ho voluto creare un ambiente dove gli ospiti si sentivano non solo accolti, ma anche coccolati. La mia filosofia è semplice: ogni persona che varca la soglia di Al 22 deve sentirsi come a casa. Sono una persona solare, sempre disponibile e pronta ad ascoltare le esigenze dei nostri visitatori. Credo fermamente che la cortesia e un sorriso autentico possano fare la differenza nel soggiorno di ogni ospite.
              </p>
              <p
                className="text-muted-foreground mb-6 text-lg leading-relaxed animate-fade-in-up"
                style={{ animationDelay: "0.7s" }}
              >
                La bellezza di Polignano a Mare, con le sue acque cristalline e le stradine pittoresche, è già di per sé un invito ad esplorare ea vivere esperienze indimenticabili. Ma qui ad Al 22, vogliamo offrirvi qualcosa di ancora più speciale. Le nostre suite sono arredate con gusto e dotate di ogni comfort. Ogni dettaglio è pensato per rendere il vostro soggiorno unico. Che si tratti di una fuga romantica, di una celebrazione o di un semplice weekend di relax, abbiamo tutto ciò che serve per rendere il vostro soggiorno memorabile. Una delle gemme del nostro hotel è sicuramente la Spa. 
              </p>
              <p
                className="text-muted-foreground mb-8 text-lg leading-relaxed animate-fade-in-up"
                style={{ animationDelay: "0.9s" }}
              >
                Qui potrete lasciarvi avvolgere dal benessere e dalla tranquillità. Massaggi rilassanti, trattamenti rigeneranti e momenti di pura serenità vi aspettano. Io stesso adoro trascorrere del tempo nella nostra Spa; è un vero toccasana per chi, come me, ama il lavoro ma ha anche bisogno di prendersi cura di sé. Inoltre, mi piace interagire con i nostri ospiti, scoprire le loro storie e consigliare le loro migliori attrazioni e ristoranti della zona. Polignano a Mare è famosa per la sua cucina deliziosa ei suoi luoghi incantevoli. Non posso resistere alla tentazione di suggerirvi di provare un gelato artigianale.
              </p>
            </div>

            <div
              ref={statsRef}
              className={`grid grid-cols-2 md:grid-cols-4 gap-6 transition-all duration-1000 delay-600 ${statsVisible ? "animate-slide-in-up opacity-100" : "opacity-0 translate-y-[50px]"}`}
            >
              <div className="text-center group hover:scale-110 transition-transform duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:shadow-lg transition-shadow">
                  <Calendar className="w-6 h-6 text-primary group-hover:animate-pulse" />
                </div>
                <div className="font-bold text-2xl text-roman-gradient animate-counter">38+</div>
                <div className="text-sm text-muted-foreground">Anni di Esperienza</div>
              </div>
              <div
                className="text-center group hover:scale-110 transition-transform duration-300"
                style={{ animationDelay: "0.2s" }}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:shadow-lg transition-shadow">
                  <Users className="w-6 h-6 text-primary group-hover:animate-pulse" />
                </div>
                <div className="font-bold text-2xl text-roman-gradient animate-counter">5000+</div>
                <div className="text-sm text-muted-foreground">Ospiti Felici</div>
              </div>
              <div
                className="text-center group hover:scale-110 transition-transform duration-300"
                style={{ animationDelay: "0.4s" }}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:shadow-lg transition-shadow">
                  <Award className="w-6 h-6 text-primary group-hover:animate-pulse" />
                </div>
                <div className="font-bold text-2xl text-roman-gradient animate-counter">15+</div>
                <div className="text-sm text-muted-foreground">Premi Ricevuti</div>
              </div>
              <div
                className="text-center group hover:scale-110 transition-transform duration-300"
                style={{ animationDelay: "0.6s" }}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:shadow-lg transition-shadow">
                  <Heart className="w-6 h-6 text-primary group-hover:animate-pulse" />
                </div>
                <div className="font-bold text-2xl text-roman-gradient animate-counter">4.9/5</div>
                <div className="text-sm text-muted-foreground">Rating Medio</div>
              </div>
            </div>
          </div>

          <div
            ref={imagesRef}
            className={`relative transition-all duration-1000 delay-900 ${imagesVisible ? "animate-slide-in-right opacity-100" : "opacity-0 translate-x-[100px]"}`}
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div
                  className="card-invisible overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 animate-fade-in-up"
                  style={{ animationDelay: "1s" }}
                >
                  <Image
                    src="/images/bb-hero.jpg"
                    alt="Villa Bella Vista - Esterno"
                    width={300}
                    height={200}
                    className="w-full h-48 object-cover hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div
                  className="card-invisible overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 animate-fade-in-up"
                  style={{ animationDelay: "1.2s" }}
                >
                  <Image
                    src="/images/breakfast.jpg"
                    alt="Colazione tradizionale"
                    width={300}
                    height={150}
                    className="w-full h-32 object-cover hover:scale-110 transition-transform duration-500"
                  />
                </div>
              </div>
              <div className="space-y-4 pt-8">
                <div
                  className="card-invisible overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 animate-fade-in-up"
                  style={{ animationDelay: "1.4s" }}
                >
                  <Image
                    src="/images/room-1.jpg"
                    alt="Camera elegante"
                    width={300}
                    height={150}
                    className="w-full h-32 object-cover hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div
                  className="card-invisible overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 animate-fade-in-up"
                  style={{ animationDelay: "1.6s" }}
                >
                  <Image
                    src="/images/pool.jpg"
                    alt="Piscina panoramica"
                    width={300}
                    height={200}
                    className="w-full h-48 object-cover hover:scale-110 transition-transform duration-500"
                  />
                </div>
              </div>
            </div>

            <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full animate-float shadow-lg" />
            <div
              className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-br from-accent/30 to-secondary/20 rounded-full animate-float shadow-lg"
              style={{ animationDelay: "1s" }}
            />
            <div
              className="absolute top-1/2 -right-8 w-12 h-12 bg-gradient-to-br from-secondary/25 to-primary/15 rounded-full animate-float shadow-lg"
              style={{ animationDelay: "2s" }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
