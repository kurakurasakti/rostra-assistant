"use client"

import { ThemeProvider } from "next-themes"
import { CookieConsent } from "@/components/privacy/cookie-consent"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <CookieConsent />
    </ThemeProvider>
  )
}
