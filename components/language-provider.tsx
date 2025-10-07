"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type Language = "it" | "en"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations = {
  it: {
    home: "Home",
    rooms: "Le Nostre Camere",
    services: "I Nostri Servizi",
    booking: "Prenota",
    contacts: "Contatti",
    bookNow: "Prenota Ora",
    ourStory: "La Nostra Storia",
    welcome: "Benvenuti",
    admin: "Admin",
    user: "Utente",
    login: "Accedi",
    logout: "Esci",
  },
  en: {
    home: "Home",
    rooms: "Our Rooms",
    services: "Our Services",
    booking: "Book",
    contacts: "Contacts",
    bookNow: "Book Now",
    ourStory: "Our Story",
    welcome: "Welcome",
    admin: "Admin",
    user: "User",
    login: "Login",
    logout: "Logout",
  },
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("it")

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.it] || key
  }

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
