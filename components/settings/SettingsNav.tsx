"use client"

import { useRef, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Building2, QrCode, BrainCircuit, Bot, FileSpreadsheet } from "lucide-react"

const tabs = [
  { id: "profile", label: "Profil Bisnis", icon: Building2 },
  { id: "whatsapp", label: "Koneksi WhatsApp", icon: QrCode },
  { id: "business", label: "Pengetahuan Bisnis", icon: BrainCircuit },
  { id: "ai", label: "AI & Eskalasi", icon: Bot },
  { id: "import", label: "Impor Data", icon: FileSpreadsheet },
] as const

export type SettingsTab = (typeof tabs)[number]["id"]

export function SettingsNav({
  activeTab,
  onTabChange,
}: {
  activeTab: SettingsTab
  onTabChange: (tab: SettingsTab) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const activeIdx = tabs.findIndex((t) => t.id === activeTab)
    const btn = buttonRefs.current[activeIdx]
    const container = containerRef.current
    if (!btn || !container) return

    const containerRect = container.getBoundingClientRect()
    const btnRect = btn.getBoundingClientRect()

    setPillStyle({
      left: btnRect.left - containerRect.left,
      width: btnRect.width,
    })
    setReady(true)
  }, [activeTab])

  return (
    <div
      ref={containerRef}
      className="relative flex gap-1 rounded-xl border border-border bg-card p-1 mb-6 overflow-x-auto scrollbar-thin"
    >
      {/* sliding pill */}
      {ready && (
        <span
          className="absolute top-1 bottom-1 rounded-lg bg-primary shadow-sm pointer-events-none"
          style={{
            left: pillStyle.left,
            width: pillStyle.width,
            transition: "left 200ms cubic-bezier(0.4, 0, 0.2, 1), width 200ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      )}

      {tabs.map(({ id, label, icon: Icon }, idx) => (
        <button
          key={id}
          ref={(el) => { buttonRefs.current[idx] = el }}
          onClick={() => onTabChange(id)}
          className={cn(
            "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-150 z-10",
            activeTab === id
              ? "text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="w-4 h-4" />
          {label}
        </button>
      ))}
    </div>
  )
}
