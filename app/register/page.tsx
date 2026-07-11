'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, MailCheck, Eye, EyeOff } from 'lucide-react'
import { Logo } from '@/components/logo'
import { AuthBrandPanel } from '@/components/auth/auth-brand-panel'

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ])
}

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

      console.log('[register] step 1 — checking invite code')
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
        console.error('[register] check-invite returned', checkRes.status)
        setError(`Gagal memeriksa kode: HTTP ${checkRes.status}`)
        setLoading(false)
        return
      }

      const checkData = await checkRes.json()
      console.log('[register] invite check result:', checkData)

      if (!checkData.valid) {
        setError('Kode undangan tidak valid. Hubungi kami untuk mendapatkan akses.')
        setLoading(false)
        return
      }

      console.log('[register] step 2 — calling supabase.auth.signUp')
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

      console.log('[register] signUp result:', {
        userId: signUpData?.user?.id,
        hasSession: !!signUpData?.session,
        emailConfirmedAt: signUpData?.user?.email_confirmed_at,
        error: signUpError?.message,
        errorCode: signUpError?.code,
      })

      if (signUpError) {
        console.error('[register] signUp failed:', signUpError)
        setError(`Gagal mendaftar: ${signUpError.message}`)
        setLoading(false)
        return
      }

      // Supabase email confirmation is ON → session is null until user confirms email
      if (!signUpData.session) {
        console.log('[register] no session — email confirmation required')
        setNeedsConfirmation(true)
        setLoading(false)
        return
      }

      console.log('[register] step 3 — session active, saving terms consent')
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
      setError(`Pendaftaran gagal: ${err instanceof Error ? err.message : 'unknown error'}`)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F8F6F2' }}>
      <AuthBrandPanel
        headline={
          <>
            Mulai kelola
            <br />
            bisnis kamu hari ini.
          </>
        }
        tagline="Daftar sekarang dengan kode undangan dan nikmati semua fitur Glim secara gratis."
      />

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="flex lg:hidden items-center mb-8">
          <Logo variant="lockup" tone="light" height={30} />
        </div>

        <div className="w-full max-w-md animate-fade-up">
          <div
            className="rounded-2xl bg-white border p-8 shadow-sm"
            style={{ borderColor: '#E8E4DC' }}
          >
            {/* Email confirmation screen */}
            {needsConfirmation ? (
              <div className="text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <MailCheck className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-2xl tracking-tight">Cek email kamu</h2>
                  <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                    Kami kirim link konfirmasi ke{' '}
                    <span className="font-medium text-foreground">{email}</span>.
                    Klik link tersebut untuk mengaktifkan akun, lalu login.
                  </p>
                </div>
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground">
                    Tidak dapat email? Cek folder spam.
                  </p>
                </div>
                <Link href="/login" className="block">
                  <Button variant="outline" className="w-full font-display">Ke halaman login</Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-7">
                  <h2 className="font-display font-bold text-2xl tracking-tight">
                    Buat akun Glim ✨
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Gratis 14 hari, nggak perlu kartu kredit
                  </p>
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
                      className="h-10"
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
                      className="h-10"
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
                        className="h-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
                      className="h-10"
                    />
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      id="terms"
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={e => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                    />
                    <span className="text-xs text-gray-500 leading-relaxed">
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
                    <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-10 font-medium font-display"
                    disabled={loading || !termsAccepted}
                  >
                    {loading ? 'Mendaftar...' : 'Daftar'}
                  </Button>
                </form>
              </>
            )}
          </div>

          {!needsConfirmation && (
            <p className="text-center text-sm text-muted-foreground mt-6">
              Sudah punya akun?{' '}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Masuk
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
