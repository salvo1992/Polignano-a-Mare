"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/components/language-provider"
import Image from "next/image"
import Link from "next/link"
import { MapPin, Ship, Train, Car, Bus, Compass } from "lucide-react"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"

// All translations inline for the 5 languages
const t_cosa: Record<string, Record<string, string>> = {
  it: {
    pageTitle: "Cosa Vedere",
    pageSubtitle: "Scopri le meraviglie di Polignano a Mare e dintorni",
    pageDescription: "Una guida alle bellezze che circondano la nostra struttura: dal fascino del centro storico ai borghi della Costa dei Trulli.",
    sectionPolignano: "Polignano a Mare",
    sectionTour: "Enjoy Your Tour",
    sectionCosta: "Costa dei Trulli",
    tourIntro: "Polignano a Mare e' una delle gemme della Puglia, e sebbene sia affascinante visitarla a piedi, il vero spettacolo si svela dal mare. Un tour in barca lungo le sue scogliere mozzafiato permette di scoprire angoli nascosti, grotte naturali e acque cristalline che non sono visibili dalla terra.",
    tourSeaView: "La vista dal mare e' senza dubbio la migliore per apprezzare la bellezza unica di Polignano: le case bianche sospese sulle rocce, il contrasto con l'azzurro del mare e il panorama che si estende a perdita d'occhio. Non perdere l'opportunita' di vivere la citta' da una prospettiva esclusiva.",
    standardTour: "Standard Tour: 1h30/2h",
    standardPrice: "40 EUR a persona",
    exclusiveTour: "Exclusive Tour",
    exclusivePrice: "A partire da 400 EUR",
    fullDay: "Full / Half Day",
    fullDayPrice: "Su richiesta - On demand",
    bookTour: "Prenota il Tour",
    centroStorico: "Centro Storico",
    centroStoricoDesc: "Il borgo antico di Polignano e' un susseguirsi di colorate stradine con tre favolose balconate con affaccio sul mare.",
    lamaMonachile: "Ponte Lama Monachile",
    lamaMonachileDesc: "Il ponte romano di Lama Monachile e' il posto da cui godere della vista piu' caratteristica: la bellissima spiaggia raggiungibile dalle scalinate.",
    lungomareModugno: "Lungomare Domenico Modugno",
    lungomareMogungoDesc: "Collega il ponte di Lama Monachile con Cala Paura passando per la piazza dove si trova la famosa statua di Domenico Modugno: semplicemente Meraviglioso.",
    lungomareColombo: "Ponte Borbonico",
    lungomareColumboDesc: "Lo storico ponte in pietra che attraversa Lama Monachile, costruito durante il periodo borbonico. I suoi archi scenografici incorniciano il mare e offrono una delle viste piu' iconiche di Polignano, ricoperto di edera e vegetazione mediterranea.",
    sanVito: "San Vito",
    sanVitoDesc: "San Vito e' la marina di Polignano a Mare. Tipica la sua abbazia che si affaccia sulla spiaggetta ricca di gozzi.",
    portAlga: "Port'Alga",
    portAlgaDesc: "Una caletta dai vivaci colori, dove poter leggere un buon libro alla brezza del mare. Sede del progetto culturale \"Prendi un libro, dai un libro\".",
    alberobello: "Alberobello",
    alberobelloDesc: "Raggiungibile in auto o taxi. Il suo centro storico dall'atmosfera fiabesca e' composto interamente da trulli. Patrimonio UNESCO.",
    alberobelloTransport: "Auto / Taxi",
    conversano: "Conversano",
    conversanoDesc: "Raggiungibile in auto o bus. Cittadina dal forte valore artistico, il suo centro storico e' protetto dalle mura del possente castello medievale.",
    conversanoTransport: "Auto / Bus",
    ostuni: "Ostuni",
    ostuniDesc: "Raggiungibile in auto o in treno. Nota come la \"Citta' Bianca\" per via della calce che colora le case, che dona una luce speciale.",
    ostuniTransport: "Auto / Treno",
    monopoli: "Monopoli",
    monopoliDesc: "Raggiungibile in treno, ha un notevole borgo antico che ospita il porto con il Castello Carlo V, antica roccaforte costruita a ridosso del mare.",
    monopoliTransport: "Treno",
    castellana: "Castellana Grotte",
    castellanaDesc: "Raggiungibile in auto o bus. Famosa per il suo complesso di grotte carsiche che si sviluppano a 70 metri di profondita'.",
    castellanaTransport: "Auto / Bus",
    cisternino: "Cisternino",
    cisterninoDesc: "Raggiungibile in auto o taxi. Graziosa cittadina il cui centro storico medievale e' ricco di opere d'arte barocche.",
    cisterninoTransport: "Auto / Taxi",
  },
  en: {
    pageTitle: "What to See",
    pageSubtitle: "Discover the wonders of Polignano a Mare and surroundings",
    pageDescription: "A guide to the beauties surrounding our property: from the charm of the old town to the villages of the Costa dei Trulli.",
    sectionPolignano: "Polignano a Mare",
    sectionTour: "Enjoy Your Tour",
    sectionCosta: "Costa dei Trulli",
    tourIntro: "Polignano a Mare is one of the gems of Puglia, and while visiting on foot is enchanting, the real beauty unfolds from the sea. A boat tour along its breathtaking cliffs allows you to discover hidden corners, natural caves, and crystal-clear waters that are not visible from the land.",
    tourSeaView: "The view from the sea is undoubtedly the best way to appreciate the unique beauty of Polignano: the white houses perched on the rocks, the contrast with the azure sea, and the panoramic views stretching as far as the eye can see. Don't miss the chance to experience the town from an exclusive perspective.",
    standardTour: "Standard Tour: 1h30/2h",
    standardPrice: "40 EUR per person",
    exclusiveTour: "Exclusive Tour",
    exclusivePrice: "Starting from 400 EUR",
    fullDay: "Full / Half Day",
    fullDayPrice: "On demand",
    bookTour: "Book the Tour",
    centroStorico: "Old Town",
    centroStoricoDesc: "Polignano's old town is a succession of colorful little streets with three fabulous balconies overlooking the sea.",
    lamaMonachile: "Lama Monachile Bridge",
    lamaMonachileDesc: "The Roman Lama Monachile bridge is the perfect place to enjoy the most characteristic view: the beautiful beach reachable from the steps.",
    lungomareModugno: "Lungomare Domenico Modugno",
    lungomareMogungoDesc: "It goes from the Lama Monachile bridge to Cala Paura beach, passing through the square where the famous Domenico Modugno statue is: simply Meraviglioso.",
    lungomareColombo: "Bourbon Bridge",
    lungomareColumboDesc: "The historic stone bridge crossing Lama Monachile, built during the Bourbon period. Its scenic arches frame the sea and offer one of the most iconic views of Polignano, covered in ivy and Mediterranean vegetation.",
    sanVito: "San Vito",
    sanVitoDesc: "San Vito is the marina of Polignano a Mare. Typical is its abbey overlooking the small beach full of fishing boats.",
    portAlga: "Port'Alga",
    portAlgaDesc: "A brightly colored cove, where you can read a good book in the sea breeze. Home of the cultural project \"Get a book, give a book\".",
    alberobello: "Alberobello",
    alberobelloDesc: "Reachable by car or taxi. Its old town with a fairytale atmosphere is made up entirely of trulli. UNESCO heritage.",
    alberobelloTransport: "Car / Taxi",
    conversano: "Conversano",
    conversanoDesc: "Reachable by car or bus. A town with strong artistic value, its old town is surrounded by the walls of the mighty medieval castle.",
    conversanoTransport: "Car / Bus",
    ostuni: "Ostuni",
    ostuniDesc: "Reachable by car or train. Known as the \"White City\" due to the lime that colors the houses, giving it a special light.",
    ostuniTransport: "Car / Train",
    monopoli: "Monopoli",
    monopoliDesc: "Reachable by train, it has a remarkable old town and the Carlo V Castle, an ancient stronghold built close to the sea.",
    monopoliTransport: "Train",
    castellana: "Castellana Grotte",
    castellanaDesc: "Reachable by car or bus. Famous for its karst cave complex that develops at a depth of 70 meters.",
    castellanaTransport: "Car / Bus",
    cisternino: "Cisternino",
    cisterninoDesc: "Reachable by car or taxi. Pretty town with a medieval old town full of Baroque works of art.",
    cisterninoTransport: "Car / Taxi",
  },
  fr: {
    pageTitle: "Que Voir",
    pageSubtitle: "Decouvrez les merveilles de Polignano a Mare et ses environs",
    pageDescription: "Un guide des beautes entourant notre etablissement : du charme de la vieille ville aux villages de la Costa dei Trulli.",
    sectionPolignano: "Polignano a Mare",
    sectionTour: "Profitez de Votre Tour",
    sectionCosta: "Costa dei Trulli",
    tourIntro: "Polignano a Mare est l'un des joyaux des Pouilles, et si la decouverte a pied est fascinante, la vraie beaute se revele depuis la mer. Une excursion en bateau le long de ses falaises spectaculaires permet de decouvrir des coins caches, des grottes naturelles et des eaux cristallines invisibles depuis la terre.",
    tourSeaView: "La vue depuis la mer est sans aucun doute la meilleure facon d'apprecier la beaute unique de Polignano : les maisons blanches suspendues aux rochers, le contraste avec l'azur de la mer et le panorama qui s'etend a perte de vue. Ne manquez pas l'opportunite de vivre la ville d'une perspective exclusive.",
    standardTour: "Tour Standard : 1h30/2h",
    standardPrice: "40 EUR par personne",
    exclusiveTour: "Tour Exclusif",
    exclusivePrice: "A partir de 400 EUR",
    fullDay: "Journee / Demi-journee",
    fullDayPrice: "Sur demande",
    bookTour: "Reservez le Tour",
    centroStorico: "Centre Historique",
    centroStoricoDesc: "La vieille ville de Polignano est une succession de petites rues colorees avec trois fabuleux balcons donnant sur la mer.",
    lamaMonachile: "Pont Lama Monachile",
    lamaMonachileDesc: "Le pont romain de Lama Monachile est l'endroit ideal pour profiter de la vue la plus caracteristique : la magnifique plage accessible par les escaliers.",
    lungomareModugno: "Lungomare Domenico Modugno",
    lungomareMogungoDesc: "Il relie le pont de Lama Monachile a la plage de Cala Paura, en passant par la place ou se trouve la celebre statue de Domenico Modugno : simplement Meraviglioso.",
    lungomareColombo: "Pont Bourbon",
    lungomareColumboDesc: "Le pont historique en pierre traversant Lama Monachile, construit a l'epoque des Bourbons. Ses arches sceniques encadrent la mer et offrent l'une des vues les plus emblematiques de Polignano, couvert de lierre et de vegetation mediterraneenne.",
    sanVito: "San Vito",
    sanVitoDesc: "San Vito est le port de Polignano a Mare. Typique pour son abbaye qui surplombe la petite plage pleine de barques de pecheurs.",
    portAlga: "Port'Alga",
    portAlgaDesc: "Une calanque aux couleurs vives, ou l'on peut lire un bon livre a la brise marine. Lieu du projet culturel \"Prends un livre, donne un livre\".",
    alberobello: "Alberobello",
    alberobelloDesc: "Accessible en voiture ou taxi. Son centre historique feerique est compose entierement de trulli. Patrimoine UNESCO.",
    alberobelloTransport: "Voiture / Taxi",
    conversano: "Conversano",
    conversanoDesc: "Accessible en voiture ou bus. Ville a forte valeur artistique, son centre historique est protege par les murs du puissant chateau medieval.",
    conversanoTransport: "Voiture / Bus",
    ostuni: "Ostuni",
    ostuniDesc: "Accessible en voiture ou train. Connue comme la \"Ville Blanche\" grace a la chaux qui colore les maisons, lui donnant une lumiere speciale.",
    ostuniTransport: "Voiture / Train",
    monopoli: "Monopoli",
    monopoliDesc: "Accessible en train, elle possede une remarquable vieille ville avec le Chateau Charles V, ancienne forteresse construite au bord de la mer.",
    monopoliTransport: "Train",
    castellana: "Castellana Grotte",
    castellanaDesc: "Accessible en voiture ou bus. Celebre pour son complexe de grottes karstiques qui se developpent a 70 metres de profondeur.",
    castellanaTransport: "Voiture / Bus",
    cisternino: "Cisternino",
    cisterninoDesc: "Accessible en voiture ou taxi. Charmante ville dont le centre historique medieval regorge d'oeuvres d'art baroques.",
    cisterninoTransport: "Voiture / Taxi",
  },
  es: {
    pageTitle: "Que Ver",
    pageSubtitle: "Descubre las maravillas de Polignano a Mare y alrededores",
    pageDescription: "Una guia de las bellezas que rodean nuestra estructura: desde el encanto del casco antiguo hasta los pueblos de la Costa dei Trulli.",
    sectionPolignano: "Polignano a Mare",
    sectionTour: "Disfruta Tu Tour",
    sectionCosta: "Costa dei Trulli",
    tourIntro: "Polignano a Mare es una de las joyas de Puglia, y aunque es fascinante visitarla a pie, la verdadera belleza se revela desde el mar. Un tour en barco a lo largo de sus impresionantes acantilados permite descubrir rincones ocultos, cuevas naturales y aguas cristalinas que no son visibles desde tierra.",
    tourSeaView: "La vista desde el mar es sin duda la mejor manera de apreciar la belleza unica de Polignano: las casas blancas suspendidas sobre las rocas, el contraste con el azul del mar y el panorama que se extiende hasta donde alcanza la vista. No pierdas la oportunidad de vivir la ciudad desde una perspectiva exclusiva.",
    standardTour: "Tour Estandar: 1h30/2h",
    standardPrice: "40 EUR por persona",
    exclusiveTour: "Tour Exclusivo",
    exclusivePrice: "Desde 400 EUR",
    fullDay: "Dia Completo / Medio Dia",
    fullDayPrice: "Bajo demanda",
    bookTour: "Reserva el Tour",
    centroStorico: "Casco Antiguo",
    centroStoricoDesc: "El casco antiguo de Polignano es una sucesion de calles coloridas con tres fabulosos balcones con vistas al mar.",
    lamaMonachile: "Puente Lama Monachile",
    lamaMonachileDesc: "El puente romano de Lama Monachile es el lugar perfecto para disfrutar de la vista mas caracteristica: la hermosa playa accesible por las escaleras.",
    lungomareModugno: "Lungomare Domenico Modugno",
    lungomareMogungoDesc: "Conecta el puente de Lama Monachile con la playa de Cala Paura pasando por la plaza donde se encuentra la famosa estatua de Domenico Modugno: simplemente Meraviglioso.",
    lungomareColombo: "Puente Borbonico",
    lungomareColumboDesc: "El historico puente de piedra que cruza Lama Monachile, construido durante el periodo borbonico. Sus arcos escenico enmarcan el mar y ofrecen una de las vistas mas iconicas de Polignano, cubierto de hiedra y vegetacion mediterranea.",
    sanVito: "San Vito",
    sanVitoDesc: "San Vito es el puerto de Polignano a Mare. Tipica su abadia que da a la playita llena de barcas de pesca.",
    portAlga: "Port'Alga",
    portAlgaDesc: "Una caleta de colores vivos, donde se puede leer un buen libro con la brisa del mar. Sede del proyecto cultural \"Toma un libro, da un libro\".",
    alberobello: "Alberobello",
    alberobelloDesc: "Accesible en coche o taxi. Su casco antiguo con atmosfera de cuento esta compuesto enteramente por trulli. Patrimonio UNESCO.",
    alberobelloTransport: "Coche / Taxi",
    conversano: "Conversano",
    conversanoDesc: "Accesible en coche o bus. Ciudad de gran valor artistico, su casco antiguo esta protegido por los muros del poderoso castillo medieval.",
    conversanoTransport: "Coche / Bus",
    ostuni: "Ostuni",
    ostuniDesc: "Accesible en coche o tren. Conocida como la \"Ciudad Blanca\" por la cal que colorea las casas, dandole una luz especial.",
    ostuniTransport: "Coche / Tren",
    monopoli: "Monopoli",
    monopoliDesc: "Accesible en tren, tiene un notable casco antiguo con el Castillo Carlo V, antigua fortaleza construida junto al mar.",
    monopoliTransport: "Tren",
    castellana: "Castellana Grotte",
    castellanaDesc: "Accesible en coche o bus. Famosa por su complejo de cuevas carsticas que se desarrollan a 70 metros de profundidad.",
    castellanaTransport: "Coche / Bus",
    cisternino: "Cisternino",
    cisterninoDesc: "Accesible en coche o taxi. Bonita ciudad cuyo centro historico medieval es rico en obras de arte barrocas.",
    cisterninoTransport: "Coche / Taxi",
  },
  de: {
    pageTitle: "Sehenswurdigkeiten",
    pageSubtitle: "Entdecken Sie die Wunder von Polignano a Mare und Umgebung",
    pageDescription: "Ein Fuhrer zu den Schonheiten rund um unsere Unterkunft: vom Charme der Altstadt bis zu den Dorfern der Costa dei Trulli.",
    sectionPolignano: "Polignano a Mare",
    sectionTour: "Geniessen Sie Ihre Tour",
    sectionCosta: "Costa dei Trulli",
    tourIntro: "Polignano a Mare ist eines der Juwelen Apuliens, und obwohl ein Besuch zu Fuss faszinierend ist, entfaltet sich die wahre Schonheit vom Meer aus. Eine Bootstour entlang der atemberaubenden Klippen ermoglicht es, verborgene Ecken, naturliche Grotten und kristallklares Wasser zu entdecken, die vom Land aus nicht sichtbar sind.",
    tourSeaView: "Der Blick vom Meer ist zweifellos die beste Art, die einzigartige Schonheit von Polignano zu schutzen: die weissen Hauser auf den Felsen, der Kontrast mit dem azurblauen Meer und das Panorama, das sich bis zum Horizont erstreckt. Verpassen Sie nicht die Gelegenheit, die Stadt aus einer exklusiven Perspektive zu erleben.",
    standardTour: "Standard Tour: 1h30/2h",
    standardPrice: "40 EUR pro Person",
    exclusiveTour: "Exclusive Tour",
    exclusivePrice: "Ab 400 EUR",
    fullDay: "Ganzer / Halber Tag",
    fullDayPrice: "Auf Anfrage",
    bookTour: "Tour Buchen",
    centroStorico: "Altstadt",
    centroStoricoDesc: "Die Altstadt von Polignano ist eine Abfolge bunter kleiner Strassen mit drei fabelhaften Balkonen mit Blick auf das Meer.",
    lamaMonachile: "Lama Monachile Brucke",
    lamaMonachileDesc: "Die romische Lama Monachile Brucke ist der perfekte Ort, um die charakteristischste Aussicht zu geniessen: den wunderschonen Strand, erreichbar uber die Stufen.",
    lungomareModugno: "Lungomare Domenico Modugno",
    lungomareMogungoDesc: "Er verbindet die Lama Monachile Brucke mit dem Strand Cala Paura und fuhrt uber den Platz mit der beruhmten Statue von Domenico Modugno: einfach Meraviglioso.",
    lungomareColombo: "Bourbonen-Brucke",
    lungomareColumboDesc: "Die historische Steinbrucke uber Lama Monachile, erbaut wahrend der Bourbonen-Zeit. Ihre malerischen Bogen rahmen das Meer ein und bieten einen der ikonischsten Ausblicke auf Polignano, bedeckt mit Efeu und mediterraner Vegetation.",
    sanVito: "San Vito",
    sanVitoDesc: "San Vito ist der Hafen von Polignano a Mare. Typisch ist seine Abtei, die auf den kleinen Strand voller Fischerboote blickt.",
    portAlga: "Port'Alga",
    portAlgaDesc: "Eine farbenfroh Bucht, wo man ein gutes Buch in der Meeresbrise lesen kann. Heimat des Kulturprojekts \"Nimm ein Buch, gib ein Buch\".",
    alberobello: "Alberobello",
    alberobelloDesc: "Erreichbar mit Auto oder Taxi. Die marchenhafte Altstadt besteht vollstandig aus Trulli. UNESCO-Welterbe.",
    alberobelloTransport: "Auto / Taxi",
    conversano: "Conversano",
    conversanoDesc: "Erreichbar mit Auto oder Bus. Eine Stadt von grossem kunstlerischen Wert, deren Altstadt von den Mauern der machtigen mittelalterlichen Burg geschutzt wird.",
    conversanoTransport: "Auto / Bus",
    ostuni: "Ostuni",
    ostuniDesc: "Erreichbar mit Auto oder Zug. Bekannt als die \"Weisse Stadt\" dank des Kalks, der die Hauser farbt und ihnen ein besonderes Licht verleiht.",
    ostuniTransport: "Auto / Zug",
    monopoli: "Monopoli",
    monopoliDesc: "Erreichbar mit dem Zug, mit einer bemerkenswerten Altstadt und der Burg Karl V, einer antiken Festung am Meer.",
    monopoliTransport: "Zug",
    castellana: "Castellana Grotte",
    castellanaDesc: "Erreichbar mit Auto oder Bus. Beruhmt fur ihren Komplex aus Karstgrotten, die sich in 70 Metern Tiefe entwickeln.",
    castellanaTransport: "Auto / Bus",
    cisternino: "Cisternino",
    cisterninoDesc: "Erreichbar mit Auto oder Taxi. Hubsche Stadt, deren mittelalterliche Altstadt reich an barocken Kunstwerken ist.",
    cisterninoTransport: "Auto / Taxi",
  },
}

const polignanoPlaces = [
  { key: "centroStorico", nameKey: "centroStorico", descKey: "centroStoricoDesc", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Centro%20storico-OiMbh6RdWNwK2MR7rXaT6bOc3LoGza.jpeg" },
  { key: "lamaMonachile", nameKey: "lamaMonachile", descKey: "lamaMonachileDesc", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/lama%20%20monachile-ESjaou2dCq4rLVs8KfX5bgupdcHXnG.jpeg" },
  { key: "lungomareModugno", nameKey: "lungomareModugno", descKey: "lungomareMogungoDesc", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Lungomare%20Cristoforo%20colombo%20monumento%20Domenico%20Modugno-D8m13mfNR9sUZIk7Rt89FxXcy4It1f.jpeg" },
  { key: "lungomareColombo", nameKey: "lungomareColombo", descKey: "lungomareColumboDesc", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Ponte%20borbonico-ItwSAB9zDgDiC22zHPL81IItpO8ZSM.jpeg" },
  { key: "sanVito", nameKey: "sanVito", descKey: "sanVitoDesc", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/sanvito-N3rWathM2G6mMNZp2a7nczgkBOikJp.jpeg" },
  { key: "portAlga", nameKey: "portAlga", descKey: "portAlgaDesc", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Portalga%20Polignano-N6cPXg8Go9FhDMf84wG2XMmZrVz3sX.jpeg" },
]

const costaDeiTrulli = [
  { key: "alberobello", nameKey: "alberobello", descKey: "alberobelloDesc", transportKey: "alberobelloTransport", image: "/images/cosa-vedere/alberobello.jpg", icon: Car },
  { key: "conversano", nameKey: "conversano", descKey: "conversanoDesc", transportKey: "conversanoTransport", image: "/images/cosa-vedere/conversano.jpg", icon: Bus },
  { key: "ostuni", nameKey: "ostuni", descKey: "ostuniDesc", transportKey: "ostuniTransport", image: "/images/cosa-vedere/ostuni.jpg", icon: Train },
  { key: "monopoli", nameKey: "monopoli", descKey: "monopoliDesc", transportKey: "monopoliTransport", image: "/images/cosa-vedere/monopoli.jpg", icon: Train },
  { key: "castellana", nameKey: "castellana", descKey: "castellanaDesc", transportKey: "castellanaTransport", image: "/images/cosa-vedere/castellana-grotte.jpg", icon: Bus },
  { key: "cisternino", nameKey: "cisternino", descKey: "cisterninoDesc", transportKey: "cisterninoTransport", image: "/images/cosa-vedere/cisternino.jpg", icon: Car },
]

function PlaceCard({ name, description, image, reverse = false }: { name: string; description: string; image: string; reverse?: boolean }) {
  const { ref, isVisible } = useScrollAnimation()
  return (
    <div
      ref={ref}
      className={`flex flex-col ${reverse ? "md:flex-row-reverse" : "md:flex-row"} gap-6 items-center transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
    >
      <div className="w-full md:w-1/2 relative aspect-[4/3] rounded-2xl overflow-hidden shadow-lg group">
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
      <div className="w-full md:w-1/2 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
          <h3 className="font-cinzel text-2xl md:text-3xl font-bold text-foreground">{name}</h3>
        </div>
        <p className="text-muted-foreground leading-relaxed text-base md:text-lg">{description}</p>
      </div>
    </div>
  )
}

function TrulliCard({ name, description, transport, image, Icon }: { name: string; description: string; transport: string; image: string; Icon: React.ElementType }) {
  const { ref, isVisible } = useScrollAnimation()
  return (
    <div
      ref={ref}
      className={`group bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>
      <div className="p-5">
        <h3 className="font-cinzel text-xl font-bold text-foreground mb-2">{name}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed mb-3">{description}</p>
        <div className="flex items-center gap-2 text-primary text-sm font-medium">
          <Icon className="w-4 h-4" />
          <span>{transport}</span>
        </div>
      </div>
    </div>
  )
}

export default function CosaVederePage() {
  const { language } = useLanguage()
  const texts = t_cosa[language] || t_cosa.it
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation()

  return (
    <main className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section
        ref={heroRef}
        className="pt-24 pb-16 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/10 relative overflow-hidden"
      >
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-float" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className={`text-center max-w-5xl mx-auto transition-all duration-1000 ${heroVisible ? "animate-fade-in-up" : "opacity-0 translate-y-10"}`}>
            <div className="flex items-center justify-center gap-3 mb-6">
              <Compass className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <h1 className="font-cinzel text-5xl md:text-7xl font-bold text-roman-gradient mb-8 animate-shimmer">
              {texts.pageTitle}
            </h1>
            <p className="text-2xl md:text-3xl text-muted-foreground text-balance mb-8 font-light">
              {texts.pageSubtitle}
            </p>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto text-balance leading-relaxed">
              {texts.pageDescription}
            </p>
          </div>
        </div>
      </section>

      {/* Section 1: Polignano a Mare */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="font-cinzel text-3xl md:text-5xl font-bold text-center text-roman-gradient mb-16">
            {texts.sectionPolignano}
          </h2>
          <div className="max-w-5xl mx-auto flex flex-col gap-16">
            {polignanoPlaces.map((place, i) => (
              <PlaceCard
                key={place.key}
                name={texts[place.nameKey]}
                description={texts[place.descKey]}
                image={place.image}
                reverse={i % 2 !== 0}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Section 2: Enjoy Your Tour */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container mx-auto px-4">
          <h2 className="font-cinzel text-3xl md:text-5xl font-bold text-center text-roman-gradient mb-12">
            {texts.sectionTour}
          </h2>

          <div className="max-w-5xl mx-auto">
            {/* Tour hero image */}
            <div className="relative w-full aspect-[21/9] rounded-2xl overflow-hidden shadow-xl mb-12">
              <Image
                src="/images/cosa-vedere/boat-tour.jpg"
                alt="Boat Tour Polignano a Mare"
                fill
                className="object-cover"
                sizes="100vw"
              />
            </div>

            {/* Tour text */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <p className="text-muted-foreground leading-relaxed text-base md:text-lg">
                {texts.tourIntro}
              </p>
              <p className="text-muted-foreground leading-relaxed text-base md:text-lg">
                {texts.tourSeaView}
              </p>
            </div>

            {/* Pricing cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card rounded-2xl p-6 shadow-md text-center border border-border/50">
                <Ship className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-cinzel font-bold text-lg mb-2">{texts.standardTour}</h3>
                <p className="text-primary font-bold text-xl">{texts.standardPrice}</p>
              </div>
              <div className="bg-card rounded-2xl p-6 shadow-md text-center border-2 border-primary/30 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                  EXCLUSIVE
                </div>
                <Ship className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-cinzel font-bold text-lg mb-2">{texts.exclusiveTour}</h3>
                <p className="text-primary font-bold text-xl">{texts.exclusivePrice}</p>
              </div>
              <div className="bg-card rounded-2xl p-6 shadow-md text-center border border-border/50">
                <Ship className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-cinzel font-bold text-lg mb-2">{texts.fullDay}</h3>
                <p className="text-primary font-bold text-xl">{texts.fullDayPrice}</p>
              </div>
            </div>

            {/* Book CTA */}
            <div className="text-center mt-10">
              <Link
                href="https://wa.me/393757017689?text=Ciao!%20Vorrei%20prenotare%20un%20tour%20in%20barca"
                target="_blank"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground font-cinzel font-bold px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Ship className="w-5 h-5" />
                {texts.bookTour}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Costa dei Trulli */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="font-cinzel text-3xl md:text-5xl font-bold text-center text-roman-gradient mb-6">
            {texts.sectionCosta}
          </h2>
          <p className="text-center text-muted-foreground text-lg mb-16 max-w-2xl mx-auto">
            {"Enjoy your travel"}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {costaDeiTrulli.map((place) => (
              <TrulliCard
                key={place.key}
                name={texts[place.nameKey]}
                description={texts[place.descKey]}
                transport={texts[place.transportKey]}
                image={place.image}
                Icon={place.icon}
              />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
