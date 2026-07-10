'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, ArrowRight, Eye, EyeOff, MailCheck } from 'lucide-react'
import { Logo } from '@/components/logo'
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel'

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ])
}

const steps = ['Bisnis', 'Akun', 'Undangan'] as const

export default function RegisterPage() {
  const router = useRouter()
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

  const stepIndex = !businessName.trim() ? 0 : !email.trim() || !password.trim() ? 1 : 2

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!termsAccepted) {
        setError('Kamu harus menyetujui Syarat & Ketentuan untuk mendaftar.')
        setLoading(false)
        return
      }

      const checkRes = await withTimeout(
        fetch('/api/auth/check-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: inviteCode }),
        }),
        10000,
        'check-invite fetch'
      )

      if (!checkRes.ok) {
        setError(`Gagal memeriksa kode: HTTP ${checkRes.status}`)
        setLoading(false)
        return
      }

      const checkData = await checkRes.json()

      if (!checkData.valid) {
        setError('Kode undangan tidak valid. Hubungi kami untuk mendapatkan akses.')
        setLoading(false)
        return
      }

      const supabase = createClient()
      const { data: signUpData, error: signUpError } = await withTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: {
            data: { business_name: businessName },
          },
        }),
        10000,
        'signUp'
      )

      if (signUpError) {
        console.error('[register] signUp failed:', signUpError)
        setError(`Gagal mendaftar: ${signUpError.message}`)
        setLoading(false)
        return
      }

      if (!signUpData.session) {
        setNeedsConfirmation(true)
        setLoading(false)
        return
      }

      const userId = signUpData.user?.id
      if (userId) {
        const { error: updateError } = await withTimeout(
          Promise.resolve(
            supabase
              .from('profiles')
              .update({
                terms_agreed_at: new Date().toISOString(),
                terms_version: process.env.NEXT_PUBLIC_TERMS_VERSION || '1.0',
                updated_at: new Date().toISOString(),
              })
              .eq('id', userId)
          ),
          10000,
          'profile update'
        )
        if (updateError) {
          console.error('[register] profile update failed:', updateError)
        }
      }

      router.push('/settings')
      router.refresh()
    } catch (err) {
      console.error('[register] unexpected error:', err)
      setError('Tidak bisa terhubung ke server. Cek koneksi internetmu, lalu coba lagi.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F8F6F2' }}>
      <AuthBrandPanel>
        <div className="space-y-8">
          <h1 className="text-white font-display font-bold text-4xl xl:text-[2.75rem] leading-[1.15] tracking-tight">
            Nomor bisnismu,
            <br />
            dijaga tim yang
            <br />
            <span style={{ color: '#E8A33D' }}>tidak pernah tidur.</span>
          </h1>

          <ul className="space-y-3">
            {[
              'AI belajar gaya bicaramu sendiri dari chat lama',
              'Pengingat pembayaran & jadwal terkirim otomatis',
              'Semua percakapan dan pesanan dalam satu inbox',
            ].map((feat) => (
              <li key={feat} className="flex items-start gap-3 text-sm text-white/80">
                <div className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(232,163,61,0.25)' }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#E8A33D' }} />
                </div>
                {feat}
              </li>
            ))}
          </ul>
        </div>
      </AuthBrandPanel>

      {/* Form side */}
      <div className="flex-1 flex flex-col px-6 py-8 lg:py-12">
        <div className="lg:hidden">
          <Logo variant="lockup" tone="light" height={26} />
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-sm animate-fade-up">
            {needsConfirmation ? (
              <div className="text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ backgroundColor: '#EDE0F5' }}>
                  <MailCheck className="w-7 h-7" style={{ color: '#703c8b' }} />
                </div>
                <div>
                  <h2 className="font-display font-bold text-2xl tracking-tight" style={{ color: '#1A1A18' }}>Cek email kamu</h2>
                  <p className="text-sm mt-2 leading-relaxed" style={{ color: '#6B6862' }}>
                    Kami kirim link konfirmasi ke{' '}
                    <span className="font-medium" style={{ color: '#1A1A18' }}>{email}</span>.
                    Klik link itu untuk mengaktifkan akun, lalu masuk.
                  </p>
                </div>
                <p className="text-xs" style={{ color: '#9B9590' }}>Tidak dapat email? Cek folder spam.</p>
                <Link href="/login" className="block">
                  <Button variant="outline" className="w-full h-11 rounded-xl font-display">Ke halaman masuk</Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="font-display font-bold text-[1.75rem] tracking-tight" style={{ color: '#1A1A18' }}>
                    Buat akun Glim
                  </h2>
                  <p className="text-sm mt-1.5" style={{ color: '#6B6862' }}>
                    Butuh kode undangan — hubungi kami kalau belum punya.
                  </p>
                </div>

                {/* Progress — 3 real fields left to fill, not a decorative wizard */}
                <div className="flex items-center gap-1.5 mb-7" aria-hidden="true">
                  {steps.map((label, i) => (
                    <div key={label} className="flex-1">
                      <div
                        className="h-1 rounded-full transition-colors"
                        style={{ backgroundColor: i <= stepIndex ? '#703c8b' : '#E8E4DC' }}
                      />
                      <p className="text-[10px] mt-1.5" style={{ color: i <= stepIndex ? '#703c8b' : '#9B9590' }}>
                        {label}
                      </p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="businessName" className="text-sm font-medium">Nama Bisnis</Label>
                    <Input
                      id="businessName"
                      type="text"
                      placeholder="Contoh: Studio Foto Melati"
                      value={businessName}
                      onChange={e => setBusinessName(e.target.value)}
                      required
                      className="h-11 rounded-xl bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="kamu@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="h-11 rounded-xl bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Minimal 6 karakter"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                        minLength={6}
                        className="h-11 rounded-xl bg-white pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="inviteCode" className="text-sm font-medium">Kode Undangan</Label>
                    <Input
                      id="inviteCode"
                      type="text"
                      placeholder="Masukkan kode undangan"
                      value={inviteCode}
                      onChange={e => setInviteCode(e.target.value)}
                      required
                      className="h-11 rounded-xl bg-white"
                    />
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={e => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                    />
                    <span className="text-xs leading-relaxed" style={{ color: '#6B6862' }}>
                      Saya menyetujui{' '}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">
                        Syarat & Ketentuan
                      </a>{' '}
                      dan{' '}
                      <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">
                        Kebijakan Privasi
                      </a>{' '}
                      Glim
                    </span>
                  </label>

                  {error && (
                    <div className="flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 rounded-xl font-medium font-display text-[0.9rem]"
                    disabled={loading}
                  >
                    {loading ? 'Mendaftar...' : (
                      <span className="inline-flex items-center gap-2">
                        Daftar <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </form>

                <div className="mt-6 pt-6 border-t" style={{ borderColor: '#E8E4DC' }}>
                  <p className="text-center text-sm" style={{ color: '#6B6862' }}>
                    Sudah punya akun?{' '}
                    <Link href="/login" className="text-primary font-medium hover:underline">
                      Masuk
                    </Link>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
