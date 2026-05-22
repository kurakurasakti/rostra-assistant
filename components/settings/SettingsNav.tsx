"use client"

import { cn } from "@/lib/utils"
import { Building2, QrCode, BrainCircuit, Bot } from "lucide-react"

const tabs = [
  { id: "profile", label: "Profil Bisnis", icon: Building2 },
  { id: "whatsapp", label: "Koneksi WhatsApp", icon: QrCode },
  { id: "business", label: "Pengetahuan Bisnis", icon: BrainCircuit },
  { id: "ai", label: "AI & Eskalasi", icon: Bot },
] as const

export type SettingsTab = (typeof tabs)[number]["id"]

export function SettingsNav({
  activeTab,
  onTabChange,
}: {
  activeTab: SettingsTab
  onTabChange: (tab: SettingsTab) => void
}) {
  return (
    <div className="flex gap-1 rounded-xl border border-border bg-card p-1 mb-6 overflow-x-auto">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-150",
            activeTab === id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <Icon className="w-4 h-4" />
          {label}
        </button>
      ))}
    </div>
  )
}
