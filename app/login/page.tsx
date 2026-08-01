"use client"

import { AlertCircle, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { AuthAmbientBg } from "@/components/auth/auth-ambient-bg"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ])
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const supabase = createClient()
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        10000,
        "signInWithPassword",
      )

      if (error) {
        console.error("[login] signInWithPassword failed:", error)
        setError(`Email atau password salah. (${error.message})`)
        setLoading(false)
        return
      }

      const { data: profile, error: profileError } = await withTimeout(
        Promise.resolve(supabase.from("profiles").select("onboarding_complete").single()),
        10000,
        "profile fetch",
      )

      if (profileError) {
        console.error("[login] profile fetch failed:", profileError)
      }

      if (profile && !profile.onboarding_complete) {
        router.push("/settings")
      } else {
        router.push("/dashboard")
      }
      router.refresh()
    } catch (err) {
      console.error("[login] unexpected error:", err)
      setError(`Login gagal: ${err instanceof Error ? err.message : "unknown error"}`)
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-6 py-12"
      style={{ backgroundColor: "#F8F6F2" }}
    >
      <AuthAmbientBg goldOpacity={0.22} aubergineOpacity={0.26} />

      <div className="relative z-10 w-full flex flex-col items-center">
        <div className="flex items-center mb-8">
          <Logo variant="lockup" tone="light" height={30} />
        </div>

        <div className="w-full max-w-md animate-fade-up">
          <div
            className="rounded-2xl bg-white border p-8 shadow-sm"
            style={{ borderColor: "#E8E4DC" }}
          >
            <div className="mb-7">
              <h2 className="font-display font-bold text-2xl tracking-tight">
                Selamat datang kembali 👋
              </h2>
              <p className="text-muted-foreground text-sm mt-1">Masuk untuk melanjutkan ke Glim</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4" suppressHydrationWarning>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="kamu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-10 rounded-xl border-[#E8E4DC]"
                  style={{ backgroundColor: "#FAF8F4" }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-10 pr-10 rounded-xl border-[#E8E4DC]"
                    style={{ backgroundColor: "#FAF8F4" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
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
                {loading ? "Sebentar ya..." : "Masuk"}
              </Button>
            </form>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Belum punya akun?{" "}
            <Link href="/register" className="text-primary font-medium hover:underline">
              Daftar di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
