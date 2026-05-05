'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle2, Loader2, Wifi } from 'lucide-react'
import type { Profile } from '@/types'

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [businessName, setBusinessName] = useState('')
  const [brandVoice, setBrandVoice] = useState('')
  const [fonnteToken, setFonnteToken] = useState('')
  const [fonnteDevice, setFonnteDevice] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
        setBusinessName(data.business_name ?? '')
        setBrandVoice(data.brand_voice ?? '')
        setFonnteToken(data.fonnte_token ?? '')
        setFonnteDevice(data.fonnte_device_number ?? '')
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const onboarding_complete = !!(fonnteToken.trim() && fonnteDevice.trim() && businessName.trim())

    const { error } = await supabase
      .from('profiles')
      .update({
        business_name: businessName.trim(),
        brand_voice: brandVoice.trim(),
        fonnte_token: fonnteToken.trim() || null,
        fonnte_device_number: fonnteDevice.trim() || null,
        onboarding_complete,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      toast.error('Gagal menyimpan pengaturan. Coba lagi.')
    } else {
      setProfile(prev => prev ? { ...prev, onboarding_complete } : null)
      toast.success('Pengaturan berhasil disimpan.')
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl tracking-tight">Pengaturan</h1>
        <p className="text-muted-foreground text-sm mt-1">Kelola profil bisnis dan koneksi WhatsApp kamu.</p>
      </div>

      {/* Onboarding banner */}
      {profile && !profile.onboarding_complete && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3.5 mb-6">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Lengkapi koneksi WhatsApp kamu</p>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">
              Isi Fonnte Token dan Nomor Device di bawah untuk mulai menggunakan Rostra sepenuhnya.
            </p>
          </div>
        </div>
      )}

      {profile?.onboarding_complete && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 mb-6">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
            Rostra sudah terhubung dan siap digunakan.
          </p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section A: Profil Bisnis */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div>
            <h2 className="font-display font-semibold text-sm">Profil Bisnis</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Informasi dasar tentang bisnis kamu.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="businessName" className="text-sm font-medium">Nama Bisnis</Label>
            <Input
              id="businessName"
              type="text"
              placeholder="Contoh: Studio Foto Melati"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              required
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="brandVoice" className="text-sm font-medium">
              Gaya Komunikasi{' '}
              <span className="text-muted-foreground font-normal">(opsional)</span>
            </Label>
            <Textarea
              id="brandVoice"
              placeholder="Contoh: Ramah, hangat, dan profesional. Gunakan sapaan 'Kak' untuk pelanggan."
              value={brandVoice}
              onChange={e => setBrandVoice(e.target.value)}
              rows={3}
              className="resize-none text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Digunakan AI untuk membuat balasan pesan yang sesuai dengan karakter bisnis kamu.
            </p>
          </div>
        </div>

        {/* Section B: Koneksi WhatsApp */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-semibold text-sm">Koneksi WhatsApp</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Hubungkan nomor WhatsApp bisnis kamu via{' '}
                <a
                  href="https://fonnte.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Fonnte
                </a>.
              </p>
            </div>
            <Wifi className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fonnteToken" className="text-sm font-medium">Fonnte Token</Label>
            <Input
              id="fonnteToken"
              type="password"
              placeholder="Token API dari dashboard Fonnte"
              value={fonnteToken}
              onChange={e => setFonnteToken(e.target.value)}
              className="h-10 font-mono text-sm"
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fonnteDevice" className="text-sm font-medium">Nomor WhatsApp</Label>
            <Input
              id="fonnteDevice"
              type="text"
              placeholder="Contoh: 6281234567890"
              value={fonnteDevice}
              onChange={e => setFonnteDevice(e.target.value)}
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              Nomor device yang terdaftar di Fonnte, format internasional tanpa +.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" className="font-display font-medium" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              'Simpan Pengaturan'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
