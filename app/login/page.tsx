"use client"

import { AlertCircle, Eye, EyeOff, Lock, ShieldAlert } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { AuthAmbientBg } from "@/components/auth/auth-ambient-bg"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [trapField, setTrapField] = useState("") // Bot honeypot
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [warning, setWarning] = useState("")
  const [loading, setLoading] = useState(false)
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null)

  // Live countdown timer for rate limit lockout
  useEffect(() => {
    if (countdownSeconds === null || countdownSeconds <= 0) return

    const timer = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev === null || prev <= 1) {
          setError("")
          return null
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [countdownSeconds])

  function formatTime(totalSeconds: number): string {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (countdownSeconds && countdownSeconds > 0) return

    setLoading(true)
    setError("")
    setWarning("")

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          trapField, // Should be empty for real humans
        }),
      })

      const data = await res.json()

      if (res.status === 429) {
        // Rate limited / Locked out
        const retryAfter = data.retryAfterSeconds || 900
        setCountdownSeconds(retryAfter)
        setError(data.error || "Terlalu banyak percobaan gagal. Akun dikunci sementara demi keamanan.")
        setLoading(false)
        return
      }

      if (!res.ok) {
        setError(data.error || "Email atau password salah.")
        setLoading(false)
        return
      }

      // Success
      router.push(data.redirectTo || "/dashboard")
      router.refresh()
    } catch (err) {
      console.error("[login] unexpected error:", err)
      setError("Gagal terhubung ke server. Periksa koneksi internet kamu.")
      setLoading(false)
    }
  }

  const isLocked = countdownSeconds !== null && countdownSeconds > 0

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
              <h2 className="font-display font-bold text-2xl tracking-tight text-foreground">
                Selamat datang kembali 👋
              </h2>
              <p className="text-muted-foreground text-sm mt-1">Masuk untuk melanjutkan ke Glim</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4" suppressHydrationWarning>
              {/* Invisible Honeypot field to trap automated brute-force bots */}
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "-9999px",
                  top: "-9999px",
                  opacity: 0,
                  pointerEvents: "none",
                }}
              >
                <input
                  type="text"
                  name="website_url_field"
                  tabIndex={-1}
                  autoComplete="off"
                  value={trapField}
                  onChange={(e) => setTrapField(e.target.value)}
                />
              </div>

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
                  disabled={loading || isLocked}
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
                    disabled={loading || isLocked}
                    autoComplete="current-password"
                    className="h-10 pr-10 rounded-xl border-[#E8E4DC]"
                    style={{ backgroundColor: "#FAF8F4" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={loading || isLocked}
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Lockout Notice with Live Timer */}
              {isLocked && (
                <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 border border-destructive/25 p-3.5 text-xs text-destructive animate-fade-up">
                  <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">Akun Dikunci Sementara</p>
                    <p className="leading-relaxed">
                      Terlalu banyak percobaan login yang gagal. Silakan tunggu:
                    </p>
                    <div className="font-mono font-bold text-sm bg-destructive/15 px-2.5 py-1 rounded-md inline-block mt-1">
                      ⏳ {formatTime(countdownSeconds)}
                    </div>
                  </div>
                </div>
              )}

              {/* Error Notice */}
              {error && !isLocked && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive animate-fade-up">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Warning Notice */}
              {warning && !isLocked && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/25 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400 animate-fade-up">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{warning}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-10 font-medium font-display"
                disabled={loading || isLocked}
              >
                {isLocked
                  ? `Tunggu (${formatTime(countdownSeconds)})`
                  : loading
                    ? "Memverifikasi..."
                    : "Masuk"}
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
