"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"
import { useAuth } from "@/components/auth-provider"
import { Menu, X, User, LogOut, Home, Bed, Calendar, Phone, Crown, Sparkles, Star, Globe } from "lucide-react"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { t, language, setLanguage } = useLanguage()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    setIsMenuOpen(false)
  }

  const languages = [
    { code: "it" as const, name: "Italiano", flag: "🇮🇹" },
    { code: "en" as const, name: "English", flag: "🇬🇧" },
    { code: "fr" as const, name: "Français", flag: "🇫🇷" },
    { code: "es" as const, name: "Español", flag: "🇪🇸" },
    { code: "de" as const, name: "Deutsch", flag: "🇩🇪" },
  ]

  const currentLanguage = languages.find((lang) => lang.code === language)

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 gap-2">
            {/* Logo - Always visible with responsive text size */}
            <Link href="/" className="flex items-center space-x-2 group flex-shrink-0">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                <span className="text-primary-foreground font-bold text-base md:text-lg font-cinzel">
                  <img
                    src="images/logo22.jpg"
                    alt="Logo Al 22 Suite & Spa Luxury Experience"
                    width={100}
                    height={100}
                  />
                </span>
              </div>
              <span className="font-cinzel text-sm sm:text-base md:text-xl font-bold text-roman-gradient whitespace-nowrap">
                AL 22 Suite & SPA LUXURY EXPERIENCE
              </span>
            </Link>

            <div className="flex items-center gap-2 md:gap-4">
              <div className="md:hidden flex items-center">
                <span className="text-2xl">{currentLanguage?.flag}</span>
              </div>

              {/* Desktop Navigation - Hidden on mobile */}
              <div className="hidden md:flex items-center gap-4">
                {/* User Section */}
                {user ? (
                  <div className="flex items-center gap-2">
                    <Link href={user.role === "admin" ? "/admin" : "/user"}>
                      <Button variant="ghost" size="sm" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{user.name}</span>
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={handleLogout} className="flex items-center gap-2">
                      <LogOut className="h-4 w-4" />
                      <span>{t("logout")}</span>
                    </Button>
                  </div>
                ) : (
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{t("login")}</span>
                    </Button>
                  </Link>
                )}

                {/* Book Now Button */}
                <Button
                  asChild
                  size="sm"
                  className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <Link href="/prenota">{t("bookNow")}</Link>
                </Button>
              </div>

              {/* Menu Toggle - Always visible */}
              <Button
                variant="ghost"
                size="sm"
                className="relative group hover:bg-primary/10 transition-all duration-300 flex-shrink-0"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <div className="relative w-6 h-6 flex items-center justify-center">
                  <Menu
                    className={`h-5 w-5 transition-all duration-300 ${isMenuOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100"}`}
                  />
                  <X
                    className={`h-5 w-5 absolute transition-all duration-300 ${isMenuOpen ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"}`}
                  />
                </div>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {isMenuOpen && (
        <div className="fixed inset-0 z-40 sidebar-overlay animate-fade-in-up" onClick={() => setIsMenuOpen(false)}>
          <div
            className="fixed top-0 right-0 h-full w-80 bg-black/80 backdrop-blur-md shadow-2xl animate-slide-in-right overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 pt-20">
              <nav className="flex flex-col space-y-6">
                {/* Navigation Links */}
                <Link
                  href="/"
                  className="group flex items-center gap-3 text-white hover:text-primary transition-all duration-300 text-lg font-bold hover:translate-x-2 hover:scale-105"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:rotate-12 border-2 border-white/50">
                    <Home className="w-4 h-4 text-yellow-900" />
                  </div>
                  <span className="font-cinzel">{t("home")}</span>
                </Link>

                <Link
                  href="/camere"
                  className="group flex items-center gap-3 text-white hover:text-primary transition-all duration-300 text-lg font-bold hover:translate-x-2 hover:scale-105"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:rotate-12 border-2 border-white/50">
                    <Bed className="w-4 h-4 text-yellow-900" />
                  </div>
                  <span className="font-cinzel">{t("rooms")}</span>
                </Link>

                <Link
                  href="/servizi"
                  className="group flex items-center gap-3 text-white hover:text-primary transition-all duration-300 text-lg font-bold hover:translate-x-2 hover:scale-105"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:rotate-12 border-2 border-white/50">
                    <Crown className="w-4 h-4 text-yellow-900" />
                  </div>
                  <span className="font-cinzel">{t("services")}</span>
                </Link>

                <Link
                  href="/prenota"
                  className="group flex items-center gap-3 text-white hover:text-primary transition-all duration-300 text-lg font-bold hover:translate-x-2 hover:scale-105"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:rotate-12 border-2 border-white/50">
                    <Calendar className="w-4 h-4 text-yellow-900" />
                  </div>
                  <span className="font-cinzel">{t("booking")}</span>
                </Link>

                <Link
                  href="/contatti"
                  className="group flex items-center gap-3 text-white hover:text-primary transition-all duration-300 text-lg font-bold hover:translate-x-2 hover:scale-105"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:rotate-12 border-2 border-white/50">
                    <Phone className="w-4 h-4 text-yellow-900" />
                  </div>
                  <span className="font-cinzel">{t("contacts")}</span>
                </Link>

                {/* Language Selector Section */}
                <div className="border-t border-white/20 pt-6 mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="w-4 h-4 text-yellow-400 animate-pulse" />
                    <span className="text-xs font-cinzel text-white uppercase tracking-wider font-bold">
                      {t("selectLanguage") || "Language"}
                    </span>
                    <Globe className="w-4 h-4 text-yellow-400 animate-pulse" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code)
                          // Don't close menu so user can see the language change
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                          language === lang.code
                            ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900 font-bold shadow-lg"
                            : "bg-white/10 text-white hover:bg-white/20"
                        }`}
                      >
                        <span className="text-lg">{lang.flag}</span>
                        <span className="text-xs font-cinzel">{lang.code.toUpperCase()}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Account Section */}
                <div className="border-t border-white/20 pt-6 mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
                    <span className="text-xs font-cinzel text-white uppercase tracking-wider font-bold">Account</span>
                    <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
                  </div>

                  {user ? (
                    <>
                      <Link
                        href={user.role === "admin" ? "/admin" : "/user"}
                        className="group flex items-center gap-3 text-white hover:text-primary transition-all duration-300 text-sm font-medium hover:translate-x-2 hover:scale-105 block mb-3"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300 border border-white/50">
                          <Star className="w-3 h-3 text-yellow-900" />
                        </div>
                        <span className="font-cinzel">{user.role === "admin" ? t("admin") : t("user")}</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="group flex items-center gap-3 text-white hover:text-primary transition-all duration-300 text-sm font-medium hover:translate-x-2 hover:scale-105 block"
                      >
                        <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300 border border-white/50">
                          <LogOut className="w-3 h-3 text-yellow-900" />
                        </div>
                        <span className="font-cinzel">{t("logout")}</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        className="group flex items-center gap-3 text-white hover:text-primary transition-all duration-300 text-sm font-medium hover:translate-x-2 hover:scale-105 block mb-3"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300 border border-white/50">
                          <User className="w-3 h-3 text-yellow-900" />
                        </div>
                        <span className="font-cinzel">{t("login")}</span>
                      </Link>
                      <Link
                        href="/register"
                        className="group flex items-center gap-3 text-white hover:text-primary transition-all duration-300 text-sm font-medium hover:translate-x-2 hover:scale-105 block"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300 border border-white/50">
                          <Sparkles className="w-3 h-3 text-yellow-900" />
                        </div>
                        <span className="font-cinzel">{t("register")}</span>
                      </Link>
                    </>
                  )}
                </div>
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  )
}



