"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CheckoutSuccess() {
  const search = useSearchParams();
  const bookingId = search.get("bookingId") || "";

  return (
    <main className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 pt-24 pb-16">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>Pagamento riuscito 🎉</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Grazie! La tua prenotazione è stata confermata.
            </p>
            <div className="rounded-lg border p-3 bg-muted/30 mb-4">
              <div className="text-xs text-muted-foreground">ID Prenotazione</div>
              <div className="font-mono text-sm">{bookingId}</div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button asChild className="flex-1">
                <Link href="/utente">Vai alla tua area personale</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/prenota">Nuova prenotazione</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </main>
  );
}
