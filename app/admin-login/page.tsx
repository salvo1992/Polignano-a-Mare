"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import { Eye, EyeOff, LogIn, Shield } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin";

  const { login, isLoading, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });

  // Redirect appena il ruolo è admin
  useEffect(() => {
    if (!isLoading && user?.role === "admin") {
      router.replace(next);
    }
  }, [user, isLoading, next, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    const ok = await login(form.email, form.password);
    if (!ok) {
      setErr("Credenziali non valide o privilegi insufficienti");
      return;
    }
    // redirect gestito dall'useEffect
  };

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="pt-20 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8 animate-fade-in-up">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-primary" />
                <h1 className="text-3xl font-cinzel font-bold text-roman-gradient">Accesso Amministratore</h1>
              </div>
              <p className="text-muted-foreground">Area riservata. Solo credenziali admin valide possono entrare.</p>
            </div>

            <Card className="card-enhanced animate-bounce-in">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-cinzel text-primary">Pannello Admin</CardTitle>
                <CardDescription>Inserisci le credenziali amministratore</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="text-sm">Email</label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="ekobit.cloud@gmail.com"
                      value={form.email}
                      onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="text-sm">Password</label>
                    <div className="relative mt-1">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={form.password}
                        onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword((s) => !s)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {err && (
                    <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md p-3 animate-fade-in-up">
                      {err}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Accesso in corso...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <LogIn className="h-4 w-4" />
                        Accedi
                      </div>
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center text-xs text-muted-foreground">
                  Non sei admin?{" "}
                  <Link href="/login" className="text-primary hover:underline font-medium">
                    Torna al login utenti
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
    <Footer />
    </main>
    
  );
}
