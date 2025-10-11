"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, ChevronLeft, ChevronRight, Star, MapPin, Clock, CreditCard, Wallet } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { createBooking, type BookingPayload } from "@/lib/firebase";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const roomImages = [
  { src: "/images/room-1.jpg", alt: "Camera Deluxe con vista panoramica", title: "Camera Deluxe" },
  { src: "/images/room-2.jpg", alt: "Suite Panoramica con terrazza privata", title: "Suite Panoramica" },
  { src: "/luxury-family-room-with-multiple-beds.jpg", alt: "Camera Familiare spaziosa", title: "Camera Familiare" },
  { src: "/romantic-room-with-candles-and-rose-petals.jpg", alt: "Camera Romantica con atmosfera intima", title: "Camera Romantica" },
];

// prezzi base per notte
const ROOM_PRICES: Record<string, number> = {
  deluxe: 120,
  suite: 180,
  family: 160,
  romantic: 140,
};

type PayMethod = "stripe" | "paypal" | "satispay";

export default function BookingPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const search = useSearchParams();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation();
  const { ref: carouselRef, isVisible: carouselVisible } = useScrollAnimation();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    checkIn: "",
    checkOut: "",
    guests: "2",
    roomType: "",
    specialRequests: "",
  });

  const [payMethod, setPayMethod] = useState<PayMethod>("stripe");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const hasError = search.get("error") === "payment_failed";

  useEffect(() => {
    if (hasError) setShowErrorModal(true);
  }, [hasError]);

  const nights = useMemo(() => {
    const ci = formData.checkIn ? new Date(formData.checkIn) : null;
    const co = formData.checkOut ? new Date(formData.checkOut) : null;
    if (!ci || !co || isNaN(ci.getTime()) || isNaN(co.getTime())) return 0;
    const diff = Math.ceil((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [formData.checkIn, formData.checkOut]);

  // prezzo visibile sempre in overlay
  const basePrice = ROOM_PRICES[formData.roomType] ?? 0;
  const extraGuests = Math.max(0, Number(formData.guests || "1") - 2);
  const extraFee = extraGuests * 20; // 20€/notte per ospite extra
  const total = nights * (basePrice + extraFee);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // crea prenotazione "pending" su Firestore
    const payload: BookingPayload = {
      checkIn: formData.checkIn,
      checkOut: formData.checkOut,
      guests: Number(formData.guests || "1"),
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      notes: formData.specialRequests,
      totalAmount: total * 100, // in cents
      currency: "EUR",
      status: "pending",
      source: "site",
    };

    try {
      const bookingId = await createBooking(payload);
      // passa i dati essenziali al checkout via query
      const qs = new URLSearchParams({
        bookingId,
        method: payMethod,
      }).toString();
      router.push(`/checkout?${qs}`);
    } catch (err) {
      console.error("Create booking error:", err);
      setShowErrorModal(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % roomImages.length);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + roomImages.length) % roomImages.length);

  return (
    <main className="min-h-screen">
      <Header />

      <div className="pt-20 pb-16">
        <div className="container mx-auto px-4">
          <div
            ref={heroRef}
            className={`text-center mb-12 transition-all duration-1000 ${heroVisible ? "animate-fade-in-up opacity-100" : "opacity-0 translate-y-[50px]"}`}
          >
            <h1 className="text-4xl md:text-6xl font-cinzel font-bold text-roman-gradient mb-4 animate-text-shimmer">
              Prenota il Tuo Soggiorno
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Vivi un'esperienza indimenticabile nel cuore di Roma</p>
          </div>

          <div
            ref={carouselRef}
            className={`mb-12 transition-all duration-1000 delay-300 ${carouselVisible ? "animate-slide-in-up opacity-100" : "opacity-0 translate-y-[30px]"}`}
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-cinzel font-bold text-roman-gradient mb-2">Le Nostre Camere</h2>
              <p className="text-sm text-muted-foreground">Scopri dove soggiornerai</p>
            </div>

            <div className="max-w-2xl mx-auto">
              <div className="relative rounded-xl overflow-hidden shadow-lg">
                <div className="relative h-56 md:h-64">
                  <Image
                    src={
                      roomImages[currentImageIndex]?.src ||
                      `/placeholder.svg?height=400&width=800&query=${roomImages[currentImageIndex]?.title || "/placeholder.svg"} luxury room`
                    }
                    alt={roomImages[currentImageIndex]?.alt || "Camera di lusso"}
                    fill
                    className="object-cover"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  {/* Prezzo in sovra-impressione */}
                  <div className="absolute top-3 right-3">
                    <span className="rounded-full bg-black/60 text-white text-xs px-3 py-1">
                      {formData.roomType ? `da €${basePrice}/notte` : "scegli una camera"}
                    </span>
                  </div>

                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="text-xl font-cinzel font-bold">{roomImages[currentImageIndex]?.title}</h3>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white"
                  onClick={prevImage}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white"
                  onClick={nextImage}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>

                <div className="absolute bottom-4 right-4 flex gap-2">
                  {roomImages.map((_, index) => (
                    <button
                      key={index}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentImageIndex ? "bg-white scale-125" : "bg-white/50"}`}
                      onClick={() => setCurrentImageIndex(index)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="card-semi-transparent animate-slide-in-left bg-[#f5e6d3]/30 max-w-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl font-cinzel text-primary">Dettagli Prenotazione</CardTitle>
                  <CardDescription>Compila il modulo per prenotare il tuo soggiorno</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name" className="mb-2 block">Nome Completo</Label>
                        <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
                      </div>
                      <div>
                        <Label htmlFor="email" className="mb-2 block">Email</Label>
                        <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} required />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone" className="mb-2 block">Telefono</Label>
                        <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} />
                      </div>
                      <div>
                        <Label htmlFor="guests" className="mb-2 block">Numero Ospiti</Label>
                        <select id="guests" name="guests" value={formData.guests} onChange={handleInputChange} className="w-full px-3 py-2 border border-input rounded-md bg-background">
                          <option value="1">1 Ospite</option>
                          <option value="2">2 Ospiti</option>
                          <option value="3">3 Ospiti</option>
                          <option value="4">4 Ospiti</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="checkIn" className="mb-2 block">Check-in</Label>
                        <Input id="checkIn" name="checkIn" type="date" value={formData.checkIn} onChange={handleInputChange} required />
                      </div>
                      <div>
                        <Label htmlFor="checkOut" className="mb-2 block">Check-out</Label>
                        <Input id="checkOut" name="checkOut" type="date" value={formData.checkOut} onChange={handleInputChange} required />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="roomType" className="mb-2 block">Tipo Camera</Label>
                      <select id="roomType" name="roomType" value={formData.roomType} onChange={handleInputChange} className="w-full px-3 py-2 border border-input rounded-md bg-background" required>
                        <option value="">Seleziona una camera</option>
                        <option value="deluxe">Camera Deluxe</option>
                        <option value="suite">Suite Panoramica</option>
                        <option value="family">Camera Familiare</option>
                        <option value="romantic">Camera Romantica</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="specialRequests" className="mb-2 block">Richieste Speciali</Label>
                      <Textarea id="specialRequests" name="specialRequests" value={formData.specialRequests} onChange={handleInputChange} placeholder="Eventuali richieste particolari..." rows={3} />
                    </div>

                    {/* Metodi di pagamento */}
                    <div className="border rounded-lg p-4 bg-background/50">
                      <p className="font-medium mb-3">Metodo di Pagamento</p>
                      <div className="grid sm:grid-cols-3 gap-2">
                        <label className={`flex items-center gap-2 rounded-md border p-3 cursor-pointer ${payMethod === "stripe" ? "border-primary" : "border-muted"}`}>
                          <input type="radio" name="payMethod" className="hidden" checked={payMethod === "stripe"} onChange={() => setPayMethod("stripe")} />
                          <CreditCard className="w-4 h-4" /> Carta (Stripe)
                        </label>
                        <label className={`flex items-center gap-2 rounded-md border p-3 cursor-pointer ${payMethod === "paypal" ? "border-primary" : "border-muted"}`}>
                          <input type="radio" name="payMethod" className="hidden" checked={payMethod === "paypal"} onChange={() => setPayMethod("paypal")} />
                          <Wallet className="w-4 h-4" /> PayPal
                        </label>
                        <label className={`flex items-center gap-2 rounded-md border p-3 cursor-pointer ${payMethod === "satispay" ? "border-primary" : "border-muted"}`}>
                          <input type="radio" name="payMethod" className="hidden" checked={payMethod === "satispay"} onChange={() => setPayMethod("satispay")} />
                          <Wallet className="w-4 h-4" /> Satispay
                        </label>
                      </div>
                    </div>

                    {/* Totale visibile */}
                    <div className="flex items-center justify-between bg-muted/40 rounded-lg px-4 py-3">
                      <div className="text-sm text-muted-foreground">
                        {nights > 0 ? `${nights} notte${nights > 1 ? "i" : ""} • ${formData.guests} ospite/i` : "Completa date e camera"}
                      </div>
                      <div className="text-xl font-semibold">Totale: €{isFinite(total) ? total.toFixed(2) : "0.00"}</div>
                    </div>

                    <Button type="submit" className="w-full text-lg py-6">Conferma Prenotazione</Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6 animate-slide-in-right">
              <div className="card-invisible p-4">
                <div className="flex items-start gap-3 mb-3">
                  <Clock className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-cinzel font-semibold text-primary text-sm mb-2">Check-in/Check-out</h3>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2"><Calendar className="h-3 w-3 text-primary" /><span className="font-medium">Check-in: 15:00 - 20:00</span></div>
                      <div className="flex items-center gap-2"><Calendar className="h-3 w-3 text-primary" /><span className="font-medium">Check-out: 08:00 - 11:00</span></div>
                      <div className="flex items-center gap-2"><Users className="h-3 w-3 text-primary" /><span className="text-muted-foreground">Max 4 ospiti per camera</span></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-invisible p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-cinzel font-semibold text-primary text-sm mb-2">Come Raggiungerci</h3>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>Via dei Colli Romani, 123</p>
                      <p>00100 Roma, Italia</p>
                      <p className="pt-1"><strong className="text-foreground">Aeroporto:</strong> 45 min</p>
                      <p><strong className="text-foreground">Termini:</strong> 20 min</p>
                      <p><strong className="text-foreground">Colosseo:</strong> 15 min a piedi</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* riepilogo mini sempre visibile */}
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground mb-1">Prezzo stimato</p>
                <div className="text-2xl font-bold">€{isFinite(total) ? total.toFixed(2) : "0.00"}</div>
                <p className="text-xs text-muted-foreground mt-1">Tasse incluse dove applicabili.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Modale errore pagamento */}
      <AlertDialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Errore nel pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Si è verificato un problema con la transazione. Ti preghiamo di riprovare tra 5 minuti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowErrorModal(false)}>Ok</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
