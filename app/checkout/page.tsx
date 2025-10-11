"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getBookingById, createStripeCheckout, createPayPalOrder, capturePayPalOrder, createSatispayPayment } from "@/lib/firebase";
import { Loader2 } from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const search = useSearchParams();
  const bookingId = search.get("bookingId") || "";
  const method = (search.get("method") || "stripe") as "stripe" | "paypal" | "satispay";

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    (async () => {
      setLoading(true);
      const data = await getBookingById(bookingId);
      setBooking(data);
      setLoading(false);
    })();
  }, [bookingId]);

  const totalEUR = useMemo(() => {
    const cents = Number(booking?.totalAmount || 0);
    return (cents / 100).toFixed(2);
  }, [booking]);

  const successUrl = useMemo(() => `${window.location.origin}/checkout/success?bookingId=${bookingId}`, [bookingId]);
  const cancelUrl = useMemo(() => `${window.location.origin}/prenota?error=payment_failed`, []);

  const handlePay = async () => {
    if (!bookingId || !booking) return;
    setPaying(true);
    try {
      if (method === "stripe") {
        const res = await createStripeCheckout({
          bookingId,
          amount: booking.totalAmount,
          currency: booking.currency || "EUR",
          successUrl,
          cancelUrl,
          customerEmail: booking.email,
          metadata: { source: "site" },
        });
        window.location.href = res.url;
      } else if (method === "paypal") {
        const res = await createPayPalOrder({
          bookingId,
          amount: booking.totalAmount,
          currency: booking.currency || "EUR",
          successUrl,
          cancelUrl,
          customerEmail: booking.email,
          metadata: { source: "site" },
        });
        // PayPal: vai alla pagina di approvazione
        window.location.href = res.approveUrl;
      } else {
        // Satispay
        const res = await createSatispayPayment({
          bookingId,
          amount: booking.totalAmount,
          currency: booking.currency || "EUR",
          successUrl,
          cancelUrl,
          customerEmail: booking.email,
          metadata: { source: "site" },
        });
        window.location.href = res.redirectUrl;
      }
    } catch (e) {
      console.error(e);
      router.push("/prenota?error=payment_failed");
    } finally {
      setPaying(false);
    }
  };

  return (
    <main className="min-h-screen">
      <Header />

      <div className="container mx-auto px-4 pt-24 pb-16">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Riepilogo prenotazione</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="animate-spin h-4 w-4" /> Caricamento...
              </div>
            ) : !booking ? (
              <div className="text-sm text-muted-foreground">Prenotazione non trovata.</div>
            ) : (
              <div className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><div className="text-xs text-muted-foreground">Nome</div><div className="font-medium">{booking.name}</div></div>
                  <div><div className="text-xs text-muted-foreground">Email</div><div className="font-medium">{booking.email}</div></div>
                  <div><div className="text-xs text-muted-foreground">Check-in</div><div className="font-medium">{booking.checkIn}</div></div>
                  <div><div className="text-xs text-muted-foreground">Check-out</div><div className="font-medium">{booking.checkOut}</div></div>
                  <div><div className="text-xs text-muted-foreground">Ospiti</div><div className="font-medium">{booking.guests}</div></div>
                  <div><div className="text-xs text-muted-foreground">Metodo</div><div className="font-medium">{method}</div></div>
                </div>

                {booking.notes && (
                  <div>
                    <div className="text-xs text-muted-foreground">Richieste</div>
                    <div className="text-sm">{booking.notes}</div>
                  </div>
                )}

                <div className="flex items-center justify-between bg-muted/40 rounded-lg px-4 py-3">
                  <div className="text-sm text-muted-foreground">Totale</div>
                  <div className="text-xl font-semibold">€{totalEUR}</div>
                </div>

                <div className="pt-2">
                  <Button onClick={handlePay} disabled={paying} className="w-full py-6 text-lg">
                    {paying ? "Reindirizzamento..." : "Paga ora"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Footer />
    </main>
  );
}
