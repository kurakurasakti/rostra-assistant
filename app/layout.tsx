import type { Metadata } from 'next'
import { Outfit, DM_Sans, Space_Grotesk } from 'next/font/google'
import { Providers } from '@/components/providers'
import './globals.css'

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
})

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
})

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  weight: ['500', '700'],
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://glim.app'),
  title: 'Glim — Asisten Bisnis WhatsApp',
  description: 'Kelola Client, pesanan, dan pesan WhatsApp dalam satu tempat',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.svg',
  },
  openGraph: {
    title: 'Glim — Asisten Bisnis WhatsApp',
    description: 'Kelola Client, pesanan, dan pesan WhatsApp dalam satu tempat',
    images: ['/og-image.svg'],
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
