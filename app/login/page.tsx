"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/auth-provider"
import { useLanguage } from "@/components/language-provider"
import { Eye, EyeOff, LogIn } from "lucide-react"

export default function LoginPage() {
  const { t } = useLanguage()
  const { login, isLoading } = useAuth()
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const success = await login(formData.email, formData.password)
    if (success) {
      router.push("/user")
    } else {
      setError("Email o password non corretti")
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="pt-20 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            {/* Header */}
            <div className="text-center mb-8 animate-fade-in-up">
              <h1 className="text-3xl font-cinzel font-bold text-roman-gradient mb-2">Accedi</h1>
              <p className="text-muted-foreground">Benvenuto di nuovo a Villa Bella Vista</p>
            </div>

            <Card className="card-enhanced animate-bounce-in">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-cinzel text-primary">Accedi al tuo Account</CardTitle>
                <CardDescription>Inserisci le tue credenziali per continuare</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="mt-1"
                      placeholder="marco.rossi@email.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">Password</Label>
                    <div className="relative mt-1">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        placeholder="••••••••"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {error && (
                    <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md p-3 animate-fade-in-up">
                      {error}
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

                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Non hai un account?{" "}
                    <Link href="/register" className="text-primary hover:underline font-medium">
                      Registrati qui
                    </Link>
                  </p>
                </div>

                <div className="mt-4 text-center">
                  <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                    Hai dimenticato la password?
                  </Link>
                </div>

                {/* Demo credentials */}
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">Credenziali Demo:</p>
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <p>
                      <strong>Utente:</strong> marco.rossi@email.com / password123
                    </p>
                    <p>
                      <strong>Admin:</strong> admin@villabellavista.it / admin123
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
