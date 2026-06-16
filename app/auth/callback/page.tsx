'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { MessageSquare, AlertCircle, Loader2 } from 'lucide-react'

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  )
}

function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')

      if (!code) {
        setError('Tidak ada kode verifikasi. Link mungkin sudah kadaluarsa.')
        setLoading(false)
        return
      }

      try {
        const supabase = createClient()

        // Exchange code for session — handles email confirmation
        // Try new exchange method first (if available), fallback to verifyOtp
        let session = null
        let user = null
        let verifyError = null

        try {
          // Modern approach: exchangeCodeForSession
          const { data: exchangeData, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code)
          if (!exchangeErr) {
            session = exchangeData.session
            user = exchangeData.user
          } else {
            verifyError = exchangeErr
          }
        } catch {
          // Fallback to verifyOtp for legacy versions
          const { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
            email: searchParams.get('email') || '',
            token: code,
            type: 'signup',
          })
          if (!verifyErr) {
            session = verifyData.session
            user = verifyData.user
          } else {
            verifyError = verifyErr
          }
        }

        if (verifyError) {
          console.error('[auth callback] verification error:', verifyError)
          setError(`Verifikasi gagal: ${verifyError.message}`)
          setLoading(false)
          return
        }

        if (!user) {
          setError('Verifikasi gagal: data user tidak ditemukan.')
          setLoading(false)
          return
        }

        console.log('[auth callback] email verified, user:', user.id)

        // Save terms consent on first verification
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            terms_agreed_at: new Date().toISOString(),
            terms_version: process.env.NEXT_PUBLIC_TERMS_VERSION || '1.0',
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)

        if (updateError) {
          console.error('[auth callback] update profile error:', updateError)
        }

        // Check onboarding status
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_complete')
          .eq('id', user.id)
          .single()

        // Redirect to settings for onboarding or dashboard if complete
        if (profile && !profile.onboarding_complete) {
          router.push('/settings')
        } else {
          router.push('/')
        }
        router.refresh()
      } catch (err) {
        console.error('[auth callback] unexpected error:', err)
        setError('Terjadi kesalahan. Coba lagi atau hubungi kami.')
        setLoading(false)
      }
    }

    handleCallback()
  }, [searchParams, router])

  if (loading && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Memverifikasi email...</p>
        </div>
      </div>
    )
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
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-accent" />
            </div>
            <span className="text-white font-display font-semibold text-lg tracking-tight">Rostra</span>
          </div>
        </div>

        <div className="relative space-y-6">
          <div>
            <h1 className="text-white font-display font-bold text-4xl xl:text-5xl leading-tight tracking-tight">
              Bisnis lebih rapi,<br />
              pelanggan lebih<br />
              senang.
            </h1>
            <p className="text-white/70 mt-4 text-base leading-relaxed max-w-xs">
              Kelola klien, pesanan, dan pesan WhatsApp dalam satu tempat yang terorganisir.
            </p>
          </div>
        </div>

        <div className="relative">
          <p className="text-white/40 text-xs">© 2025 Rostra. Dibuat dengan ♥ untuk bisnis Indonesia.</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="flex lg:hidden items-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-xl tracking-tight">Rostra</span>
        </div>

        <div className="w-full max-w-sm animate-fade-up">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7 text-destructive" />
            </div>
            <div>
              <h2 className="font-display font-bold text-2xl tracking-tight">Verifikasi Gagal</h2>
              <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                {error}
              </p>
            </div>
            <div className="pt-2 space-y-2">
              <Button variant="default" className="w-full font-display" onClick={() => router.push('/login')}>
                Ke Halaman Login
              </Button>
              <Button variant="outline" className="w-full font-display" onClick={() => router.push('/register')}>
                Coba Daftar Lagi
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
