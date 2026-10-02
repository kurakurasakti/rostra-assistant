"use client"

import { Check, Cookie, Lock, ShieldCheck, SlidersHorizontal, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

export interface CookiePreferences {
  essential: true // Always true
  functional: boolean
  updatedAt: string
  version: string
}

const STORAGE_KEY = "glim_cookie_consent_v1"
const CURRENT_VERSION = "1.0"
export const OPEN_COOKIE_SETTINGS_EVENT = "glim-open-cookie-settings"

export function openCookiePreferences() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_COOKIE_SETTINGS_EVENT))
  }
}

export function CookieConsent() {
  const [mounted, setMounted] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [functionalCookies, setFunctionalCookies] = useState(true)

  useEffect(() => {
    setMounted(true)

    // Check existing stored preferences
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: CookiePreferences = JSON.parse(stored)
        setFunctionalCookies(parsed.functional ?? true)
      } else {
        // Show banner after brief delay for smooth entrance
        const timer = setTimeout(() => setShowBanner(true), 1200)
        return () => clearTimeout(timer)
      }
    } catch {
      setShowBanner(true)
    }

    // Global listener for reopening settings from footer / anywhere
    function handleOpenEvent() {
      setShowBanner(false)
      setShowModal(true)
    }

    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, handleOpenEvent)
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, handleOpenEvent)
  }, [])

  function savePreferences(functional: boolean) {
    const prefs: CookiePreferences = {
      essential: true,
      functional,
      updatedAt: new Date().toISOString(),
      version: CURRENT_VERSION,
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    } catch (e) {
      console.error("[CookieConsent] Failed to save cookie preferences:", e)
    }

    setFunctionalCookies(functional)
    setShowBanner(false)
    setShowModal(false)
  }

  function handleAcceptAll() {
    savePreferences(true)
  }

  function handleAcceptEssentialOnly() {
    savePreferences(false)
  }

  if (!mounted) return null

  return (
    <>
      {/* ── Floating Consent Banner ── */}
      {showBanner && !showModal && (
        <aside
          role="dialog"
          aria-live="polite"
          aria-label="Pemberitahuan Cookie & Privasi"
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-fade-up"
        >
          <div className="rounded-2xl border border-border/80 bg-background/95 p-4 sm:p-5 shadow-xl backdrop-blur-md dark:bg-card">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Cookie className="w-5 h-5" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="font-display font-bold text-sm text-foreground">
                  Privasi & Penggunaan Cookie
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Kami menggunakan cookie esensial dan preferensi fungsional untuk memastikan akun
                  kamu tetap aman dan nyaman digunakan.{" "}
                  <strong>Kami tidak menggunakan cookie pelacak iklan pihak ketiga.</strong>
                </p>
                <div className="pt-0.5 flex flex-wrap gap-2 text-[11px] text-primary">
                  <Link href="/cookies-policy" className="hover:underline font-medium">
                    Kebijakan Cookie
                  </Link>
                  <span className="text-muted-foreground/40">·</span>
                  <Link href="/privacy-policy" className="hover:underline font-medium">
                    Kebijakan Privasi
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowBanner(false)
                  setShowModal(true)
                }}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 font-medium transition-colors cursor-pointer py-1"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Atur Pilihan
              </button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAcceptEssentialOnly}
                  className="h-8 text-xs rounded-xl"
                >
                  Hanya Esensial
                </Button>
                <Button
                  size="sm"
                  onClick={handleAcceptAll}
                  className="h-8 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                >
                  Terima Semua
                </Button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* ── Detailed Preferences Modal ── */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
        >
          <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-5 animate-scale-in dark:bg-card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2
                    id="cookie-modal-title"
                    className="font-display font-bold text-base text-foreground"
                  >
                    Preferensi Cookie & Privasi
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Atur bagaimana Glim menggunakan cookie dan teknologi penyimpanan pada perangkat
                    kamu.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground rounded-lg p-1 transition-colors"
                aria-label="Tutup pengaturan cookie"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 divide-y divide-border/60 max-h-[60vh] overflow-y-auto pr-1">
              {/* Category 1: Strictly Necessary */}
              <div className="pt-2 first:pt-0 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-foreground">
                      Cookie Sangat Penting (Esensial)
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Wajib Aktif
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Diperlukan untuk autentikasi sesi login, keamanan anti-bot/honeypot, dan
                  integritas enkripsi data. Tanpa kategori ini, platform tidak dapat beroperasi.
                </p>
              </div>

              {/* Category 2: Functional / Preferences */}
              <div className="pt-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Cookie className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-xs font-bold text-foreground">
                      Cookie Preferensi & Fungsional
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={functionalCookies}
                      onChange={(e) => setFunctionalCookies(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Mengingat preferensi tampilan (tema mode gelap atau terang) dan kustomisasi tata
                  letak antarmuka pengguna agar kamu tidak perlu mengaturnya kembali setiap kali
                  berkunjung.
                </p>
              </div>

              {/* Notice: No Advertising */}
              <div className="pt-3">
                <div className="p-3 rounded-xl bg-muted/40 border border-border/80 text-[11px] text-muted-foreground leading-relaxed">
                  <p className="font-semibold text-foreground mb-0.5">
                    Penegasan Tanpa Iklan Pihak Ketiga:
                  </p>
                  Glim tidak bekerja sama dengan broker data atau platform periklanan pihak ketiga.
                  Tidak ada cookie pelacak iklan atau analitik lintas domain yang diinjeksikan ke
                  peramban kamu.
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-border">
              <Link
                href="/cookies-policy"
                target="_blank"
                className="text-xs text-primary font-medium hover:underline order-2 sm:order-1"
              >
                Baca Kebijakan Cookie Lengkap →
              </Link>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end order-1 sm:order-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => savePreferences(false)}
                  className="text-xs h-8 rounded-xl flex-1 sm:flex-none"
                >
                  Hanya Esensial
                </Button>
                <Button
                  size="sm"
                  onClick={() => savePreferences(functionalCookies)}
                  className="text-xs font-semibold h-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground flex-1 sm:flex-none"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Simpan Pilihan
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
