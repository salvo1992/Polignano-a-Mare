import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Playfair_Display, Cinzel } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { LanguageProvider } from "@/components/language-provider"
import { AuthProvider } from "@/components/auth-provider"
import { CookieConsent } from "@/components/cookie-consent"
import "./globals.css"

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
})

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Villa Bella Vista - Luxury B&B in Rome",
  description:
    "Experience authentic Italian hospitality at Villa Bella Vista, a luxury bed & breakfast in the heart of Rome",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="it">
      <body
        className={`font-sans ${GeistSans.variable} ${GeistMono.variable} ${playfairDisplay.variable} ${cinzel.variable}`}
      >
        <AuthProvider>
          <LanguageProvider>
            <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
            <CookieConsent />
          </LanguageProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
