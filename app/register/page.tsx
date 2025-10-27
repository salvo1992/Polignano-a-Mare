"use client"

import type React from "react"

import { useEffect, useState } from "react"
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
import { Eye, EyeOff, UserPlus } from "lucide-react"

export default function RegisterPage() {
  const { t } = useLanguage()
  const { register, loginWithGoogleProvider, isLoading, isCheckingRedirect } = useAuth()
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [error, setError] = useState("")

  useEffect(() => {
    const googleError = sessionStorage.getItem("google_auth_error")
    if (googleError) {
      sessionStorage.removeItem("google_auth_error")
      if (googleError === "auth/operation-not-allowed") {
        setError(t("googleAuthNotEnabled"))
      } else if (googleError === "auth/user-cancelled") {
        setError(t("googleAuthCancelled"))
      } else {
        setError(t("googleAuthError"))
      }
    }
  }, [t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError(t("passwordsDoNotMatch"))
      return
    }

    if (formData.password.length < 6) {
      setError(t("passwordMinLength"))
      return
    }

    const success = await register(formData.name, formData.email, formData.password)
    if (success) {
      router.push("/user")
    } else {
      setError(t("emailAlreadyRegistered"))
    }
  }

  const handleGoogleRegister = async () => {
    console.log("[v0] Google register button clicked")
    setError("")
    await loginWithGoogleProvider()
    // User will be redirected to Google, then back to this page
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  if (isCheckingRedirect) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">{t("loading")}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="pt-20 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8 animate-fade-in-up">
              <h1 className="text-3xl font-cinzel font-bold text-roman-gradient mb-2">{t("registerTitle")}</h1>
              <p className="text-muted-foreground">{t("registerSubtitle")}</p>
            </div>

            <Card className="card-enhanced animate-bounce-in">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-cinzel text-primary">{t("createAccount")}</CardTitle>
                <CardDescription>{t("fillFormToRegister")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mb-4 bg-white hover:bg-gray-50 border-gray-300 text-gray-700 font-medium"
                  onClick={handleGoogleRegister}
                  disabled={isLoading}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {t("continueWithGoogle")}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">{t("or")}</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">{t("fullName")}</Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="mt-1"
                      placeholder="Mario Rossi"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">{t("email")}</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="mt-1"
                      placeholder="mario.rossi@email.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">{t("password")}</Label>
                    <div className="relative mt-1">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        placeholder="••••••••"
                        minLength={6}
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

                  <div>
                    <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
                    <div className="relative mt-1">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                        placeholder="••••••••"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                        {t("registering")}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        {t("register")}
                      </div>
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t("alreadyHaveAccount")}{" "}
                    <Link href="/login" className="text-primary hover:underline font-medium">
                      {t("loginHere")}
                    </Link>
                  </p>
                </div>

                <div className="mt-4 text-xs text-muted-foreground text-center">
                  {t("byRegisteringYouAccept")}{" "}
                  <Link href="/terms" className="text-primary hover:underline">
                    {t("termsOfService")}
                  </Link>{" "}
                  {t("and")}{" "}
                  <Link href="/privacy" className="text-primary hover:underline">
                    {t("privacyPolicy")}
                  </Link>
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
