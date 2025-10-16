"use client"

import Image from "next/image"
import { Heart, Award, Users, Calendar } from "lucide-react"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import { useLanguage } from "@/components/language-provider"

export function StorySection() {
  const { ref: titleRef, isVisible: titleVisible } = useScrollAnimation()
  const { ref: contentRef, isVisible: contentVisible } = useScrollAnimation()
  const { ref: statsRef, isVisible: statsVisible } = useScrollAnimation()
  const { ref: imagesRef, isVisible: imagesVisible } = useScrollAnimation()
  const { t, language } = useLanguage()

  const storyContent = {
    it: {
      paragraph1:
        "Benvenuti ad Al 22 Suite & Spa Luxury Experience Ciao a tutti! Mi chiamo Angelo e ho l'onore di essere il gestore dell'Al 22 Suite & Spa Luxury Experience, situato nella splendida Polignano a Mare. È un piacere potervi raccontare un po' di più su di noi e su cosa rende la nostra struttura così speciale. Sin da quando ho aperto le porte del nostro angolo di paradiso, ho voluto creare un ambiente dove gli ospiti si sentivano non solo accolti, ma anche coccolati. La mia filosofia è semplice: ogni persona che varca la soglia di Al 22 deve sentirsi come a casa. Sono una persona solare, sempre disponibile e pronta ad ascoltare le esigenze dei nostri visitatori. Credo fermamente che la cortesia e un sorriso autentico possano fare la differenza nel soggiorno di ogni ospite.",
      paragraph2:
        "La bellezza di Polignano a Mare, con le sue acque cristalline e le stradine pittoresche, è già di per sé un invito ad esplorare ea vivere esperienze indimenticabili. Ma qui ad Al 22, vogliamo offrirvi qualcosa di ancora più speciale. Le nostre suite sono arredate con gusto e dotate di ogni comfort. Ogni dettaglio è pensato per rendere il vostro soggiorno unico. Che si tratti di una fuga romantica, di una celebrazione o di un semplice weekend di relax, abbiamo tutto ciò che serve per rendere il vostro soggiorno memorabile. Una delle gemme del nostro hotel è sicuramente la Spa.",
      paragraph3:
        "Qui potrete lasciarvi avvolgere dal benessere e dalla tranquillità. Massaggi rilassanti, trattamenti rigeneranti e momenti di pura serenità vi aspettano. Io stesso adoro trascorrere del tempo nella nostra Spa; è un vero toccasana per chi, come me, ama il lavoro ma ha anche bisogno di prendersi cura di sé. Inoltre, mi piace interagire con i nostri ospiti, scoprire le loro storie e consigliare le loro migliori attrazioni e ristoranti della zona. Polignano a Mare è famosa per la sua cucina deliziosa ei suoi luoghi incantevoli. Non posso resistere alla tentazione di suggerirvi di provare un gelato artigianale.",
      yearsExperience: "Anni di Esperienza",
      happyGuests: "Ospiti Felici",
      awardsReceived: "Premi Ricevuti",
      averageRating: "Rating Medio",
    },
    en: {
      paragraph1:
        "Welcome to Al 22 Suite & Spa Luxury Experience. Hello everyone! My name is Angelo and I have the honor of being the manager of Al 22 Suite & Spa Luxury Experience, located in the beautiful Polignano a Mare. It's a pleasure to tell you a little more about us and what makes our property so special. Since I opened the doors of our corner of paradise, I wanted to create an environment where guests felt not only welcomed, but also pampered. My philosophy is simple: every person who crosses the threshold of Al 22 must feel at home. I am a cheerful person, always available and ready to listen to the needs of our visitors. I firmly believe that courtesy and a genuine smile can make a difference in every guest's stay.",
      paragraph2:
        "The beauty of Polignano a Mare, with its crystal-clear waters and picturesque streets, is already an invitation to explore and live unforgettable experiences. But here at Al 22, we want to offer you something even more special. Our suites are tastefully furnished and equipped with every comfort. Every detail is designed to make your stay unique. Whether it's a romantic getaway, a celebration, or a simple relaxing weekend, we have everything you need to make your stay memorable. One of the gems of our hotel is definitely the Spa.",
      paragraph3:
        "Here you can let yourself be enveloped by wellness and tranquility. Relaxing massages, regenerating treatments and moments of pure serenity await you. I myself love spending time in our Spa; it's a real cure for those who, like me, love work but also need to take care of themselves. Furthermore, I like to interact with our guests, discover their stories and recommend the best attractions and restaurants in the area. Polignano a Mare is famous for its delicious cuisine and enchanting places. I can't resist the temptation to suggest you try an artisan gelato.",
      yearsExperience: "Years of Experience",
      happyGuests: "Happy Guests",
      awardsReceived: "Awards Received",
      averageRating: "Average Rating",
    },
    fr: {
      paragraph1:
        "Bienvenue à Al 22 Suite & Spa Luxury Experience. Bonjour à tous! Je m'appelle Angelo et j'ai l'honneur d'être le gérant d'Al 22 Suite & Spa Luxury Experience, situé dans la magnifique Polignano a Mare. C'est un plaisir de vous en dire un peu plus sur nous et ce qui rend notre établissement si spécial. Depuis que j'ai ouvert les portes de notre coin de paradis, j'ai voulu créer un environnement où les clients se sentent non seulement accueillis, mais aussi choyés. Ma philosophie est simple: chaque personne qui franchit le seuil d'Al 22 doit se sentir comme chez elle. Je suis une personne joyeuse, toujours disponible et prête à écouter les besoins de nos visiteurs. Je crois fermement que la courtoisie et un sourire authentique peuvent faire la différence dans le séjour de chaque client.",
      paragraph2:
        "La beauté de Polignano a Mare, avec ses eaux cristallines et ses rues pittoresques, est déjà une invitation à explorer et à vivre des expériences inoubliables. Mais ici à Al 22, nous voulons vous offrir quelque chose d'encore plus spécial. Nos suites sont meublées avec goût et équipées de tout le confort. Chaque détail est conçu pour rendre votre séjour unique. Qu'il s'agisse d'une escapade romantique, d'une célébration ou d'un simple week-end de détente, nous avons tout ce qu'il faut pour rendre votre séjour mémorable. L'un des joyaux de notre hôtel est certainement le Spa.",
      paragraph3:
        "Ici, vous pouvez vous laisser envelopper par le bien-être et la tranquillité. Massages relaxants, soins régénérants et moments de pure sérénité vous attendent. J'adore moi-même passer du temps dans notre Spa; c'est un vrai remède pour ceux qui, comme moi, aiment le travail mais ont aussi besoin de prendre soin d'eux. De plus, j'aime interagir avec nos clients, découvrir leurs histoires et recommander les meilleures attractions et restaurants de la région. Polignano a Mare est célèbre pour sa cuisine délicieuse et ses lieux enchanteurs. Je ne peux résister à la tentation de vous suggérer d'essayer une glace artisanale.",
      yearsExperience: "Années d'Expérience",
      happyGuests: "Clients Satisfaits",
      awardsReceived: "Prix Reçus",
      averageRating: "Note Moyenne",
    },
    es: {
      paragraph1:
        "Bienvenido a Al 22 Suite & Spa Luxury Experience. ¡Hola a todos! Mi nombre es Angelo y tengo el honor de ser el gerente de Al 22 Suite & Spa Luxury Experience, ubicado en la hermosa Polignano a Mare. Es un placer contarles un poco más sobre nosotros y lo que hace que nuestra propiedad sea tan especial. Desde que abrí las puertas de nuestro rincón del paraíso, quise crear un ambiente donde los huéspedes se sintieran no solo bienvenidos, sino también mimados. Mi filosofía es simple: cada persona que cruza el umbral de Al 22 debe sentirse como en casa. Soy una persona alegre, siempre disponible y lista para escuchar las necesidades de nuestros visitantes. Creo firmemente que la cortesía y una sonrisa genuina pueden marcar la diferencia en la estancia de cada huésped.",
      paragraph2:
        "La belleza de Polignano a Mare, con sus aguas cristalinas y calles pintorescas, ya es una invitación a explorar y vivir experiencias inolvidables. Pero aquí en Al 22, queremos ofrecerle algo aún más especial. Nuestras suites están amuebladas con gusto y equipadas con todas las comodidades. Cada detalle está diseñado para hacer que su estancia sea única. Ya sea una escapada romántica, una celebración o un simple fin de semana de détente, tenemos todo lo que necesita para hacer que su estancia sea memorable. Una de las joyas de nuestro hotel es definitivamente el Spa.",
      paragraph3:
        "Aquí puede dejarse envolver por el bienestar y la tranquilidad. Masajes relajantes, tratamientos regeneradores y momentos de pura serenidad le esperan. A mí mismo me encanta pasar tiempo en nuestro Spa; es una verdadera cura para aquellos que, como yo, aman el trabajo pero también necesitan cuidarse. Además, me gusta interactuar con nuestros huéspedes, descubrir sus historias y recomendar las mejores atracciones y restaurantes de la zona. Polignano a Mare es famosa por su deliciosa cocina y sus lugares encantadores. No puedo resistir la tentación de sugerirle que pruebe un helado artesanal.",
      yearsExperience: "Años de Experiencia",
      happyGuests: "Huéspedes Felices",
      awardsReceived: "Premios Recibidos",
      averageRating: "Calificación Promedio",
    },
    de: {
      paragraph1:
        "Willkommen im Al 22 Suite & Spa Luxury Experience. Hallo zusammen! Mein Name ist Angelo und ich habe die Ehre, der Manager des Al 22 Suite & Spa Luxury Experience zu sein, das sich im wunderschönen Polignano a Mare befindet. Es ist mir eine Freude, Ihnen ein wenig mehr über uns und darüber zu erzählen, was unsere Unterkunft so besonders macht. Seit ich die Türen unserer Ecke des Paradieses geöffnet habe, wollte ich eine Umgebung schaffen, in der sich die Gäste nicht nur willkommen, sondern auch verwöhnt fühlen. Meine Philosophie ist einfach: Jede Person, die die Schwelle von Al 22 überschreitet, muss sich wie zu Hause fühlen. Ich bin eine fröhliche Person, immer verfügbar und bereit, auf die Bedürfnisse unserer Besucher zu hören. Ich glaube fest daran, dass Höflichkeit und ein echtes Lächeln einen Unterschied im Aufenthalt jedes Gastes machen können.",
      paragraph2:
        "Die Schönheit von Polignano a Mare mit seinem kristallklaren Wasser und den malerischen Straßen ist bereits eine Einladung, unvergessliche Erlebnisse zu erkunden und zu erleben. Aber hier im Al 22 möchten wir Ihnen etwas noch Besonderes bieten. Unsere Suiten sind geschmackvoll eingerichtet und mit allem Komfort ausgestattet. Jedes Detail ist darauf ausgelegt, Ihren Aufenthalt einzigartig zu machen. Ob romantischer Kurzurlaub, Feier oder einfach ein entspanntes Wochenende - wir haben alles, was Sie brauchen, um Ihren Aufenthalt unvergesslich zu machen. Eines der Juwelen unseres Hotels ist definitiv das Spa.",
      paragraph3:
        "Hier können Sie sich von Wellness und Ruhe umhüllen lassen. Entspannende Massagen, regenerierende Behandlungen und Momente purer Gelassenheit erwarten Sie. Ich selbst liebe es, Zeit in unserem Spa zu verbringen; es ist eine echte Wohltat für diejenigen, die wie ich die Arbeit lieben, aber auch auf sich selbst aufpassen müssen. Außerdem interagiere ich gerne mit unseren Gästen, entdecke ihre Geschichten und empfehle die besten Attraktionen und Restaurants in der Gegend. Polignano a Mare ist berühmt für seine köstliche Küche und bezaubernden Orte. Ich kann der Versuchung nicht widerstehen, Ihnen zu empfehlen, ein handwerkliches Gelato zu probieren.",
      yearsExperience: "Jahre Erfahrung",
      happyGuests: "Glückliche Gäste",
      awardsReceived: "Erhaltene Auszeichnungen",
      averageRating: "Durchschnittliche Bewertung",
    },
  }

  const content = storyContent[language as keyof typeof storyContent] || storyContent.it

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
                {t("storyTitle")}
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
                {content.paragraph1}
              </p>
              <p
                className="text-muted-foreground mb-6 text-lg leading-relaxed animate-fade-in-up"
                style={{ animationDelay: "0.7s" }}
              >
                {content.paragraph2}
              </p>
              <p
                className="text-muted-foreground mb-8 text-lg leading-relaxed animate-fade-in-up"
                style={{ animationDelay: "0.9s" }}
              >
                {content.paragraph3}
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
                <div className="text-sm text-muted-foreground">{content.yearsExperience}</div>
              </div>
              <div
                className="text-center group hover:scale-110 transition-transform duration-300"
                style={{ animationDelay: "0.2s" }}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:shadow-lg transition-shadow">
                  <Users className="w-6 h-6 text-primary group-hover:animate-pulse" />
                </div>
                <div className="font-bold text-2xl text-roman-gradient animate-counter">5000+</div>
                <div className="text-sm text-muted-foreground">{content.happyGuests}</div>
              </div>
              <div
                className="text-center group hover:scale-110 transition-transform duration-300"
                style={{ animationDelay: "0.4s" }}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:shadow-lg transition-shadow">
                  <Award className="w-6 h-6 text-primary group-hover:animate-pulse" />
                </div>
                <div className="font-bold text-2xl text-roman-gradient animate-counter">15+</div>
                <div className="text-sm text-muted-foreground">{content.awardsReceived}</div>
              </div>
              <div
                className="text-center group hover:scale-110 transition-transform duration-300"
                style={{ animationDelay: "0.6s" }}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:shadow-lg transition-shadow">
                  <Heart className="w-6 h-6 text-primary group-hover:animate-pulse" />
                </div>
                <div className="font-bold text-2xl text-roman-gradient animate-counter">4.9/5</div>
                <div className="text-sm text-muted-foreground">{content.averageRating}</div>
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
                    src="/images/spa1.jpg"
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

