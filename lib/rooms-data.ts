export const ROOMS = [
  {
    id: "1",
    name: "Suite Acies con Balcone",
    description: "Suite elegante con balcone privato e vista panoramica",
    images: [
      "/images/room-1.jpg", // camera principale con cementine decorative
      "/images/room-3.jpg", // camera ampia con zona pranzo e cementine
      "/camera/camera0.jpg", // camera con letto e cementine
      "/camera/camera2.jpg", // stessa camera altra angolazione
      "/camera/camera5.jpg", // zona living con divano verde oliva
      "/camera/camera11.jpg", // vista generale camera con letto e divano
      "/camera/camera12.jpg", // dettaglio letto con cuscini
      "/camera/camera6.jpg", // terrazza con vista mare
      "/camera/camera1.jpg", // piscina rooftop
      "/camera/camera4.jpg", // piscina al tramonto
    ],
    price: 180,
    originalPrice: 220,
    guests: 4,
    beds: 2,
    bathrooms: 2,
    size: 35,
    amenities: [
      "Vista luogo di interesse",
      "vista mare",
      "Balcone privato",
      "WiFi gratuito",
      "Minibar",
      "Aria condizionata",
      "TV satellitare",
    ],
    rating: 4.9,
    reviews: 56,
    featured: true,
  },
  {
    id: "2",
    name: "Suite Acquaroom con Idromassaggio",
    description: "Suite di lusso con vasca idromassaggio privata e arredi eleganti",
    images: [
      "/images/room-2.jpg", // camera con soffitto a volta in pietra
      "/camera/camera3.jpg", // bagno con vasca idromassaggio blu illuminata
      "/camera/camera7.jpg", // camera con appendiabiti dorato e TV
      "/camera/camera14.jpg", // divano grigio e zona pranzo
      "/camera/camera8.jpg", // bagno con doppio lavabo e vasca
      "/camera/camera9.jpg", // sauna con vetro
      "/camera/camera18.jpg", // sauna con persona
      "/camera/camera15.jpg", // bagno moderno con piastrelle verdi
      "/camera/camera16.jpg", // altro bagno moderno
      "/camera/camera10.jpg", // dettaglio amenities bagno
      "/images/spa.jpg", // idromassaggio blu
      "/camera/camera13.jpg", // piscina rooftop di giorno
    ],
    price: 150,
    originalPrice: 180,
    guests: 4,
    beds: 2,
    bathrooms: 1,
    size: 33,
    amenities: [
      "Aria condizionata",
      "TV satellitare",
      "Vasca idromassaggio",
      "Asciugacapelli",
      "WiFi gratuito",
      "Minibar",
    ],
    rating: 4.9,
    reviews: 56,
    featured: false,
  },
] as const

export type Room = (typeof ROOMS)[number]

