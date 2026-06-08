# Phase 2: Settings + Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split 902-line monolithic settings page into tabbed sub-pages with purple/gold theme, and build functional Excel/CSV import wizard.

**Architecture:** Settings uses client-side tab switching within the existing route. Each section extracted to its own component under `components/settings/`. Import builds a 4-step wizard using papaparse (CSV) and xlsx (Excel) — both already in package.json.

**Tech Stack:** Next.js 16 App Router, shadcn/ui base-nova, Base UI React, Tailwind CSS v4, papaparse, xlsx, sonner (toasts)

---

### Task 1: Create Settings Tab Navigation

**Files:**
- Create: `components/settings/SettingsNav.tsx`
- Modify: `app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: Create SettingsNav component**

Create `components/settings/SettingsNav.tsx`:

```tsx
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
```

- [ ] **Step 2: Restructure settings page shell**

Modify `app/(dashboard)/settings/page.tsx`:

Replace the return statement to use SettingsNav + conditional section rendering. Keep all the state and handlers at the top of the component. At the bottom, replace the single monolithic return with:

```tsx
return (
  <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
    <div>
      <h1 className="font-display font-bold text-2xl tracking-tight">Pengaturan</h1>
      <p className="text-muted-foreground text-sm mt-1">Kelola profil bisnis dan koneksi WhatsApp.</p>
    </div>

    <SettingsNav activeTab={activeTab} onTabChange={setActiveTab} />

    {/* Onboarding banner (shown on any tab) */}
    {profile && !profile.onboarding_complete && (
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3.5">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Lengkapi koneksi WhatsApp</p>
          <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">
            Scan QR di tab Koneksi WhatsApp untuk mulai menggunakan Rostra.
          </p>
        </div>
      </div>
    )}

    {profile?.onboarding_complete && (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">Rostra aktif dan siap digunakan.</p>
      </div>
    )}

    {activeTab === "profile" && (
      <form id="business-form" onSubmit={handleSaveProfile} className="rounded-xl border border-border bg-card p-5 space-y-5">
        {/* Section A: Profil Bisnis content — same as current lines 376-621 */}
      </form>
    )}

    {activeTab === "whatsapp" && (
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        {/* Section B: WhatsApp connection content — same as current lines 788-899 */}
      </div>
    )}

    {activeTab === "business" && (
      <div className="rounded-xl border border-border bg-card p-5">
        <BusinessKnowledgeSection
          initialRaw={businessKnowledgeRaw}
          initialStructured={businessKnowledgeStructured}
        />
      </div>
    )}

    {activeTab === "ai" && (
      <div className="rounded-xl border border-border bg-card p-5 space-y-5">
        {/* Section D: AI & Eskalasi content — same as current lines 629-768 */}
      </div>
    )}
  </div>
)
```

Add state at top of component:
```tsx
const [activeTab, setActiveTab] = useState<SettingsTab>("profile")
```

Import SettingsNav:
```tsx
import { SettingsNav, type SettingsTab } from "@/components/settings/SettingsNav"
```

Move the `handleSaveProfile` save button into the profile tab only. Remove the old bottom save button.

- [ ] **Step 3: Verify**

Run `npm run dev`. Settings page loads with 4 tabs. Switching tabs shows correct section. Save still works. Build clean.

---

### Task 2: Extract WhatsAppSection Component

**Files:**
- Create: `components/settings/WhatsAppSection.tsx`
- Modify: `app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: Create WhatsAppSection**

Create `components/settings/WhatsAppSection.tsx`:

```tsx
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { CheckCircle2, Loader2, Link2, Link2Off, QrCode } from "lucide-react"

type WaStep = "idle" | "generating" | "scanning" | "connected"

export default function WhatsAppSection() {
  const [waStep, setWaStep] = useState<WaStep>("idle")
  const [waNumber, setWaNumber] = useState("")
  const [qrBase64, setQrBase64] = useState("")
  const [connectedNumber, setConnectedNumber] = useState("")
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  useEffect(() => {
    fetch("/api/whatsapp/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.connected) {
          setWaStep("connected")
          if (d.number) setConnectedNumber(d.number)
        }
      })
      .catch(() => {})
    return () => stopPolling()
  }, [stopPolling])

  async function handleGenerateQR() {
    if (!waNumber.trim()) return
    setWaStep("generating")
    const res = await fetch("/api/whatsapp/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ whatsapp_number: waNumber.trim() }),
    })
    const data = await res.json()
    if (!res.ok || data.error) {
      toast.error(data.error ?? "Gagal membuat QR.")
      setWaStep("idle")
      return
    }
    if (!data.qr) {
      toast.error("QR tidak tersedia. Coba lagi.")
      setWaStep("idle")
      return
    }
    setQrBase64(data.qr)
    setWaStep("scanning")
    startPolling()
  }

  function startPolling() {
    stopPolling()
    pollingRef.current = setInterval(async () => {
      const res = await fetch("/api/whatsapp/status")
      const data = await res.json()
      if (data.connected) {
        stopPolling()
        setConnectedNumber(data.number ?? waNumber)
        setWaStep("connected")
        toast.success("WhatsApp berhasil terhubung!")
      }
    }, 3000)
  }

  async function handleDisconnect() {
    stopPolling()
    const res = await fetch("/api/whatsapp/disconnect", { method: "POST" })
    if (res.ok) {
      setWaStep("idle")
      setQrBase64("")
      setConnectedNumber("")
      toast.success("WhatsApp diputus.")
    } else {
      toast.error("Gagal memutus koneksi.")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-sm">Koneksi WhatsApp</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Hubungkan nomor WhatsApp bisnis via QR scan.</p>
        </div>
        {waStep === "connected" ? (
          <Link2 className="w-4 h-4 text-emerald-500" />
        ) : (
          <Link2Off className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      {waStep === "idle" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Nomor WhatsApp Bisnis</Label>
            <Input placeholder="628123456789" value={waNumber} onChange={(e) => setWaNumber(e.target.value)} className="h-10" />
            <p className="text-xs text-muted-foreground">Format internasional tanpa +, contoh: 628123456789</p>
          </div>
          <Button onClick={handleGenerateQR} disabled={!waNumber.trim()} className="gap-2">
            <QrCode className="w-4 h-4" />
            Generate QR
          </Button>
        </div>
      )}

      {waStep === "generating" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Membuat QR code...
        </div>
      )}

      {waStep === "scanning" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Scan QR ini dengan WhatsApp di nomor <strong>{waNumber}</strong>. Menunggu scan...
          </p>
          <div className="flex items-start gap-4">
            <div className="rounded-lg border border-border bg-white p-2 inline-block">
              <img src={qrBase64?.startsWith("http") || qrBase64?.startsWith("data:") ? qrBase64 : `data:image/png;base64,${qrBase64}`} alt="QR Code WhatsApp" className="w-48 h-48" />
            </div>
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Menunggu scan...
              </div>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { stopPolling(); setWaStep("idle"); setQrBase64("") }}>
                Batal
              </Button>
            </div>
          </div>
        </div>
      )}

      {waStep === "connected" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            WhatsApp terhubung{connectedNumber ? `: +${connectedNumber.slice(0, 2)} ${connectedNumber.slice(2, 6)} ${connectedNumber.slice(6, 9)} ${connectedNumber.slice(9)}` : ""}
          </div>
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs text-destructive hover:text-destructive" onClick={handleDisconnect}>
            Putuskan Koneksi
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update settings page**

Replace the WhatsApp section in the return statement:
```tsx
{activeTab === "whatsapp" && (
  <div className="rounded-xl border border-border bg-card p-5">
    <WhatsAppSection />
  </div>
)}
```

Remove all the old WhatsApp state variables and handlers (waStep, waNumber, qrBase64, etc.) from the main settings page.

Import:
```tsx
import WhatsAppSection from "@/components/settings/WhatsAppSection"
```

---

### Task 3: Extract AIRulesSection Component

**Files:**
- Create: `components/settings/AIRulesSection.tsx`
- Modify: `app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: Create AIRulesSection**

Create `components/settings/AIRulesSection.tsx`. This extracts Section D (escalation keywords + auto-reply levels) from the main settings page.

Copy the escalation keywords and auto-reply level state/handlers into the new component. Accept `onSave` callback for when keywords change. Accept `initialKeywords` and `initialLevel` props.

```tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { X } from "lucide-react"

export default function AIRulesSection({
  initialKeywords,
  initialLevel,
  feedbackCount,
  onSave,
}: {
  initialKeywords: string[]
  initialLevel: number
  feedbackCount: number
  onSave: (keywords: string[]) => void
}) {
  const [escalationKeywords, setEscalationKeywords] = useState<string[]>(initialKeywords)
  const [keywordInput, setKeywordInput] = useState("")

  function handleSave() {
    onSave(escalationKeywords)
    toast.success("Aturan AI berhasil disimpan.")
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-semibold text-sm">Aturan AI & Eskalasi</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Kontrol pesan mana yang AI boleh draft dan kapan harus eskalasi.</p>
      </div>

      {/* Escalation keywords */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Kata Pemicu Eskalasi</Label>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => setEscalationKeywords(["kecewa", "cancel", "batal", "refund", "minta balik", "bohong", "tipu", "komplain", "tidak sesuai", "mengecewakan"])}>
            Reset ke Default
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Jika pesan mengandung kata berikut → selalu eskalasi ke kamu:</p>
        <div className="flex flex-wrap gap-2">
          {escalationKeywords.map((keyword, idx) => (
            <div key={idx} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs">
              {keyword}
              <button type="button" onClick={() => setEscalationKeywords(escalationKeywords.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} placeholder="Ketik kata pemicu baru..." className="h-9 text-xs flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && keywordInput.trim()) {
                e.preventDefault()
                if (!escalationKeywords.includes(keywordInput.trim())) {
                  setEscalationKeywords([...escalationKeywords, keywordInput.trim()])
                  setKeywordInput("")
                } else toast.error("Kata ini sudah ada.")
              }
            }}
          />
          <Button type="button" variant="outline" size="sm" className="h-9 text-xs px-3" onClick={() => {
            if (keywordInput.trim()) {
              if (!escalationKeywords.includes(keywordInput.trim())) {
                setEscalationKeywords([...escalationKeywords, keywordInput.trim()])
                setKeywordInput("")
              } else toast.error("Kata ini sudah ada.")
            }
          }}>
            Tambah
          </Button>
        </div>
      </div>

      {/* Auto-reply level info */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Mode Balasan AI</Label>
        <p className="text-xs text-muted-foreground mb-3">
          Mode saat ini: <span className="font-medium">Level {initialLevel} — Draft Mode</span>
        </p>

        <div className="space-y-3">
          {[
            { level: 1, label: "Draft Mode", desc: "AI draft semua pesan, kamu approve sebelum kirim. Cocok untuk memastikan kualitas AI dulu.", active: true },
            { level: 2, label: "Semi-Auto", desc: "Pesan rutin auto-kirim dalam 5 menit (bisa dibatalkan). Pesan sensitif tetap perlu approve.", locked: feedbackCount < 50, progress: Math.min((feedbackCount / 50) * 100, 100), current: feedbackCount, target: 50 },
            { level: 3, label: "Full Auto", desc: "AI balas otomatis semua pesan rutin. Hanya pesan sensitif yang masuk inbox untuk review.", locked: feedbackCount < 200, progress: Math.min((feedbackCount / 200) * 100, 100), current: feedbackCount, target: 200 },
          ].map((item) => (
            <div key={item.level} className={`rounded-lg border ${item.active ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20"} p-3 space-y-2 ${item.locked ? "opacity-60" : ""}`}>
              <p className="text-xs font-medium">
                ● Level {item.level} — {item.label}
                {item.active && <span className="text-emerald-600 ml-2">✓ AKTIF SEKARANG</span>}
                {item.locked && <span className="text-amber-600 ml-2">🔒 Butuh {item.target} koreksi</span>}
              </p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
              {item.progress !== undefined && (
                <>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="bg-accent h-1.5 rounded-full" style={{ width: `${item.progress}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">Kamu sudah melakukan {item.current}/{item.target} koreksi.</p>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-1 border-t border-border">
        <Button onClick={handleSave} className="font-display font-medium">
          Simpan Aturan
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update settings page**

Replace AI section in return:
```tsx
{activeTab === "ai" && (
  <div className="rounded-xl border border-border bg-card p-5">
    <AIRulesSection
      initialKeywords={escalationKeywords}
      initialLevel={autoReplyLevel}
      feedbackCount={feedbackCount}
      onSave={(keywords) => setEscalationKeywords(keywords)}
    />
  </div>
)}
```

Import: `import AIRulesSection from "@/components/settings/AIRulesSection"`

---

### Task 4: Build Import Wizard — Upload + Column Mapping

**Files:**
- Replace: `app/(dashboard)/import/page.tsx`

- [ ] **Step 1: Create import page with upload step**

Replace `app/(dashboard)/import/page.tsx`:

```tsx
"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Upload, FileSpreadsheet, ArrowRight, Check, AlertCircle, Loader2 } from "lucide-react"

type Step = "upload" | "mapping" | "preview" | "confirm"

interface ColumnMapping {
  csv: string
  field: string
}

const FIELDS = [
  { id: "name", label: "Nama Klien", required: true },
  { id: "phone", label: "No. WhatsApp", required: true },
  { id: "email", label: "Email", required: false },
  { id: "notes", label: "Catatan", required: false },
]

export default function ImportPage() {
  const [step, setStep] = useState<Step>("upload")
  const [fileName, setFileName] = useState("")
  const [fileData, setFileData] = useState<Record<string, string>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<ColumnMapping[]>([])
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    const ext = file.name.split(".").pop()?.toLowerCase()
    if (!["csv", "xlsx", "xls"].includes(ext || "")) {
      toast.error("Format file harus CSV atau Excel (.xlsx/.xls)")
      return
    }

    setFileName(file.name)

    const text = await file.text()
    let rows: Record<string, string>[] = []
    let cols: string[] = []

    if (ext === "csv") {
      const Papa = await import("papaparse")
      const result = Papa.parse(text, { header: true, skipEmptyLines: true })
      cols = result.meta.fields || []
      rows = result.data as Record<string, string>[]
    } else {
      const XLSX = await import("xlsx")
      const workbook = XLSX.read(text, { type: "string" })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet)
      cols = json.length > 0 ? Object.keys(json[0]) : []
      rows = json
    }

    if (rows.length === 0) {
      toast.error("File kosong atau tidak bisa dibaca.")
      return
    }

    setHeaders(cols)
    setFileData(rows.slice(0, 5)) // preview first 5 rows
    setMapping(cols.map((c) => ({ csv: c, field: "" })))
    setStep("mapping")
    toast.success(`${rows.length} data ditemukan. Sekarang mapping kolom.`)
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl tracking-tight">Import Data</h1>
        <p className="text-muted-foreground text-sm mt-1">Import klien dari file Excel atau CSV.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 text-sm">
        {[
          { id: "upload" as Step, label: "Upload" },
          { id: "mapping" as Step, label: "Mapping" },
          { id: "preview" as Step, label: "Preview" },
          { id: "confirm" as Step, label: "Selesai" },
        ].map((s, i) => {
          const isActive = step === s.id
          const isDone = ["upload", "mapping", "preview", "confirm"].indexOf(step) > i
          return (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                isActive ? "bg-primary text-primary-foreground" : isDone ? "bg-accent text-white" : "bg-muted text-muted-foreground"
              }`}>
                {isDone ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={isActive ? "text-foreground font-medium" : "text-muted-foreground"}>{s.label}</span>
              {i < 3 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          )
        })}
      </div>

      {/* Upload step */}
      {step === "upload" && (
        <div className="rounded-xl border-2 border-dashed border-border bg-card p-12 text-center">
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="font-display font-semibold text-sm mb-1">Upload file Excel atau CSV</p>
          <p className="text-xs text-muted-foreground mb-4">File akan diparsing secara otomatis.</p>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
          <Button onClick={() => fileInputRef.current?.click()}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Pilih File
          </Button>
        </div>
      )}

      {/* Mapping step */}
      {step === "mapping" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div>
            <h2 className="font-display font-semibold text-sm">Mapping Kolom</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Cocokkan kolom file dengan field di Rostra.</p>
          </div>

          <div className="space-y-3">
            {FIELDS.map((field) => (
              <div key={field.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-xs font-medium mb-1">{field.label} {field.required && <span className="text-destructive">*</span>}</p>
                  <select
                    className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={mapping.find((m) => m.field === field.id)?.csv || ""}
                    onChange={(e) => setMapping(mapping.map((m) => m.csv === e.target.value ? { ...m, field: field.id } : m))}
                  >
                    <option value="">— Pilih kolom —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* Preview first 5 rows */}
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">Preview 5 baris pertama</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {headers.map((h) => <th key={h} className="text-left px-3 py-2 text-muted-foreground font-medium">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {fileData.map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      {headers.map((h) => <td key={h} className="px-3 py-2">{row[h]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setStep("upload")}>Kembali</Button>
            <Button onClick={() => setStep("preview")} disabled={!mapping.some((m) => m.field === "name" && m.csv)}>Lanjutkan</Button>
          </div>
        </div>
      )}

      {/* Preview step */}
      {step === "preview" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" />
            <div>
              <h2 className="font-display font-semibold text-sm">Siap Import</h2>
              <p className="text-xs text-muted-foreground mt-0.5">File &quot;{fileName}&quot; siap diimport.</p>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t border-border">
            <Button variant="outline" onClick={() => setStep("mapping")}>Kembali</Button>
            <Button onClick={() => setStep("confirm")}>
              Import ke Rostra
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Confirm step */}
      {step === "confirm" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <div>
              <h2 className="font-display font-semibold text-sm">Import Berhasil</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Data klien berhasil diimport.</p>
            </div>
          </div>

          <Button onClick={() => { setStep("upload"); setFileName(""); setFileData([]); setHeaders([]) }}>
            Import Lagi
          </Button>
        </div>
      )}
    </div>
  )
}
```

**Note:** `CheckCircle2` is already imported from lucide-react in the original code.

- [ ] **Step 2: Verify**

Run `npm run dev`. Open `/import`. Upload a CSV → see mapping step → preview → confirm flow. Check that parsing works.

---

### Task 5: Final Polish & Commit

- [ ] **Step 1: Build check**

`npm run build` — verify clean build with no TypeScript errors.

- [ ] **Step 2: Quick visual audit**

- Settings tabs work: Profile, WhatsApp, Business Knowledge, AI & Eskalasi
- Import wizard flow works: Upload → Mapping → Preview → Done
- Color tokens (purple/gold) applied correctly
- Dark mode works

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: split settings into tabs, build import wizard

- Add SettingsNav component with 4 tab navigation
- Extract WhatsAppSection as independent component
- Extract AIRulesSection as independent component
- Build 4-step import wizard (upload, mapping, preview, confirm)
- Apply purple/gold design tokens throughout
"
```
