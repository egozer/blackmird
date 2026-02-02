import type React from "react"
import type { Metadata } from "next"
import { Poppins, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import Script from "next/script"
import "./globals.css"

const _poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
})
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Blackmird: Just Build",
  description: "AI-powered HTML generator - Create apps and websites by chatting with AI",
  generator: "v0.app",
  icons: {
    icon: "http://d1ujqdpfgkvqfi.cloudfront.net/favicon-generator/htdocs/favicons/2015-02-09/34caf36c3ed3869c21bd26ba581692f8.ico",
  },
  verification: {
    google: "pKbxe1F2T-NbpxHUvQmS7ln56Re9XqWMzT0Hdo9hDdg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1183921068852375"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
