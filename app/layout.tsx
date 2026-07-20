import type { Metadata } from "next"
import { DM_Sans, Outfit, Space_Grotesk } from "next/font/google"
import { Providers } from "@/components/providers"
import "./globals.css"

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
})

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
})

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "700"],
})

export const metadata: Metadata = {
  // `||` not `??` — NEXT_PUBLIC_APP_URL may be set to empty string, which `??` lets through
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://glim.app"),
  title: "Glim — Asisten Bisnis WhatsApp",
  description: "Kelola Client, pesanan, dan pesan WhatsApp dalam satu tempat",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg",
  },
  // og:image comes from app/opengraph-image.tsx (PNG — WhatsApp/FB don't render SVG previews)
  openGraph: {
    title: "Glim — Asisten Bisnis WhatsApp",
    description: "Kelola Client, pesanan, dan pesan WhatsApp dalam satu tempat",
    siteName: "Glim",
    locale: "id_ID",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${outfit.variable} ${dmSans.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
