"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Loader2, RotateCcw, Save } from "lucide-react"
import type { MessageTemplate } from "@/types"

type TemplateKey = "konfirmasi_pesanan" | "pengingat_pembayaran" | "pengingat_janji_temu"

const CONFIGS: Record<TemplateKey, {
  name: string
  vars: string[]
  defaultBody: string
  sampleVars: Record<string, string>
}> = {
  konfirmasi_pesanan: {
    name: "Konfirmasi Pesanan",
    vars: ["nama_klien", "nama_bisnis", "deskripsi_pesanan", "total_harga"],
    defaultBody: `Halo {{nama_klien}} 👋 Terima kasih sudah memesan di {{nama_bisnis}}! 🎉

Pesanan: {{deskripsi_pesanan}}
Total: Rp {{total_harga}}

Kami akan segera follow up untuk detail selanjutnya ya 🙏`,
    sampleVars: { nama_klien: "Kak Dewi", nama_bisnis: "Butik Melati", deskripsi_pesanan: "Gaun kebaya custom", total_harga: "1.500.000" },
  },
  pengingat_pembayaran: {
    name: "Pengingat Pembayaran",
    vars: ["nama_klien", "nama_bisnis", "nama_tahap", "jumlah", "jatuh_tempo", "deskripsi_pesanan"],
    defaultBody: `Halo {{nama_klien}} 👋

Mengingatkan pembayaran *{{nama_tahap}}* sebesar Rp {{jumlah}} jatuh tempo pada {{jatuh_tempo}}.

Mohon segera lakukan pembayaran ya 🙏

— {{nama_bisnis}}`,
    sampleVars: { nama_klien: "Kak Dewi", nama_bisnis: "Butik Melati", nama_tahap: "DP 50%", jumlah: "750.000", jatuh_tempo: "15 Jun 2025", deskripsi_pesanan: "Gaun kebaya custom" },
  },
  pengingat_janji_temu: {
    name: "Pengingat Janji Temu",
    vars: ["nama_klien", "nama_bisnis", "judul_janji", "waktu_janji", "lokasi_janji"],
    defaultBody: `Halo {{nama_klien}} 😊

Mengingatkan jadwal *{{judul_janji}}* pada:
📅 {{waktu_janji}}
📍 {{lokasi_janji}}

Sampai jumpa! — {{nama_bisnis}}`,
    sampleVars: { nama_klien: "Kak Dewi", nama_bisnis: "Butik Melati", judul_janji: "Fitting pertama", waktu_janji: "15 Jun 2025, 10:00 WIB", lokasi_janji: "Jl. Melati No. 5" },
  },
}

function preview(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`)
}

function TemplateCard({ tpl, config, onSaved }: {
  tpl: MessageTemplate
  config: typeof CONFIGS[TemplateKey]
  onSaved: (id: string, body: string) => void
}) {
  const [body, setBody] = useState(tpl.body)
  const [saving, setSaving] = useState(false)
  const dirty = body !== tpl.body

  async function save() {
    if (!body.trim()) { toast.error("Body template tidak boleh kosong."); return }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("message_templates")
      .update({ body: body.trim() })
      .eq("id", tpl.id)
    if (error) toast.error("Gagal menyimpan template.")
    else { toast.success(`Template "${config.name}" disimpan.`); onSaved(tpl.id, body.trim()) }
    setSaving(false)
  }

  function reset() {
    setBody(config.defaultBody)
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{config.name}</span>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="w-3 h-3" /> Reset default
        </button>
      </div>

      <Textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        rows={5}
        className="resize-none text-xs font-mono"
        placeholder="Isi template pesan..."
      />

      {/* Variable chips */}
      <div className="flex flex-wrap gap-1.5">
        {config.vars.map(v => (
          <button
            key={v}
            type="button"
            onClick={() => setBody(b => b + `{{${v}}}`)}
            className="text-[10px] bg-muted hover:bg-accent px-1.5 py-0.5 rounded font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            {`{{${v}}}`}
          </button>
        ))}
        <span className="text-[10px] text-muted-foreground self-center ml-1">← klik untuk sisipkan</span>
      </div>

      {/* Preview */}
      <div className="rounded bg-muted/40 border border-border p-3 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
        <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Preview (data dummy):</p>
        {preview(body, config.sampleVars)}
      </div>

      <div className="flex justify-end pt-1">
        <Button size="sm" className="h-7 text-xs gap-1.5" onClick={save} disabled={saving || !dirty}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          {saving ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
    </div>
  )
}

export default function TemplatesSection() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from("message_templates")
        .select("*")
        .eq("user_id", user.id)
        .in("type", ["konfirmasi_pesanan", "pengingat_pembayaran", "pengingat_janji_temu"])
        .order("created_at")
      setTemplates(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  function handleSaved(id: string, body: string) {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, body } : t))
  }

  if (loading) return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-48 rounded-lg border border-border bg-muted/20 animate-pulse" />
      ))}
    </div>
  )

  if (templates.length === 0) return (
    <p className="text-sm text-muted-foreground py-4">Template belum tersedia. Pastikan database sudah disetup dengan benar.</p>
  )

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display font-semibold text-sm">Template Pesan Otomatis</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Edit isi pesan reminder yang dikirim otomatis ke Client.</p>
      </div>
      {templates.map(tpl => {
        const config = CONFIGS[tpl.type as TemplateKey]
        if (!config) return null
        return <TemplateCard key={tpl.id} tpl={tpl} config={config} onSaved={handleSaved} />
      })}
    </div>
  )
}
