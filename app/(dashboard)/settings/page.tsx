'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  AlertTriangle, CheckCircle2, Loader2, Wifi, WifiOff,
  Upload, RefreshCcw, QrCode, Sparkles, MessageSquare,
} from 'lucide-react'
import type { Profile } from '@/types'

type WaStep = 'idle' | 'generating' | 'scanning' | 'connected'
type AnalyzeStep = 'idle' | 'uploading' | 'selecting' | 'analyzing' | 'preview'

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Section A state
  const [businessName, setBusinessName] = useState('')
  const [brandVoice, setBrandVoice] = useState('')

  // Brand voice analysis state
  const [analyzeStep, setAnalyzeStep] = useState<AnalyzeStep>('idle')
  const [fileContent, setFileContent] = useState('')
  const [chatSenders, setChatSenders] = useState<string[]>([])
  const [selectedSender, setSelectedSender] = useState('')
  const [brandVoicePreview, setBrandVoicePreview] = useState('')
  const [analyzeLoading, setAnalyzeLoading] = useState(false)

  // Draft test state
  const [testMessage, setTestMessage] = useState('')
  const [draftResult, setDraftResult] = useState('')
  const [draftLoading, setDraftLoading] = useState(false)

  // Section B: WA connection state
  const [waStep, setWaStep] = useState<WaStep>('idle')
  const [waNumber, setWaNumber] = useState('')
  const [qrBase64, setQrBase64] = useState('')
  const [connectedNumber, setConnectedNumber] = useState('')
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

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

        if (data.wa_connected) {
          setWaStep('connected')
          // Fetch current number from status
          fetch('/api/whatsapp/status')
            .then(r => r.json())
            .then(d => { if (d.number) setConnectedNumber(d.number) })
            .catch(() => {})
        }
      }
      setLoading(false)
    }
    load()
    return () => stopPolling()
  }, [stopPolling])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({
        business_name: businessName.trim(),
        brand_voice: brandVoice.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) toast.error('Gagal menyimpan. Coba lagi.')
    else toast.success('Profil berhasil disimpan.')
    setSaving(false)
  }

  // --- Brand voice analysis ---

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAnalyzeLoading(true)

    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/settings/analyze-chat', { method: 'POST', body: formData })
    const data = await res.json()

    if (!res.ok || data.error) {
      toast.error(data.error ?? 'Gagal membaca file.')
      setAnalyzeLoading(false)
      return
    }

    // Store file content for analyze-voice step
    const text = await file.text()
    setFileContent(text)
    setChatSenders(data.senders)
    setSelectedSender(data.senders[0] ?? '')
    setAnalyzeStep('selecting')
    setAnalyzeLoading(false)
  }

  async function handleAnalyzeVoice() {
    if (!selectedSender) return
    setAnalyzeLoading(true)
    setAnalyzeStep('analyzing')

    const res = await fetch('/api/settings/analyze-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: selectedSender, file_content: fileContent }),
    })
    const data = await res.json()

    if (!res.ok || data.error) {
      toast.error(data.error ?? 'Gagal menganalisa chat.')
      setAnalyzeStep('selecting')
      setAnalyzeLoading(false)
      return
    }

    setBrandVoicePreview(data.brand_voice)
    setAnalyzeStep('preview')
    setAnalyzeLoading(false)
  }

  function handleUseVoice() {
    setBrandVoice(brandVoicePreview)
    setAnalyzeStep('idle')
    setBrandVoicePreview('')
    toast.success('Gaya komunikasi diterapkan. Klik "Simpan Profil" untuk menyimpan.')
  }

  // --- Draft test ---

  async function handleTestDraft() {
    if (!testMessage.trim()) return
    setDraftLoading(true)
    const res = await fetch('/api/messages/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: testMessage, brand_voice: brandVoice }),
    })
    const data = await res.json()
    if (res.ok && data.draft) setDraftResult(data.draft)
    else toast.error('Gagal membuat draft. Pastikan OpenRouter API key sudah diisi.')
    setDraftLoading(false)
  }

  // --- WhatsApp connection ---

  async function handleGenerateQR() {
    if (!waNumber.trim()) return
    setWaStep('generating')

    const res = await fetch('/api/whatsapp/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsapp_number: waNumber.trim() }),
    })
    const data = await res.json()

    if (!res.ok || data.error) {
      toast.error(data.error ?? 'Gagal membuat QR.')
      setWaStep('idle')
      return
    }

    setQrBase64(data.qr_base64)
    setWaStep('scanning')
    startPolling()
  }

  function startPolling() {
    stopPolling()
    pollingRef.current = setInterval(async () => {
      const res = await fetch('/api/whatsapp/status')
      const data = await res.json()
      if (data.connected) {
        stopPolling()
        setConnectedNumber(data.number ?? waNumber)
        setWaStep('connected')
        setProfile(prev => prev ? { ...prev, wa_connected: true, onboarding_complete: true } : null)
        toast.success('WhatsApp berhasil terhubung!')
      }
    }, 3000)
  }

  async function handleDisconnect() {
    stopPolling()
    const res = await fetch('/api/whatsapp/disconnect', { method: 'POST' })
    if (res.ok) {
      setWaStep('idle')
      setQrBase64('')
      setConnectedNumber('')
      setProfile(prev => prev ? { ...prev, wa_connected: false, onboarding_complete: false } : null)
      toast.success('WhatsApp diputus.')
    } else {
      toast.error('Gagal memutus koneksi.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl tracking-tight">Pengaturan</h1>
        <p className="text-muted-foreground text-sm mt-1">Kelola profil bisnis dan koneksi WhatsApp.</p>
      </div>

      {/* Onboarding banner */}
      {profile && !profile.onboarding_complete && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3.5">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Lengkapi koneksi WhatsApp</p>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">
              Scan QR di Section B untuk mulai menggunakan Rostra.
            </p>
          </div>
        </div>
      )}

      {profile?.onboarding_complete && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
            Rostra aktif dan siap digunakan.
          </p>
        </div>
      )}

      {/* Section A: Profil Bisnis */}
      <form onSubmit={handleSaveProfile} className="rounded-xl border border-border bg-card p-5 space-y-5">
        <div>
          <h2 className="font-display font-semibold text-sm">Profil Bisnis</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Nama bisnis dan gaya komunikasi AI.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="businessName" className="text-sm font-medium">Nama Bisnis</Label>
          <Input
            id="businessName"
            placeholder="Contoh: Studio Foto Melati"
            value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            required
            className="h-10"
          />
        </div>

        {/* Brand voice subsection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="brandVoice" className="text-sm font-medium">
              Gaya Komunikasi AI <span className="text-muted-foreground font-normal">(opsional)</span>
            </Label>
            {analyzeStep === 'idle' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => setAnalyzeStep('uploading')}
              >
                <Sparkles className="w-3 h-3" />
                Analisa dari Chat WA
              </Button>
            )}
          </div>

          <Textarea
            id="brandVoice"
            placeholder="Contoh: Selalu sapa dengan 'Halo Kak 😊'. Pesan singkat 1-2 kalimat. Gunakan emoji 🙏 di akhir pesan."
            value={brandVoice}
            onChange={e => setBrandVoice(e.target.value)}
            rows={3}
            className="resize-none text-sm"
          />

          {/* Analyze flow */}
          {analyzeStep === 'uploading' && (
            <div className="rounded-lg border border-dashed border-border p-4 space-y-2">
              <p className="text-xs text-muted-foreground">
                Upload file export WhatsApp (.txt). Buka WA → Obrolan → titik tiga → Export Chat.
              </p>
              <label className="flex items-center gap-2 cursor-pointer w-fit">
                <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium hover:bg-muted transition-colors cursor-pointer">
                  <Upload className="w-3 h-3" />
                  {analyzeLoading ? 'Membaca...' : 'Pilih File .txt'}
                </span>
                <input
                  type="file"
                  accept=".txt"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={analyzeLoading}
                />
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => setAnalyzeStep('idle')}
              >
                Batal
              </Button>
            </div>
          )}

          {analyzeStep === 'selecting' && (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Ditemukan {chatSenders.length} pengirim. Pilih nama admin bisnis kamu:
              </p>
              <Select value={selectedSender} onValueChange={v => { if (v !== null) setSelectedSender(v) }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Pilih pengirim..." />
                </SelectTrigger>
                <SelectContent>
                  {chatSenders.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button type="button" size="sm" className="h-8 text-xs" onClick={handleAnalyzeVoice}>
                  <Sparkles className="w-3 h-3 mr-1.5" />
                  Analisa
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setAnalyzeStep('idle')}
                >
                  Batal
                </Button>
              </div>
            </div>
          )}

          {analyzeStep === 'analyzing' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              AI sedang mempelajari gaya chat kamu...
            </div>
          )}

          {analyzeStep === 'preview' && (
            <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
              <p className="text-xs font-medium">Hasil analisa:</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{brandVoicePreview}</p>
              <div className="flex gap-2 flex-wrap">
                <Button type="button" size="sm" className="h-8 text-xs" onClick={handleUseVoice}>
                  Gunakan Gaya Ini
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setAnalyzeStep('uploading')}
                >
                  <RefreshCcw className="w-3 h-3 mr-1" />
                  Analisa Ulang
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => { setBrandVoice(brandVoicePreview); setAnalyzeStep('idle') }}
                >
                  Edit Manual
                </Button>
              </div>
            </div>
          )}

          {/* Draft test */}
          {brandVoice && analyzeStep === 'idle' && (
            <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/20">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" />
                Coba Draft AI
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="kak mau tanya harga baju seragam 50 pcs"
                  value={testMessage}
                  onChange={e => setTestMessage(e.target.value)}
                  className="h-8 text-xs flex-1"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleTestDraft() } }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs shrink-0"
                  onClick={handleTestDraft}
                  disabled={draftLoading || !testMessage.trim()}
                >
                  {draftLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Coba'}
                </Button>
              </div>
              {draftResult && (
                <div className="text-xs p-2 rounded bg-background border border-border text-foreground leading-relaxed">
                  {draftResult}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <Button type="submit" className="font-display font-medium" disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menyimpan...</> : 'Simpan Profil'}
          </Button>
        </div>
      </form>

      {/* Section B: WhatsApp Connection */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-semibold text-sm">Koneksi WhatsApp</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hubungkan nomor WhatsApp bisnis via QR scan.
            </p>
          </div>
          {waStep === 'connected'
            ? <Wifi className="w-4 h-4 text-emerald-500" />
            : <WifiOff className="w-4 h-4 text-muted-foreground" />
          }
        </div>

        {waStep === 'idle' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Nomor WhatsApp Bisnis</Label>
              <Input
                placeholder="628123456789"
                value={waNumber}
                onChange={e => setWaNumber(e.target.value)}
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">Format internasional tanpa +, contoh: 628123456789</p>
            </div>
            <Button
              onClick={handleGenerateQR}
              disabled={!waNumber.trim()}
              className="gap-2"
            >
              <QrCode className="w-4 h-4" />
              Generate QR
            </Button>
          </div>
        )}

        {waStep === 'generating' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Membuat QR code...
          </div>
        )}

        {waStep === 'scanning' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Scan QR ini dengan WhatsApp di nomor <strong>{waNumber}</strong>. Menunggu scan...
            </p>
            <div className="flex items-start gap-4">
              <div className="rounded-lg border border-border bg-white p-2 inline-block">
                {qrBase64.startsWith('http') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrBase64} alt="QR Code WhatsApp" className="w-48 h-48" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`data:image/png;base64,${qrBase64}`} alt="QR Code WhatsApp" className="w-48 h-48" />
                )}
              </div>
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Menunggu scan...
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => { stopPolling(); setWaStep('idle'); setQrBase64('') }}
                >
                  Batal
                </Button>
              </div>
            </div>
          </div>
        )}

        {waStep === 'connected' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              WhatsApp terhubung{connectedNumber ? `: ${connectedNumber}` : ''}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs text-destructive hover:text-destructive"
              onClick={handleDisconnect}
            >
              Putuskan Koneksi
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
