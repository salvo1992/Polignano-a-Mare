"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Users, Bed, Bath, Mountain, Star, Wifi, Car, Coffee, Tv, Wind, Shield, MapPin, Clock } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

interface RoomDetailsProps {
  roomId: string
}

export function RoomDetails({ roomId }: RoomDetailsProps) {
  const { t } = useLanguage()

  const amenities = [
    { icon: Wifi, name: t("amenityWifi"), description: t("amenityWifiDesc") },
    { icon: Wind, name: t("amenityAC"), description: t("amenityACDesc") },
    { icon: Tv, name: t("amenityTV"), description: t("amenityTVDesc") },
    { icon: Coffee, name: t("amenityMinibar"), description: t("amenityMinibarDesc") },
    { icon: Shield, name: t("amenitySafe"), description: t("amenitySafeDesc") },
    { icon: Car, name: t("amenityParking"), description: t("amenityParkingDesc") },
  ]

  const features = [
    t("featurePanoramicView"),
    t("featurePrivateBalcony"),
    t("featureMarbleBathroom"),
    t("featureLuxuryLinens"),
    t("featureRoomService"),
    t("featureDailyCleaning"),
  ]

  const policies = {
    checkIn: "15:00 - 22:00",
    checkOut: "08:00 - 11:00",
    cancellation: t("policyCancellation"),
    smoking: t("policyNoSmoking"),
    pets: t("policyNoPets"),
    children: t("policyChildren"),
  }

  const roomName = t("roomDetailName")
  const roomDescription = t("roomDetailDescription")
  const roomLongDescription = t("roomDetailLongDescription")

  return (
    <div className="space-y-8">
      {/* Room Header */}
      <div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">{roomName}</h1>
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>
                  {t("room")} {roomId}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">4.9</span>
                <span>
                  (45 {t("reviews")})
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-muted-foreground text-lg leading-relaxed mb-6">{roomDescription}</p>
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
              <div className="font-semibold">4</div>
              <div className="text-sm text-muted-foreground">{t("guests")}</div>
            </div>
            <div className="text-center">
              <Bed className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="font-semibold">2</div>
              <div className="text-sm text-muted-foreground">{t("bed")}</div>
            </div>
            <div className="text-center">
              <Bath className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="font-semibold">1</div>
              <div className="text-sm text-muted-foreground">{t("bathroom")}</div>
            </div>
            <div className="text-center">
              <Mountain className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="font-semibold">{'33 m\u00B2'}</div>
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
            {amenities.map((amenity, index) => (
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
            {features.map((feature, index) => (
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
              <p className="text-muted-foreground">{policies.checkIn}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">{t("checkOut")}</h4>
              <p className="text-muted-foreground">{policies.checkOut}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">{t("cancellation")}:</span>
              <span className="text-muted-foreground">{policies.cancellation}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">{t("smoking")}:</span>
              <span className="text-muted-foreground">{policies.smoking}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">{t("pets")}:</span>
              <span className="text-muted-foreground">{policies.pets}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">{t("children")}:</span>
              <span className="text-muted-foreground">{policies.children}</span>
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
          <p className="text-muted-foreground leading-relaxed">{roomLongDescription}</p>
        </CardContent>
      </Card>
    </div>
  )
}
