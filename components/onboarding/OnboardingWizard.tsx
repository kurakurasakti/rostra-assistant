"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type WizardStep = {
  title: string
  description: string
  cta?: { label: string; href: string }
}

const STEPS: WizardStep[] = [
  {
    title: "Selamat datang di Glim 👋",
    description:
      "Glim membantu kamu membalas chat WhatsApp pelanggan secara otomatis dengan AI, mengelola client, dan melacak pesanan — semua dalam satu tempat. Yuk siapkan dalam 5 langkah singkat.",
  },
  {
    title: "1. Hubungkan WhatsApp",
    description:
      "Scan QR untuk menghubungkan nomor WhatsApp bisnismu. Setelah terhubung, semua pesan masuk otomatis muncul di inbox Glim.",
    cta: { label: "Buka Pengaturan WhatsApp", href: "/settings?tab=whatsapp" },
  },
  {
    title: "2. Ajari AI gaya chat kamu",
    description:
      "Upload contoh percakapan WhatsApp supaya AI membalas dengan gaya bahasa yang sama seperti kamu — bukan bahasa robot.",
    cta: { label: "Atur Gaya Chat", href: "/settings?tab=profile" },
  },
  {
    title: "3. Isi pengetahuan bisnis",
    description:
      "Ceritakan produk, harga, jam operasional, dan cara pemesananmu. AI memakai ini untuk menjawab pertanyaan pelanggan dengan akurat.",
    cta: { label: "Isi Pengetahuan Bisnis", href: "/settings?tab=business" },
  },
  {
    title: "4. Tambah client pertama",
    description:
      "Simpan data pelanggan supaya Glim bisa mengenali siapa yang chat dan menghubungkan pesan ke pesanannya.",
    cta: { label: "Buka Halaman Client", href: "/clients" },
  },
  {
    title: "5. Buat pesanan pertama",
    description:
      "Catat pesanan di halaman detail client — lengkap dengan tahap pembayaran dan pengingat otomatis ke pelanggan.",
    cta: { label: "Buka Halaman Client", href: "/clients" },
  },
]

export const OPEN_WIZARD_EVENT = "glim:open-wizard"

export function OnboardingWizard({ initialOpen }: { initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen)
  const [step, setStep] = useState(0)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const handleOpen = () => {
      setStep(0)
      setOpen(true)
    }
    window.addEventListener(OPEN_WIZARD_EVENT, handleOpen)
    return () => window.removeEventListener(OPEN_WIZARD_EVENT, handleOpen)
  }, [])

  async function markSeen() {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    // Upsert: profile row may not exist yet right after signup
    await supabase.from("profiles").upsert(
      { id: user.id, onboarding_wizard_seen_at: new Date().toISOString() },
      { onConflict: "id" }
    )
  }

  function handleClose() {
    setOpen(false)
    void markSeen()
  }

  function handleCta(href: string) {
    setOpen(false)
    void markSeen()
    if (pathname === "/settings" && href.startsWith("/settings")) {
      // SettingsAnchorNav only scrolls on mount — scroll manually when already on /settings
      const tab = new URL(href, window.location.origin).searchParams.get("tab")
      router.replace(href)
      requestAnimationFrame(() => {
        if (tab) document.getElementById(tab)?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
    } else {
      router.push(href)
    }
  }

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent data-testid="onboarding-wizard" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{current.title}</DialogTitle>
          <DialogDescription>{current.description}</DialogDescription>
        </DialogHeader>

        {current.cta && (
          <Button
            variant="outline"
            className="w-full justify-between"
            data-testid="wizard-cta"
            onClick={() => handleCta(current.cta!.href)}
          >
            {current.cta.label}
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Langkah ${i + 1}`}
                onClick={() => setStep(i)}
                className={cn(
                  "h-2 w-2 rounded-full transition-colors",
                  i === step ? "bg-primary" : "bg-muted hover:bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!isLast && (
              <Button variant="ghost" size="sm" data-testid="wizard-skip" onClick={handleClose}>
                Lewati
              </Button>
            )}
            <Button
              size="sm"
              data-testid="wizard-next"
              onClick={() => (isLast ? handleClose() : setStep(step + 1))}
            >
              {isLast ? "Selesai" : "Lanjut"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
