"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LanguageToggle } from "@/components/language-toggle"
import { useLanguage } from "@/components/language-provider"
import { useAuth } from "@/components/auth-provider"
import { Menu, X, User, LogOut, Home, Bed, Calendar, Phone, Crown, Sparkles, Star } from "lucide-react"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { t } = useLanguage()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    setIsMenuOpen(false)
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 gap-2">
            {/* Logo - Always visible with responsive text size */}
            <Link href="/" className="flex items-center space-x-2 group flex-shrink-0">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                <span className="text-primary-foreground font-bold text-base md:text-lg font-cinzel">VB</span>
              </div>
              <span className="font-cinzel text-sm sm:text-base md:text-xl font-bold text-roman-gradient whitespace-nowrap">
                Villa Bella Vista
              </span>
            </Link>

            {/* Right side - Reorganized for mobile: hide language/user on small screens, always show Book and Menu */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Language Toggle - Hidden on mobile */}
              <div className="hidden md:block">
                <LanguageToggle />
              </div>

              {/* User Section - Hidden on mobile */}
              {user ? (
                <div className="hidden md:flex items-center gap-2">
                  <Link href={user.role === "admin" ? "/admin" : "/user"}>
                    <Button variant="ghost" size="sm" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">{user.name}</span>
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={handleLogout} className="flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Esci</span>
                  </Button>
                </div>
              ) : (
                <Link href="/login" className="hidden md:block">
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Accedi</span>
                  </Button>
                </Link>
              )}

              {/* Book Now Button - Always visible, responsive size */}
              <Button
                asChild
                size="sm"
                className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 animate-pulse-slow text-xs sm:text-sm px-3 sm:px-4"
              >
                <Link href="/prenota">{t("bookNow")}</Link>
              </Button>

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
            className="fixed top-0 right-0 h-full w-80 bg-black/80 backdrop-blur-md shadow-2xl animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 pt-20">
              <nav className="flex flex-col space-y-6">
                <Link
                  href="/"
                  className="group flex items-center gap-3 text-white hover:text-primary transition-all duration-300 text-lg font-bold hover:translate-x-2 hover:scale-105"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:rotate-12 border-2 border-white/50">
                    <Home className="w-4 h-4 text-yellow-900" />
                  </div>
                  <span className="font-cinzel">{t("home")} ✨</span>
                </Link>

                <Link
                  href="/camere"
                  className="group flex items-center gap-3 text-white hover:text-primary transition-all duration-300 text-lg font-bold hover:translate-x-2 hover:scale-105"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:rotate-12 border-2 border-white/50">
                    <Bed className="w-4 h-4 text-yellow-900" />
                  </div>
                  <span className="font-cinzel">{t("rooms")} 🛏️</span>
                </Link>

                <Link
                  href="/servizi"
                  className="group flex items-center gap-3 text-white hover:text-primary transition-all duration-300 text-lg font-bold hover:translate-x-2 hover:scale-105"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:rotate-12 border-2 border-white/50">
                    <Crown className="w-4 h-4 text-yellow-900" />
                  </div>
                  <span className="font-cinzel">{t("services")} 👑</span>
                </Link>

                <Link
                  href="/prenota"
                  className="group flex items-center gap-3 text-white hover:text-primary transition-all duration-300 text-lg font-bold hover:translate-x-2 hover:scale-105"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:rotate-12 border-2 border-white/50">
                    <Calendar className="w-4 h-4 text-yellow-900" />
                  </div>
                  <span className="font-cinzel">{t("booking")} 📅</span>
                </Link>

                <Link
                  href="/contatti"
                  className="group flex items-center gap-3 text-white hover:text-primary transition-all duration-300 text-lg font-bold hover:translate-x-2 hover:scale-105"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:rotate-12 border-2 border-white/50">
                    <Phone className="w-4 h-4 text-yellow-900" />
                  </div>
                  <span className="font-cinzel">{t("contacts")} 📞</span>
                </Link>

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
                        <span className="font-cinzel">
                          {user.role === "admin" ? `${t("admin")} 🎭` : `${t("user")} 🌟`}
                        </span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="group flex items-center gap-3 text-white hover:text-primary transition-all duration-300 text-sm font-medium hover:translate-x-2 hover:scale-105 block"
                      >
                        <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300 border border-white/50">
                          <LogOut className="w-3 h-3 text-yellow-900" />
                        </div>
                        <span className="font-cinzel">{t("logout")} 👋</span>
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
                        <span className="font-cinzel">{t("login")} 🔑</span>
                      </Link>
                      <Link
                        href="/register"
                        className="group flex items-center gap-3 text-white hover:text-primary transition-all duration-300 text-sm font-medium hover:translate-x-2 hover:scale-105 block"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300 border border-white/50">
                          <Sparkles className="w-3 h-3 text-yellow-900" />
                        </div>
                        <span className="font-cinzel">Registrati ⭐</span>
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
