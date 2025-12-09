import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "EcoScan - Sistem Analisis Sampah Berbasis AI",
  description:
    "Identifikasi jenis sampah plastik, pahami bahaya mikroplastik, dan temukan alternatif ramah lingkungan dengan teknologi AI.",
  generator: "v0.app",
  keywords: ["eco", "scan", "sampah", "plastik", "AI", "lingkungan", "daur ulang", "mikroplastik"],
  authors: [{ name: "EcoScan Team" }],
  icons: {
    
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2F9E44" },
    { media: "(prefers-color-scheme: dark)", color: "#3BD06D" },
  ],
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
