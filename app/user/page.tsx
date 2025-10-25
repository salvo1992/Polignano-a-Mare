"use client"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Calendar, UserIcon, Settings, Shield, Sparkles } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { RequireUser } from "@/components/route-guards"
import { db } from "@/lib/firebase"
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore"
import AvatarPicker from "@/components/user/AvatarPicker"
import { safe } from "@/lib/safe-defaults"
import { useLanguage } from "@/components/language-provider"

interface Booking {
  id: string
  roomName: string
  checkIn: string
  checkOut: string
  status: "paid" | "confirmed" | "completed" | "upcoming" | "cancelled"
  totalAmount: number
  nights: number
}

export default function UserPage() {
  return (
    <RequireUser>
      <UserInner />
    </RequireUser>
  )
}

function UserInner() {
  const { t } = useLanguage()
  const { user, changePassword, deleteAccount } = useAuth()
  const searchParams = useSearchParams()
  const highlightBookingId = searchParams.get("highlight")

  const [isEditing, setIsEditing] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [bookingsCompleted, setBookingsCompleted] = useState<Booking[]>([])
  const [bookingsUpcoming, setBookingsUpcoming] = useState<Booking[]>([])
  const [notif, setNotif] = useState({ confirmEmails: true, promos: true, checkinReminders: true })

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const snap = await getDoc(doc(db, "users", user.uid))
      const data = snap.data() || {}
      setProfile(data)
      setNotif({
        confirmEmails: data?.notifications?.confirmEmails ?? true,
        promos: data?.notifications?.promos ?? true,
        checkinReminders: data?.notifications?.checkinReminders ?? true,
      })
      const qs = query(collection(db, "bookings"), where("userId", "==", user.uid))
      const res = await getDocs(qs)
      const all: Booking[] = res.docs.map((d) => ({ id: d.id, ...d.data() }) as any)

      all.sort((a, b) => b.checkIn.localeCompare(a.checkIn))

      // Separate bookings by status
      const today = new Date().toISOString().split("T")[0]
      const upcoming = all.filter((b) => b.checkIn >= today && (b.status === "paid" || b.status === "confirmed"))
      const completed = all.filter((b) => b.checkOut < today || b.status === "completed")

      setBookingsCompleted(completed)
      setBookingsUpcoming(upcoming)
    })()
  }, [user])

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2)
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="pt-20 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-4xl font-cinzel font-bold text-roman-gradient mb-2">{t("myAccount")}</h1>
            <p className="text-muted-foreground">{t("manageProfile")}</p>
          </div>

          <div className="grid lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <div className="mb-3">
                      <AvatarPicker />
                    </div>
                    <h3 className="font-semibold text-lg">
                      {safe.text(`${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim(), "Vuoto")}
                    </h3>
                    <p className="text-sm text-muted-foreground">{safe.text(user?.email, "Vuoto")}</p>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>{t("memberSince")}</span>
                      <span className="font-medium">
                        {profile?.createdAt?.toDate
                          ? profile.createdAt.toDate().toISOString().slice(0, 10)
                          : "Non ancora presente"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("phone")}</span>
                      <span className="font-medium">{safe.text(profile?.phone)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("address")}</span>
                      <span className="font-medium">{safe.text(profile?.address)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-3">
              <Tabs defaultValue="profile" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="profile" className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4" /> {t("profile")}
                  </TabsTrigger>
                  <TabsTrigger value="bookings" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> {t("bookings")}
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" /> {t("settings")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                  <Card>
                    <CardHeader className="flex items-center justify-between">
                      <div>
                        <CardTitle className="font-cinzel text-primary">{t("personalInfo")}</CardTitle>
                        <CardDescription>{t("editData")}</CardDescription>
                      </div>
                      <Button variant="outline" onClick={() => setIsEditing((v) => !v)}>
                        {isEditing ? t("cancel") : t("edit")}
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label>{t("firstName")}</Label>
                          <Input defaultValue={profile?.firstName ?? ""} disabled={!isEditing} />
                        </div>
                        <div>
                          <Label>{t("lastName")}</Label>
                          <Input defaultValue={profile?.lastName ?? ""} disabled={!isEditing} />
                        </div>
                        <div>
                          <Label>{t("email")}</Label>
                          <Input value={user?.email ?? ""} disabled />
                        </div>
                        <div>
                          <Label>{t("phone")}</Label>
                          <Input defaultValue={profile?.phone ?? ""} disabled={!isEditing} />
                        </div>
                        <div className="md:col-span-2">
                          <Label>{t("address")}</Label>
                          <Input defaultValue={profile?.address ?? ""} disabled={!isEditing} />
                        </div>
                      </div>
                      {isEditing && (
                        <div className="flex gap-2">
                          <Button>{t("saveChanges")}</Button>
                          <Button variant="outline" onClick={() => setIsEditing(false)}>
                            {t("cancel")}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="bookings" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-cinzel text-primary">{t("upcomingBookings")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {bookingsUpcoming.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("noUpcomingBookings")}</p>
                      ) : (
                        bookingsUpcoming.map((b) => (
                          <div
                            key={b.id}
                            className={`border rounded-lg p-4 mb-3 transition-all ${
                              highlightBookingId === b.id
                                ? "border-primary bg-primary/5 shadow-lg animate-pulse"
                                : "border-border"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <p className="font-semibold text-lg">{b.roomName}</p>
                                  {highlightBookingId === b.id && (
                                    <Badge className="bg-green-500 text-white">
                                      <Sparkles className="h-3 w-3 mr-1" />
                                      Nuova
                                    </Badge>
                                  )}
                                </div>
                                <div className="space-y-1 text-sm text-muted-foreground">
                                  <p>
                                    📅 {b.checkIn} → {b.checkOut} ({b.nights} {b.nights > 1 ? "notti" : "notte"})
                                  </p>
                                  <p>🆔 {b.id}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant={b.status === "paid" ? "default" : "secondary"} className="mb-2">
                                  {b.status === "paid" ? "Pagata" : "Confermata"}
                                </Badge>
                                <p className="text-lg font-bold text-primary">€{formatPrice(b.totalAmount)}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="font-cinzel text-primary">{t("completedBookings")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {bookingsCompleted.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("noCompletedBookings")}</p>
                      ) : (
                        bookingsCompleted.map((b) => (
                          <div key={b.id} className="border rounded-lg p-4 mb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-semibold text-lg mb-2">{b.roomName}</p>
                                <div className="space-y-1 text-sm text-muted-foreground">
                                  <p>
                                    📅 {b.checkIn} → {b.checkOut} ({b.nights} {b.nights > 1 ? "notti" : "notte"})
                                  </p>
                                  <p>🆔 {b.id}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant="secondary" className="mb-2">
                                  Completata
                                </Badge>
                                <p className="text-lg font-bold">€{formatPrice(b.totalAmount)}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="settings" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-cinzel text-primary">{t("notifications")}</CardTitle>
                      <CardDescription>{t("enableDisableAlerts")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <label className="flex items-center justify-between">
                        <span>{t("confirmationEmails")}</span>
                        <input
                          type="checkbox"
                          checked={notif.confirmEmails}
                          onChange={(e) => setNotif((v) => ({ ...v, confirmEmails: e.target.checked }))}
                        />
                      </label>
                      <label className="flex items-center justify-between">
                        <span>{t("specialOffers")}</span>
                        <input
                          type="checkbox"
                          checked={notif.promos}
                          onChange={(e) => setNotif((v) => ({ ...v, promos: e.target.checked }))}
                        />
                      </label>
                      <label className="flex items-center justify-between">
                        <span>{t("checkinReminders")}</span>
                        <input
                          type="checkbox"
                          checked={notif.checkinReminders}
                          onChange={(e) => setNotif((v) => ({ ...v, checkinReminders: e.target.checked }))}
                        />
                      </label>
                      <Button className="mt-2">{t("savePreferences")}</Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="font-cinzel text-primary flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        {t("privacySecurity")}
                      </CardTitle>
                      <CardDescription>{t("changePasswordOrDelete")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <Label>{t("newPassword")}</Label>
                          <Input type="password" placeholder="••••••••" />
                        </div>
                        <div>
                          <Label>{t("phone")}</Label>
                          <Input type="tel" placeholder="+39 ..." />
                        </div>
                      </div>
                      <Button variant="outline">{t("changePassword")}</Button>
                      <div className="border-t pt-4" />
                      <div className="grid md:grid-cols-3 gap-3">
                        <div>
                          <Label>{t("email")}</Label>
                          <Input defaultValue={user?.email ?? ""} />
                        </div>
                        <div>
                          <Label>{t("phone")}</Label>
                          <Input type="tel" placeholder="+39 ..." />
                        </div>
                        <div>
                          <Label>{t("currentPassword")}</Label>
                          <Input type="password" placeholder="••••••••" />
                        </div>
                      </div>
                      <Button variant="destructive">{t("deleteAccount")}</Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
