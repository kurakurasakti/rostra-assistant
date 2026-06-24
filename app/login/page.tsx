'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle } from 'lucide-react'
import { Logo } from '@/components/logo'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email atau password salah. Coba lagi.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_complete')
      .single()

    if (profile && !profile.onboarding_complete) {
      router.push('/settings')
    } else {
      router.push('/')
    }
    router.refresh()
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #4a2560 0%, #703c8b 40%, #8b5aa3 100%)'
        }}>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-white/5" />
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.03]" />
        </div>

        <div className="relative">
          <Logo variant="lockup" tone="dark" height={30} />
        </div>

        <div className="relative space-y-6">
          <div>
            <h1 className="text-white font-display font-bold text-4xl xl:text-5xl leading-tight tracking-tight">
              Bisnis lebih rapi,<br />
              pelanggan lebih<br />
              senang.
            </h1>
            <p className="text-white/70 mt-4 text-base leading-relaxed max-w-xs">
              Kelola Client, pesanan, dan pesan WhatsApp dalam satu tempat yang terorganisir.
            </p>
          </div>

          <ul className="space-y-3">
            {[
              'Manajemen Client & pesanan otomatis',
              'Pengingat pembayaran via WhatsApp',
              'Inbox terpusat dengan balasan AI',
            ].map((feat) => (
              <li key={feat} className="flex items-start gap-3 text-sm text-white/80">
                <div className="mt-0.5 w-4 h-4 rounded-full bg-accent/30 flex items-center justify-center flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                </div>
                {feat}
              </li>
            ))}
          </ul>
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
          <div className="mb-8">
            <h2 className="font-display font-bold text-2xl tracking-tight">Selamat datang kembali</h2>
            <p className="text-muted-foreground text-sm mt-1">Masuk untuk melanjutkan ke Glim</p>
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
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-10"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10 font-medium font-display"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Don't have an account?{' '}
            <span className="text-foreground">Hubungi kami untuk mendapat kode undangan.</span>
          </p>
        </div>
      </div>
    </div>
  )
}
