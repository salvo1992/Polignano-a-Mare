"use client"
import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Calendar, UserIcon, Settings, Shield, Sparkles, Eye } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { RequireUser } from "@/components/route-guards"
import { db, secureChangePassword, secureDeleteAccount } from "@/lib/firebase"
import { collection, doc, getDoc, getDocs, query, where, updateDoc } from "firebase/firestore"
import { safe } from "@/lib/safe-defaults"
import { useLanguage } from "@/components/language-provider"
import Image from "next/image"
import { toast } from "sonner"

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
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const highlightBookingId = searchParams.get("highlight")

  const [isEditing, setIsEditing] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [bookingsCompleted, setBookingsCompleted] = useState<Booking[]>([])
  const [bookingsUpcoming, setBookingsUpcoming] = useState<Booking[]>([])
  const [notif, setNotif] = useState({ confirmEmails: true, promos: true, checkinReminders: true })

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
  })
  const [changingPassword, setChangingPassword] = useState(false)

  const [deleteData, setDeleteData] = useState({
    email: "",
    phone: "",
    currentPassword: "",
  })
  const [deletingAccount, setDeletingAccount] = useState(false)

  const [editedProfile, setEditedProfile] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
  })

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const snap = await getDoc(doc(db, "users", user.uid))
      const data = snap.data() || {}
      setProfile(data)
      setEditedProfile({
        firstName: data?.firstName || "",
        lastName: data?.lastName || "",
        phone: data?.phone || "",
        address: data?.address || "",
      })
      setNotif({
        confirmEmails: data?.notifications?.confirmEmails ?? true,
        promos: data?.notifications?.promos ?? true,
        checkinReminders: data?.notifications?.checkinReminders ?? true,
      })
      const qs = query(collection(db, "bookings"), where("userId", "==", user.uid))
      const res = await getDocs(qs)
      const all: Booking[] = res.docs.map((d) => ({ id: d.id, ...d.data() }) as any)

      all.sort((a, b) => b.checkIn.localeCompare(a.checkIn))

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

  const getRoomImage = (roomName: string) => {
    if (!roomName) {
      return "/images/room-1.jpg"
    }

    const lowerName = roomName.toLowerCase()
    if (lowerName.includes("familiare") || lowerName.includes("balcone")) {
      return "/images/room-2.jpg"
    }
    return "/images/room-1.jpg"
  }

  const handleSaveProfile = async () => {
    if (!user) return
    try {
      await updateDoc(doc(db, "users", user.uid), editedProfile)
      setProfile({ ...profile, ...editedProfile })
      setIsEditing(false)
      toast.success("Profilo aggiornato con successo!")
    } catch (error) {
      toast.error("Errore durante l'aggiornamento del profilo")
    }
  }

  const handleChangePassword = async () => {
    if (!user?.email) return
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error("Compila tutti i campi")
      return
    }
    if (passwordData.newPassword.length < 6) {
      toast.error("La nuova password deve essere di almeno 6 caratteri")
      return
    }

    setChangingPassword(true)
    try {
      await secureChangePassword(user.email, passwordData.currentPassword, passwordData.newPassword)
      toast.success("Password cambiata con successo!")
      setPasswordData({ currentPassword: "", newPassword: "" })
    } catch (error: any) {
      if (error.message.includes("wrong-password")) {
        toast.error("Password attuale errata")
      } else {
        toast.error("Errore durante il cambio password")
      }
    } finally {
      setChangingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user?.email) return
    if (!deleteData.email || !deleteData.currentPassword) {
      toast.error("Compila tutti i campi obbligatori")
      return
    }
    if (deleteData.email !== user.email) {
      toast.error("L'email non corrisponde")
      return
    }

    const confirmed = confirm(
      "Sei sicuro di voler eliminare il tuo account? Questa azione è irreversibile e cancellerà tutti i tuoi dati.",
    )
    if (!confirmed) return

    setDeletingAccount(true)
    try {
      await secureDeleteAccount(deleteData.email, deleteData.currentPassword)
      toast.success("Account eliminato con successo")
      router.push("/")
    } catch (error: any) {
      if (error.message.includes("wrong-password")) {
        toast.error("Password errata")
      } else {
        toast.error("Errore durante l'eliminazione dell'account")
      }
    } finally {
      setDeletingAccount(false)
    }
  }

  const handleSaveNotifications = async () => {
    if (!user) return
    try {
      await updateDoc(doc(db, "users", user.uid), {
        notifications: notif,
      })
      toast.success("Preferenze salvate con successo!")
    } catch (error) {
      toast.error("Errore durante il salvataggio delle preferenze")
    }
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
                    <div className="w-32 h-32 mx-auto mb-4 relative">
                      <Image
                        src="/default-avatar.jpg"
                        alt="Avatar"
                        fill
                        className="rounded-full object-cover border-4 border-primary/20"
                      />
                    </div>
                    <h3 className="font-semibold text-lg">
                      {safe.text(
                        `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim(),
                        user?.displayName || "Utente",
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground">{safe.text(user?.email, "")}</p>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>{t("memberSince")}</span>
                      <span className="font-medium">
                        {profile?.createdAt?.toDate ? profile.createdAt.toDate().toLocaleDateString("it-IT") : "N/D"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("phone")}</span>
                      <span className="font-medium">{safe.text(profile?.phone || bookingsUpcoming[0]?.phone)}</span>
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
                    <CardHeader className="flex flex-row items-center justify-between">
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
                          <Input
                            value={editedProfile.firstName}
                            onChange={(e) => setEditedProfile({ ...editedProfile, firstName: e.target.value })}
                            disabled={!isEditing}
                          />
                        </div>
                        <div>
                          <Label>{t("lastName")}</Label>
                          <Input
                            value={editedProfile.lastName}
                            onChange={(e) => setEditedProfile({ ...editedProfile, lastName: e.target.value })}
                            disabled={!isEditing}
                          />
                        </div>
                        <div>
                          <Label>{t("email")}</Label>
                          <Input value={user?.email ?? ""} disabled />
                        </div>
                        <div>
                          <Label>{t("phone")}</Label>
                          <Input
                            value={editedProfile.phone}
                            onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>{t("address")}</Label>
                          <Input
                            value={editedProfile.address}
                            onChange={(e) => setEditedProfile({ ...editedProfile, address: e.target.value })}
                            disabled={!isEditing}
                          />
                        </div>
                      </div>
                      {isEditing && (
                        <div className="flex gap-2">
                          <Button onClick={handleSaveProfile}>{t("saveChanges")}</Button>
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
                            className={`border rounded-lg overflow-hidden mb-4 transition-all cursor-pointer hover:shadow-lg ${
                              highlightBookingId === b.id ? "border-primary bg-primary/5 shadow-lg" : "border-border"
                            }`}
                            onClick={() => router.push(`/user/booking/${b.id}`)}
                          >
                            <div className="flex flex-col md:flex-row">
                              <div className="relative w-full md:w-48 h-32">
                                <Image
                                  src={getRoomImage(b.roomName) || "/placeholder.svg"}
                                  alt={b.roomName}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <div className="flex-1 p-4">
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
                                      <p>🆔 {b.id.slice(0, 12).toUpperCase()}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <Badge variant={b.status === "paid" ? "default" : "secondary"} className="mb-2">
                                      {b.status === "paid" ? "Pagata" : "Confermata"}
                                    </Badge>
                                    <p className="text-lg font-bold text-primary">€{formatPrice(b.totalAmount)}</p>
                                    <Button size="sm" variant="ghost" className="mt-2">
                                      <Eye className="h-4 w-4 mr-1" />
                                      Dettagli
                                    </Button>
                                  </div>
                                </div>
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
                          <div
                            key={b.id}
                            className="border rounded-lg overflow-hidden mb-4 cursor-pointer hover:shadow-lg transition-all"
                            onClick={() => router.push(`/user/booking/${b.id}`)}
                          >
                            <div className="flex flex-col md:flex-row">
                              <div className="relative w-full md:w-48 h-32">
                                <Image
                                  src={getRoomImage(b.roomName) || "/placeholder.svg"}
                                  alt={b.roomName}
                                  fill
                                  className="object-cover grayscale"
                                />
                              </div>
                              <div className="flex-1 p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="font-semibold text-lg mb-2">{b.roomName}</p>
                                    <div className="space-y-1 text-sm text-muted-foreground">
                                      <p>
                                        📅 {b.checkIn} → {b.checkOut} ({b.nights} {b.nights > 1 ? "notti" : "notte"})
                                      </p>
                                      <p>🆔 {b.id.slice(0, 12).toUpperCase()}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <Badge variant="secondary" className="mb-2">
                                      Completata
                                    </Badge>
                                    <p className="text-lg font-bold">€{formatPrice(b.totalAmount)}</p>
                                    <Button size="sm" variant="ghost" className="mt-2">
                                      <Eye className="h-4 w-4 mr-1" />
                                      Dettagli
                                    </Button>
                                  </div>
                                </div>
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
                    <CardContent className="space-y-4">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span>{t("confirmationEmails")}</span>
                        <input
                          type="checkbox"
                          checked={notif.confirmEmails}
                          onChange={(e) => setNotif((v) => ({ ...v, confirmEmails: e.target.checked }))}
                          className="w-4 h-4"
                        />
                      </label>
                      <label className="flex items-center justify-between cursor-pointer">
                        <span>{t("specialOffers")}</span>
                        <input
                          type="checkbox"
                          checked={notif.promos}
                          onChange={(e) => setNotif((v) => ({ ...v, promos: e.target.checked }))}
                          className="w-4 h-4"
                        />
                      </label>
                      <label className="flex items-center justify-between cursor-pointer">
                        <span>{t("checkinReminders")}</span>
                        <input
                          type="checkbox"
                          checked={notif.checkinReminders}
                          onChange={(e) => setNotif((v) => ({ ...v, checkinReminders: e.target.checked }))}
                          className="w-4 h-4"
                        />
                      </label>
                      <Button onClick={handleSaveNotifications} className="mt-2">
                        {t("savePreferences")}
                      </Button>
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
                    <CardContent className="space-y-6">
                      <div className="space-y-3">
                        <h4 className="font-semibold">Cambia Password</h4>
                        <div className="grid md:grid-cols-2 gap-3">
                          <div>
                            <Label>{t("currentPassword")}</Label>
                            <Input
                              type="password"
                              placeholder="••••••••"
                              value={passwordData.currentPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>{t("newPassword")}</Label>
                            <Input
                              type="password"
                              placeholder="••••••••"
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            />
                          </div>
                        </div>
                        <Button variant="outline" onClick={handleChangePassword} disabled={changingPassword}>
                          {changingPassword ? "Cambio in corso..." : t("changePassword")}
                        </Button>
                      </div>

                      <div className="border-t pt-6" />

                      <div className="space-y-3">
                        <h4 className="font-semibold text-destructive">Elimina Account</h4>
                        <p className="text-sm text-muted-foreground">
                          Questa azione è irreversibile. Tutti i tuoi dati verranno eliminati permanentemente.
                        </p>
                        <div className="grid md:grid-cols-3 gap-3">
                          <div>
                            <Label>{t("email")}</Label>
                            <Input
                              value={deleteData.email}
                              onChange={(e) => setDeleteData({ ...deleteData, email: e.target.value })}
                              placeholder={user?.email || ""}
                            />
                          </div>
                          <div>
                            <Label>{t("phone")}</Label>
                            <Input
                              type="tel"
                              placeholder="+39 ..."
                              value={deleteData.phone}
                              onChange={(e) => setDeleteData({ ...deleteData, phone: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>{t("currentPassword")}</Label>
                            <Input
                              type="password"
                              placeholder="••••••••"
                              value={deleteData.currentPassword}
                              onChange={(e) => setDeleteData({ ...deleteData, currentPassword: e.target.value })}
                            />
                          </div>
                        </div>
                        <Button variant="destructive" onClick={handleDeleteAccount} disabled={deletingAccount}>
                          {deletingAccount ? "Eliminazione in corso..." : t("deleteAccount")}
                        </Button>
                      </div>
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
