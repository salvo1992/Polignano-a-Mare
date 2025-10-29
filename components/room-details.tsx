"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Users, Bed, Bath, Mountain, Star, Wifi, Car, Coffee, Tv, Wind, Shield, MapPin, Clock } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

// Sample room data - in a real app this would come from props or API
const roomData = {
  name: "le nostre suite nel dettaglio con jacuzzi privata e sauna offrono questo e molto altro",
  description:
    "Una magnifica suite con jacuzzi privata e sauna. Questa elegante camera matrimoniale offre un'esperienza di soggiorno indimenticabile con il suo design raffinato e i comfort moderni. Il terrazzo privato permette di godere di tramonti spettacolari e della tranquillità di Polignano a Mare.",
  longDescription:
    "Immersa nella bellezza di Polignano a Mare, questa suite rappresenta il perfetto equilibrio tra eleganza classica e comfort contemporaneo. Gli arredi sono stati selezionati con cura per riflettere lo stile tradizionale della regione, mentre i servizi moderni garantiscono un soggiorno confortevole e rilassante.",
  guests: 4,
  beds: 2,
  bathrooms: 1,
  size: 33,
  rating: 4.9,
  reviews: 45,
  amenities: [
    { icon: Wifi, name: "WiFi gratuito", description: "Connessione internet ad alta velocità" },
    { icon: Wind, name: "Aria condizionata", description: "Climatizzazione regolabile" },
    { icon: Tv, name: "TV satellitare", description: "Canali internazionali e locali" },
    { icon: Coffee, name: "Minibar", description: "Bevande e snack inclusi" },
    { icon: Shield, name: "Cassaforte", description: "Per oggetti di valore" },
    { icon: Car, name: "Parcheggio", description: "Parcheggio non è gratuito, costa 20 euro " },
  ],
  features: [
    "Vista panoramica su Polignano a Mare",
    "Balcone privato arredato",
    "Bagno in marmo con doccia",
    "Biancheria di lusso",
    "Servizio in camera 24h",
    "Pulizie giornaliere",
  ],
  policies: {
    checkIn: "15:00 - 22:00",
    checkOut: "08:00 - 11:00",
    cancellation: "Cancellazione gratuita fino a 24h prima",
    smoking: "Vietato fumare",
    pets: "Animali non ammessi",
    children: "Bambini benvenuti",
  },
}

interface RoomDetailsProps {
  roomId: string
}

export function RoomDetails({ roomId }: RoomDetailsProps) {
  const { t } = useLanguage()

  return (
    <div className="space-y-8">
      {/* Room Header */}
      <div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">{roomData.name}</h1>
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>
                  {t("room")} {roomId}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{roomData.rating}</span>
                <span>
                  ({roomData.reviews} {t("reviews")})
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-muted-foreground text-lg leading-relaxed mb-6">{roomData.description}</p>
      </div>

      {/* Room Specs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mountain className="w-5 h-5" />
            {t("roomDetails")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="font-semibold">{roomData.guests}</div>
              <div className="text-sm text-muted-foreground">{t("guests")}</div>
            </div>
            <div className="text-center">
              <Bed className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="font-semibold">{roomData.beds}</div>
              <div className="text-sm text-muted-foreground">{t("bed")}</div>
            </div>
            <div className="text-center">
              <Bath className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="font-semibold">{roomData.bathrooms}</div>
              <div className="text-sm text-muted-foreground">{t("bathroom")}</div>
            </div>
            <div className="text-center">
              <Mountain className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="font-semibold">{roomData.size} m²</div>
              <div className="text-sm text-muted-foreground">{t("size")}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Amenities */}
      <Card>
        <CardHeader>
          <CardTitle>{t("amenitiesAndComfort")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roomData.amenities.map((amenity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <amenity.icon className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <div className="font-medium">{amenity.name}</div>
                  <div className="text-sm text-muted-foreground">{amenity.description}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>{t("specialFeatures")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {roomData.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Policies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {t("policiesAndHours")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">{t("checkIn")}</h4>
              <p className="text-muted-foreground">{roomData.policies.checkIn}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">{t("checkOut")}</h4>
              <p className="text-muted-foreground">{roomData.policies.checkOut}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">{t("cancellation")}:</span>
              <span className="text-muted-foreground">{roomData.policies.cancellation}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">{t("smoking")}:</span>
              <span className="text-muted-foreground">{roomData.policies.smoking}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">{t("pets")}:</span>
              <span className="text-muted-foreground">{roomData.policies.pets}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">{t("children")}:</span>
              <span className="text-muted-foreground">{roomData.policies.children}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Long Description */}
      <Card>
        <CardHeader>
          <CardTitle>{t("fullDescription")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed">{roomData.longDescription}</p>
        </CardContent>
      </Card>
    </div>
  )
}
