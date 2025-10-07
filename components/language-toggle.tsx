"use client"

import { Button } from "@/components/ui/button"
import { Globe } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  const toggleLanguage = () => {
    setLanguage(language === "it" ? "en" : "it")
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2 text-foreground hover:text-primary transition-all duration-300 hover:scale-105"
    >
      <Globe className="h-4 w-4" />
      <span className="font-medium">{language === "it" ? "EN" : "IT"}</span>
    </Button>
  )
}
