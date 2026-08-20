"use client"

import { Loader2, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { IS_BETA, LEVEL2_THRESHOLD, LEVEL3_THRESHOLD } from "@/lib/config"
import { createClient } from "@/lib/supabase/client"

export default function AIRulesSection({
  initialKeywords,
  initialLevel,
  feedbackCount,
  hasAnalyzedVoice = false,
  onSave,
}: {
  initialKeywords: string[]
  initialLevel: number
  feedbackCount: number
  hasAnalyzedVoice?: boolean
  onSave: (keywords: string[]) => void
}) {
  const [escalationKeywords, setEscalationKeywords] = useState<string[]>(initialKeywords)
  const [keywordInput, setKeywordInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [activatingLevel, setActivatingLevel] = useState<number | null>(null)
  const [currentLevel, setCurrentLevel] = useState(initialLevel)

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from("profiles")
      .update({ escalation_keywords: escalationKeywords, updated_at: new Date().toISOString() })
      .eq("id", user.id)

    if (error) {
      toast.error("Gagal menyimpan aturan.")
    } else {
      onSave(escalationKeywords)
      toast.success("Aturan AI berhasil disimpan.")
    }
    setSaving(false)
  }

  async function handleActivateLevel(level: number) {
    setActivatingLevel(level)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setActivatingLevel(null)
      return
    }

    const { error } = await supabase
      .from("profiles")
      .update({ auto_reply_level: level, updated_at: new Date().toISOString() })
      .eq("id", user.id)

    if (error) {
      toast.error("Gagal mengaktifkan level.")
    } else {
      setCurrentLevel(level)
      toast.success(`Level ${level} berhasil diaktifkan.`)
    }
    setActivatingLevel(null)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-semibold text-sm">Aturan AI & Eskalasi</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Kontrol pesan mana yang AI boleh draft dan kapan harus eskalasi.
        </p>
      </div>

      {/* Escalation keywords */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Kata Pemicu Eskalasi</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() =>
              setEscalationKeywords([
                "kecewa",
                "cancel",
                "batal",
                "refund",
                "minta balik",
                "bohong",
                "tipu",
                "komplain",
                "tidak sesuai",
                "mengecewakan",
              ])
            }
          >
            Reset ke Default
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Jika pesan mengandung kata berikut → selalu eskalasi ke kamu:
        </p>
        <div className="flex flex-wrap gap-2">
          {escalationKeywords.map((keyword, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs"
            >
              {keyword}
              <button
                type="button"
                onClick={() =>
                  setEscalationKeywords(escalationKeywords.filter((_, i) => i !== idx))
                }
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            placeholder="Ketik kata pemicu baru..."
            className="h-9 text-xs flex-1"
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 text-xs px-3"
            onClick={() => {
              if (keywordInput.trim()) {
                if (!escalationKeywords.includes(keywordInput.trim())) {
                  setEscalationKeywords([...escalationKeywords, keywordInput.trim()])
                  setKeywordInput("")
                } else toast.error("Kata ini sudah ada.")
              }
            }}
          >
            Tambah
          </Button>
        </div>
      </div>

      {/* Auto-reply level info */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Mode Balasan AI</Label>
          {IS_BETA && (
            <span className="text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded font-medium">
              Beta
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Mode saat ini: <span className="font-medium">Level {currentLevel}</span>
        </p>

        <div className="space-y-3">
          {[
            {
              level: 1,
              label: "Draft Mode",
              desc: "AI draft semua pesan, kamu approve sebelum kirim. Cocok untuk memastikan kualitas AI dulu.",
              threshold: 0,
            },
            {
              level: 2,
              label: "Semi-Auto",
              desc: "Pesan rutin auto-kirim dalam 5 menit (bisa dibatalkan). Pesan sensitif tetap perlu approve.",
              threshold: LEVEL2_THRESHOLD,
            },
            {
              level: 3,
              label: "Full Auto",
              desc: "AI balas otomatis semua pesan rutin. Hanya pesan sensitif yang masuk inbox untuk review.",
              threshold: LEVEL3_THRESHOLD,
            },
          ].map((item) => {
            const isActive = currentLevel === item.level
            const unlocked =
              item.level === 2
                ? feedbackCount >= item.threshold || hasAnalyzedVoice
                : feedbackCount >= item.threshold
            const locked = !unlocked
            const canActivate = unlocked && !isActive
            const progress =
              item.threshold > 0 ? Math.min((feedbackCount / item.threshold) * 100, 100) : 100
            return (
              <div
                key={item.level}
                className={`rounded-lg border ${isActive ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20"} p-3 space-y-2 ${locked ? "opacity-60" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">
                    ● Level {item.level} — {item.label}
                    {isActive && <span className="text-emerald-600 ml-2">✓ AKTIF SEKARANG</span>}
                    {locked && (
                      <span className="text-amber-600 ml-2">🔒 Butuh {item.threshold} koreksi</span>
                    )}
                  </p>
                  {canActivate && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] px-2 border-primary/40 text-primary hover:bg-primary/10"
                      disabled={activatingLevel === item.level}
                      onClick={() => handleActivateLevel(item.level)}
                    >
                      {activatingLevel === item.level ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        "Aktifkan"
                      )}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
                {item.threshold > 0 && !unlocked && (
                  <>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="bg-accent h-1.5 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Kamu sudah melakukan {feedbackCount}/{item.threshold} koreksi.
                    </p>
                  </>
                )}
                {item.level === 2 && hasAnalyzedVoice && (
                  <p className="text-xs text-emerald-600 font-medium">
                    ✨ Terbuka otomatis karena kamu sudah menganalisa chat WhatsApp!
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex justify-end pt-1 border-t border-border">
        <Button onClick={handleSave} disabled={saving} className="font-display font-medium">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Menyimpan...
            </>
          ) : (
            "Simpan Aturan"
          )}
        </Button>
      </div>
    </div>
  )
}
