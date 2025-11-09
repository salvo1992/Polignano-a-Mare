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
import { WhatsAppButton } from "@/components/whatsapp-button"
import "./globals.css"
export const dynamic = "force-dynamic"
export const revalidate = 0

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
  title: "AL 22 Suite & SPA LUXURY EXPERIENCE",
  description:
    "Experience authentic Italian hospitality at AL 22 Suite & SPA, a luxury bed & breakfast in the heart of Polignano a Mare",
  generator: "next.js",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.jpg", type: "image/png", sizes: "32x32" },
    ],
    apple: "/apple-icon.jpg",
    shortcut: "/favicon.ico",
  },
  metadataBase: new URL("https://al22suite.com"),
  openGraph: {
    title: "AL 22 Suite & SPA LUXURY EXPERIENCE",
    description:
      "Experience authentic Italian hospitality at AL 22 Suite & SPA, a luxury bed & breakfast in the heart of Polignano a Mare",
    url: "https://al22suite.com",
    siteName: "AL 22 Suite & SPA",
    images: [
      {
        url: "/images/logo22.jpg",
        width: 1200,
        height: 630,
        alt: "AL 22 Suite & SPA",
      },
    ],
    locale: "it_IT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AL 22 Suite & SPA LUXURY EXPERIENCE",
    description:
      "Experience authentic Italian hospitality at AL 22 Suite & SPA, a luxury bed & breakfast in the heart of Polignano a Mare",
    images: ["/images/logo22.jpg"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID || "GTM-XXXXXXX"

  return (
    <html lang="it">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`,
          }}
        />
      </head>
      <body
        className={`font-sans ${GeistSans.variable} ${GeistMono.variable} ${playfairDisplay.variable} ${cinzel.variable}`}
      >
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <AuthProvider>
          <LanguageProvider>
            <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
            <CookieConsent />
            <WhatsAppButton />
          </LanguageProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}


