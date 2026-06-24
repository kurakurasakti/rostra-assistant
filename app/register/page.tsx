'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, MailCheck } from 'lucide-react'
import { Logo } from '@/components/logo'

export default function RegisterPage() {
  const router = useRouter()
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!termsAccepted) {
      setError('Kamu harus menyetujui Syarat & Ketentuan untuk mendaftar.')
      setLoading(false)
      return
    }

    console.log('[register] step 1 — checking invite code')
    const checkRes = await fetch('/api/auth/check-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: inviteCode }),
    })
    const checkData = await checkRes.json()
    console.log('[register] invite check result:', checkData)

    if (!checkData.valid) {
      setError('Kode undangan tidak valid. Hubungi kami untuk mendapatkan akses.')
      setLoading(false)
      return
    }

    console.log('[register] step 2 — calling supabase.auth.signUp')
    const supabase = createClient()
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { business_name: businessName },
      },
    })
    console.log('[register] signUp result:', {
      userId: signUpData?.user?.id,
      hasSession: !!signUpData?.session,
      emailConfirmedAt: signUpData?.user?.email_confirmed_at,
      error: signUpError?.message,
      errorCode: signUpError?.code,
    })

    if (signUpError) {
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
      await supabase
        .from('profiles')
        .update({
          terms_agreed_at: new Date().toISOString(),
          terms_version: process.env.NEXT_PUBLIC_TERMS_VERSION || '1.0',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
    }

    router.push('/settings')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #4a2560 0%, #703c8b 40%, #8b5aa3 100%)'
        }}>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-white/5" />
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
        </div>

        <div className="relative">
          <Logo variant="lockup" tone="dark" height={30} />
        </div>

        <div className="relative space-y-4">
          <h1 className="text-white font-display font-bold text-4xl xl:text-5xl leading-tight tracking-tight">
            Mulai kelola<br />
            bisnis kamu<br />
            hari ini.
          </h1>
          <p className="text-white/70 text-base leading-relaxed max-w-xs">
            Daftar sekarang dengan kode undangan dan nikmati semua fitur Glim secara gratis.
          </p>
        </div>

        <div className="relative">
          <p className="text-white/40 text-xs">© 2025 Glim. Dibuat dengan ♥ untuk bisnis Indonesia.</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="flex lg:hidden items-center mb-10">
          <Logo variant="lockup" tone="light" height={30} />
        </div>

        <div className="w-full max-w-sm animate-fade-up">

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
                  Tidak dapat email?{' '}
                  <span className="text-muted-foreground">Cek folder spam.</span>
                </p>
              </div>
              <a href="/login" className="block">
                <Button variant="outline" className="w-full font-display">Ke halaman login</Button>
              </a>
            </div>
          ) : (
            <>
          <div className="mb-8">
            <h2 className="font-display font-bold text-2xl tracking-tight">Buat akun</h2>
            <p className="text-muted-foreground text-sm mt-1">Kamu butuh kode undangan untuk mendaftar</p>
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
              <Input
                id="password"
                type="password"
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={6}
                className="h-10"
              />
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
              disabled={!termsAccepted}
            >
              {loading ? 'Mendaftar...' : 'Daftar'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Sudah punya akun?{' '}
            <a href="/login" className="text-primary font-medium hover:underline">
              Masuk
            </a>
          </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
