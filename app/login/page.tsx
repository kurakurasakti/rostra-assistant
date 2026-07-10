'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, ArrowRight, Eye, EyeOff, Sparkles } from 'lucide-react'
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

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        10000,
        'signInWithPassword'
      )

      if (error) {
        console.error('[login] signInWithPassword failed:', error)
        setError('Email atau password salah. Periksa lagi, lalu coba masuk.')
        setLoading(false)
        return
      }

      const { data: profile, error: profileError } = await withTimeout(
        Promise.resolve(supabase.from('profiles').select('onboarding_complete').single()),
        10000,
        'profile fetch'
      )

      if (profileError) {
        console.error('[login] profile fetch failed:', profileError)
      }

      if (profile && !profile.onboarding_complete) {
        router.push('/settings')
      } else {
        router.push('/dashboard')
      }
      router.refresh()
    } catch (err) {
      console.error('[login] unexpected error:', err)
      setError('Tidak bisa terhubung ke server. Cek koneksi internetmu, lalu coba lagi.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F8F6F2' }}>
      <AuthBrandPanel>
        <div className="space-y-8">
          <h1 className="text-white font-display font-bold text-4xl xl:text-[2.75rem] leading-[1.15] tracking-tight">
            WhatsApp kamu
            <br />
            tetap terbalas,
            <br />
            <span style={{ color: '#E8A33D' }}>bahkan jam 10 malam.</span>
          </h1>

          {/* Chat vignette — what Glim actually does */}
          <div aria-hidden="true" className="max-w-xs space-y-2">
            <div className="rounded-xl rounded-tl-sm bg-white/95 px-3.5 py-2.5 shadow-lg">
              <p className="text-xs leading-relaxed" style={{ color: '#1A1A18' }}>
                Kak, jadi berapa harga kebaya custom size M? 🙏
              </p>
              <p className="text-right text-[10px] mt-1" style={{ color: '#9B9590' }}>22:41</p>
            </div>
            <div
              className="rounded-xl border-2 px-3.5 py-2.5 shadow-lg"
              style={{ backgroundColor: '#FFFBF3', borderColor: '#E8A33D' }}
            >
              <p className="flex items-center gap-1.5 text-[10px] font-semibold mb-1" style={{ color: '#B8720A' }}>
                <Sparkles className="w-3 h-3" /> Draft AI siap dikirim
              </p>
              <p className="text-xs leading-relaxed" style={{ color: '#1A1A18' }}>
                Halo Kak! Kebaya custom size M mulai dari Rp 850.000 ya 😊
              </p>
            </div>
          </div>
        </div>
      </AuthBrandPanel>

      {/* Form side */}
      <div className="flex-1 flex flex-col px-6 py-8 lg:py-12">
        <div className="lg:hidden">
          <Logo variant="lockup" tone="light" height={26} />
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-sm animate-fade-up">
            <div className="mb-8">
              <h2 className="font-display font-bold text-[1.75rem] tracking-tight" style={{ color: '#1A1A18' }}>
                Masuk ke Glim
              </h2>
              <p className="text-sm mt-1.5" style={{ color: '#6B6862' }}>
                Lanjutkan mengelola pesan dan pesanan bisnismu.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4" suppressHydrationWarning>
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
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
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
                {loading ? 'Sedang masuk...' : (
                  <span className="inline-flex items-center gap-2">
                    Masuk <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t" style={{ borderColor: '#E8E4DC' }}>
              <p className="text-center text-sm" style={{ color: '#6B6862' }}>
                Belum punya akun?{' '}
                <Link href="/register" className="text-primary font-medium hover:underline">
                  Daftar dengan kode undangan
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
