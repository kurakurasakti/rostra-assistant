# Auth Pages Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/login` and `/register` to match the landing page's warm friendly visual language (cream `#F8F6F2` + purple `#703c8b` + animated WA chat mockup), fix copy inconsistencies, add password visibility toggle, restore terms-checkbox gating. Auth logic unchanged.

**Architecture:** Extract the landing page's inline `WaMockup` into a shared component. Build one shared `AuthBrandPanel` (purple gradient + logo + WaMockup + headline) used by both auth pages. Each auth page keeps its own form logic untouched; only JSX/styling/copy changes.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind v4, shadcn/ui (`Button`, `Input`, `Label`), lucide-react icons, Supabase client auth.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-10-auth-redesign-design.md`
- E2E compatibility (`e2e/flows/F1-auth.spec.ts`): keep field ids `#businessName`, `#email`, `#password`, `#inviteCode`; keep `button[type="submit"]`; keep error box class `bg-destructive/10`.
- All user-facing copy in friendly Indonesian.
- Purple gradient: `linear-gradient(135deg, #4a2560 0%, #703c8b 40%, #8b5aa3 100%)`. Cream bg: `#F8F6F2`. Card border: `#E8E4DC`.
- Auth logic (Supabase calls, redirects, invite check, terms consent save) must not change.
- No new dependencies.
- Verify each task with `pnpm build` (project has no unit test runner; e2e run is the final task).

---

### Task 1: Extract `WaMockup` into a shared component

**Files:**
- Create: `components/landing/wa-mockup.tsx`
- Modify: `app/page.tsx` (remove inline `WaMockup` at ~line 459–555, add import)

**Interfaces:**
- Produces: `export function WaMockup()` — no props, decorative (`aria-hidden`), self-contained. Imported by `app/page.tsx` (Task 1) and `components/auth/auth-brand-panel.tsx` (Task 2).

- [ ] **Step 1: Create `components/landing/wa-mockup.tsx`**

Move the function verbatim from `app/page.tsx` (it needs its own `Sparkles` import):

```tsx
import { Sparkles } from 'lucide-react'

export function WaMockup() {
  return (
    // Decorative product mockup — hidden from assistive tech, no focusable controls inside
    <div
      aria-hidden="true"
      className="rounded-2xl shadow-xl overflow-hidden border w-full"
      style={{ maxWidth: '340px', borderColor: '#E8E4DC', backgroundColor: '#ECE5DD' }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-3"
        style={{ background: 'linear-gradient(135deg, #4a2560 0%, #703c8b 100%)' }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
        >
          <span className="text-white font-bold text-xs">R</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-xs truncate">Rina Sari</p>
          <p className="text-white/60 text-[10px]">0812-3456-7890</p>
        </div>
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}
        >
          Inbox Glim
        </span>
      </div>

      {/* Chat area */}
      <div className="p-3 space-y-2 min-h-[200px]">
        {/* Incoming message 1 */}
        <div
          className="animate-chat-bubble-1 rounded-xl rounded-tl-sm px-3 py-2 max-w-[85%]"
          style={{ backgroundColor: '#fff' }}
        >
          <p className="text-xs leading-relaxed" style={{ color: '#1A1A18' }}>
            Halo kak, mau tanya soal kebaya custom dong, ada nggak? 🙏
          </p>
          <p className="text-right text-[10px] mt-1" style={{ color: '#9B9590' }}>
            11:23
          </p>
        </div>

        {/* Incoming message 2 */}
        <div
          className="animate-chat-bubble-2 rounded-xl rounded-tl-sm px-3 py-2 max-w-[85%]"
          style={{ backgroundColor: '#fff' }}
        >
          <p className="text-xs leading-relaxed" style={{ color: '#1A1A18' }}>
            Berapa harga mulai dari untuk size M?
          </p>
          <p className="text-right text-[10px] mt-1" style={{ color: '#9B9590' }}>
            11:24
          </p>
        </div>

        {/* AI draft card */}
        <div
          className="animate-ai-draft rounded-xl border-2 p-3 mt-3"
          style={{ backgroundColor: '#FFFBF3', borderColor: '#E8A33D' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles
              className="animate-amber-pulse w-3 h-3"
              style={{ color: '#E8A33D' }}
            />
            <span className="text-[10px] font-semibold" style={{ color: '#B8720A' }}>
              Draft AI
            </span>
          </div>
          <p className="text-xs leading-relaxed mb-3" style={{ color: '#1A1A18' }}>
            Halo Rina! Ada kok kak 😊 Kebaya custom kami mulai dari{' '}
            <span className="font-medium">Rp 850.000</span> untuk size M. Bisa konsultasi gratis
            dulu soal desain dan bahan...
          </p>
          <div className="flex gap-2">
            <div
              className="flex-1 text-center text-[10px] font-medium py-1.5 rounded-lg border"
              style={{ borderColor: '#C9C3BB', color: '#6B6862', backgroundColor: 'transparent' }}
            >
              Ubah
            </div>
            <div
              className="flex-1 text-center text-[10px] font-semibold py-1.5 rounded-lg"
              style={{ backgroundColor: '#703c8b', color: '#fff' }}
            >
              ✓ Kirim
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update `app/page.tsx`**

1. Delete the entire inline `function WaMockup() { ... }` (from `function WaMockup() {` down to its closing `}` at end of file, ~lines 459–555).
2. Add to imports at the top:

```tsx
import { WaMockup } from '@/components/landing/wa-mockup'
```

3. Keep the existing `Sparkles` import in `app/page.tsx` — it is still used by the hero badge.

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: build succeeds, no TypeScript errors, no "WaMockup is not defined".

- [ ] **Step 4: Commit**

```bash
git add components/landing/wa-mockup.tsx app/page.tsx
git commit -m "refactor(landing): extract WaMockup into shared component"
```

---

### Task 2: Create `AuthBrandPanel` shared component

**Files:**
- Create: `components/auth/auth-brand-panel.tsx`

**Interfaces:**
- Consumes: `WaMockup` from `components/landing/wa-mockup.tsx` (Task 1), `Logo` from `components/logo.tsx` (exists — API: `<Logo variant="lockup" tone="dark" height={30} />`).
- Produces: `export function AuthBrandPanel({ headline, tagline }: { headline: ReactNode; tagline: string })` — the full left panel (`hidden lg:flex`). Used by both auth pages in Tasks 3–4.

- [ ] **Step 1: Create `components/auth/auth-brand-panel.tsx`**

```tsx
import type { ReactNode } from 'react'
import { Logo } from '@/components/logo'
import { WaMockup } from '@/components/landing/wa-mockup'

export function AuthBrandPanel({ headline, tagline }: { headline: ReactNode; tagline: string }) {
  return (
    <div
      className="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col justify-between p-12 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #4a2560 0%, #703c8b 40%, #8b5aa3 100%)',
      }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-white/5" />
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
      </div>

      <div className="relative">
        <Logo variant="lockup" tone="dark" height={30} />
      </div>

      <div className="relative flex justify-center py-8">
        <WaMockup />
      </div>

      <div className="relative space-y-3">
        <h1 className="text-white font-display font-bold text-3xl xl:text-4xl leading-tight tracking-tight">
          {headline}
        </h1>
        <p className="text-white/70 text-sm leading-relaxed max-w-xs">{tagline}</p>
        <p className="text-white/40 text-xs pt-4">
          © 2025 Glim. Dibuat dengan ♥ untuk bisnis Indonesia.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: build succeeds. (Component not yet imported anywhere — that's fine, TypeScript still checks it.)

- [ ] **Step 3: Commit**

```bash
git add components/auth/auth-brand-panel.tsx
git commit -m "feat(auth): add shared AuthBrandPanel with WA mockup"
```

---

### Task 3: Redesign login page

**Files:**
- Modify: `app/login/page.tsx` (full rewrite of JSX; `handleLogin` and `withTimeout` unchanged)

**Interfaces:**
- Consumes: `AuthBrandPanel` (Task 2).
- Produces: nothing consumed by later tasks.

**E2E constraints:** keep `#email`, `#password`, `button[type="submit"]`, error class `bg-destructive/10`.

- [ ] **Step 1: Replace `app/login/page.tsx` with:**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
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
        setError(`Email atau password salah. (${error.message})`)
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
      setError(`Login gagal: ${err instanceof Error ? err.message : 'unknown error'}`)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F8F6F2' }}>
      <AuthBrandPanel
        headline={
          <>
            Bisnis lebih rapi,
            <br />
            pelanggan lebih senang.
          </>
        }
        tagline="Kelola client, pesanan, dan pesan WhatsApp dalam satu tempat yang terorganisir."
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
            <div className="mb-7">
              <h2 className="font-display font-bold text-2xl tracking-tight">
                Selamat datang kembali 👋
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Masuk untuk melanjutkan ke Glim
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
                  className="h-10"
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
                {loading ? 'Sebentar ya...' : 'Masuk'}
              </Button>
            </form>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Belum punya akun?{' '}
            <Link href="/register" className="text-primary font-medium hover:underline">
              Daftar di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 3: Manual smoke check (dev server)**

Run: `pnpm dev`, open `http://localhost:3000/login`.
Expected: purple panel with animated chat mockup on desktop width; white card on cream; eye toggle switches password visibility; "Daftar di sini" navigates to `/register`. On narrow window (<1024px) panel hidden, logo on top.

- [ ] **Step 4: Commit**

```bash
git add app/login/page.tsx
git commit -m "feat(auth): redesign login page to match landing visual language"
```

---

### Task 4: Redesign register page + update e2e F1.1

**Files:**
- Modify: `app/register/page.tsx` (full rewrite of JSX; `handleRegister` and `withTimeout` unchanged)
- Modify: `e2e/flows/F1-auth.spec.ts:4-22` (F1.1 — add terms checkbox step)

**Interfaces:**
- Consumes: `AuthBrandPanel` (Task 2).
- Produces: terms checkbox `id="terms"` (used by the e2e test).

**E2E constraints:** keep `#businessName`, `#email`, `#password`, `#inviteCode`, `button[type="submit"]`, error class `bg-destructive/10`. F1.2 submits WITHOUT checking terms — but its checkbox stays unchecked so the button would be disabled. F1.2 fills the form and clicks submit expecting an invite-code error; with the disabled-until-terms button, the click does nothing and no error box appears. **Therefore F1.2 must also check `#terms`.**

- [ ] **Step 1: Replace `app/register/page.tsx` with:**

```tsx
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
```

- [ ] **Step 2: Update e2e F1.1 and F1.2 to check the terms checkbox**

In `e2e/flows/F1-auth.spec.ts`, add `await page.check("#terms");` before the submit click in BOTH F1.1 and F1.2:

```ts
  test("F1.1 — Registration with valid invite code", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();

    await page.goto("/register");
    await page.fill("#businessName", "Test Bisnis E2E");
    await page.fill("#email", `test-${Date.now()}@glim-test.com`);
    await page.fill("#password", "TestPassword123!");
    await page.fill("#inviteCode", process.env.TEST_INVITE_CODE || "");
    await page.check("#terms");
    await page.click('button[type="submit"]');

    // After successful registration, user is redirected
    await page.waitForURL(/\/settings/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/settings/);

    // No error toast visible
    await expect(page.locator('[role="status"]')).not.toBeVisible();
    await ctx.close();
  });

  test("F1.2 — Registration with wrong invite code", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();

    await page.goto("/register");
    await page.fill("#businessName", "Test Bisnis E2E");
    await page.fill("#email", `bad-${Date.now()}@glim-test.com`);
    await page.fill("#password", "TestPassword123!");
    await page.fill("#inviteCode", "WRONGCODE");
    await page.check("#terms");
    await page.click('button[type="submit"]');

    // Should stay on register page with error
    await expect(page).toHaveURL(/\/register/);
    await expect(page.locator(".bg-destructive\\/10")).toBeVisible();

    await ctx.close();
  });
```

F1.3 and F1.4 unchanged.

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 4: Manual smoke check (dev server)**

Run: `pnpm dev`, open `http://localhost:3000/register`.
Expected: "Daftar" button disabled until terms checked; eye toggle works; "Masuk" links to `/login`; card on cream; panel headline "Mulai kelola bisnis kamu hari ini."

- [ ] **Step 5: Commit**

```bash
git add app/register/page.tsx e2e/flows/F1-auth.spec.ts
git commit -m "feat(auth): redesign register page, restore terms gating, update e2e"
```

---

### Task 5: Final verification

**Files:** none new.

- [ ] **Step 1: Lint**

Run: `pnpm lint`
Expected: no errors in `app/login/page.tsx`, `app/register/page.tsx`, `components/auth/auth-brand-panel.tsx`, `components/landing/wa-mockup.tsx`.

- [ ] **Step 2: Build**

Run: `pnpm build`
Expected: success.

- [ ] **Step 3: E2E auth flow (if env configured)**

Run: `pnpm exec playwright test e2e/flows/F1-auth.spec.ts --config e2e/playwright.config.ts`
Expected: F1.1–F1.3 pass (F1.4 pre-existing landing redirect assertion may fail — unrelated, do not fix here; report if it fails).
Requires `TEST_INVITE_CODE`, `TEST_USER_EMAIL`, `TEST_USER_PASS` env vars and a running app per playwright config. If env is missing, skip and note it.

- [ ] **Step 4: Verify landing page unchanged**

Run: `pnpm dev`, open `http://localhost:3000/`.
Expected: hero WA mockup renders identically (extraction was verbatim).
