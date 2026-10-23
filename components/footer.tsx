"use client"

import Link from "next/link"
import { openCookiePreferences } from "@/components/privacy/cookie-consent"

export function Footer() {
  const year = new Date().getFullYear()
  const company = process.env.NEXT_PUBLIC_COMPANY_NAME || "Glim"

  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <span>
            © {year} {company}. Hak Cipta Dilindungi Undang-Undang.
          </span>
          <nav className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs">
            <Link
              href="/terms"
              className="hover:text-gray-900 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Syarat &amp; Ketentuan
            </Link>
            <span className="text-gray-300">·</span>
            <Link
              href="/privacy-policy"
              className="hover:text-gray-900 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Kebijakan Privasi
            </Link>
            <span className="text-gray-300">·</span>
            <Link
              href="/cookies-policy"
              className="hover:text-gray-900 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Kebijakan Cookie
            </Link>
            <span className="text-gray-300">·</span>
            <button
              type="button"
              onClick={openCookiePreferences}
              className="text-gray-500 hover:text-gray-900 transition-colors underline-offset-2 hover:underline cursor-pointer"
            >
              Preferensi Cookie
            </button>
            <span className="text-gray-300">·</span>
            <Link
              href="/about"
              className="hover:text-gray-900 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Tentang Kami
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}
