"use client"

import {
  ArrowLeft,
  Building2,
  Check,
  CreditCard,
  HelpCircle,
  Loader2,
  Lock,
  QrCode,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { toast } from "sonner"
import { Logo } from "@/components/logo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SUBSCRIPTION_PLANS } from "@/lib/payment/config"
import { createClient } from "@/lib/supabase/client"
import type { PaymentMethodType, SubscriptionPlan } from "@/types"

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialPlanId = searchParams.get("plan") || "glim_pro_monthly"

  const [selectedPlanId, setSelectedPlanId] = useState<string>(initialPlanId)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("qris_manual")
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [authChecking, setAuthChecking] = useState(true)

  const plan: SubscriptionPlan =
    SUBSCRIPTION_PLANS[selectedPlanId] || SUBSCRIPTION_PLANS.glim_pro_monthly

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      setAuthChecking(false)
    }
    checkAuth()
  }, [])

  async function handleProceed() {
    if (!user) {
      toast.error("Silakan login atau daftar terlebih dahulu untuk melanjutkan.")
      router.push(`/login?redirect=/checkout?plan=${selectedPlanId}`)
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/payment/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlanId,
          paymentMethod,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal membuat tagihan pembayaran")
      }

      toast.success("Tagihan pembayaran berhasil dibuat!")
      // If external checkout url exists (e.g. Xendit), redirect there, else go to manual payment page
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        router.push(`/payment/${data.invoice.id}`)
      }
    } catch (err) {
      console.error("[Checkout] Error:", err)
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan saat memproses pembayaran")
      setLoading(false)
    }
  }

  const formattedPrice = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(plan.price)

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8F6F2" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md border-b"
        style={{ backgroundColor: "rgba(248,246,242,0.92)", borderColor: "#E8E4DC" }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/pricing"
              className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <Logo variant="lockup" tone="light" height={22} />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pembayaran Aman & Terenkripsi</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-10 w-full">
        <div className="mb-8">
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-foreground">
            Checkout Langganan
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Pilih paket dan metode pembayaran yang kamu inginkan.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8 items-start">
          {/* Left Column: Plan & Method Selection */}
          <div className="space-y-6">
            {/* Plan Selector Card */}
            <div
              className="rounded-2xl border bg-white p-6 shadow-xs"
              style={{ borderColor: "#E8E4DC" }}
            >
              <h2 className="font-display font-semibold text-base mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                1. Pilih Periode Langganan
              </h2>

              <div className="space-y-3">
                {Object.values(SUBSCRIPTION_PLANS).map((p) => {
                  const isSelected = selectedPlanId === p.id
                  const isAnnual = p.interval === "year"
                  const priceStr = new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    maximumFractionDigits: 0,
                  }).format(p.price)

                  return (
                    <label
                      key={p.id}
                      onClick={() => setSelectedPlanId(p.id)}
                      className={`flex items-start justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-border/80 bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                            isSelected ? "border-primary bg-primary text-white" : "border-muted-foreground"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-display font-semibold text-sm text-foreground">
                              {p.name}
                            </span>
                            {isAnnual && (
                              <Badge className="bg-amber-500 hover:bg-amber-500 text-slate-900 text-[10px] font-bold">
                                Hemat 17% (2 Bulan Gratis)
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 ml-3">
                        <span className="font-display font-bold text-base text-foreground">
                          {priceStr}
                        </span>
                        <span className="text-[11px] text-muted-foreground block">
                          /{p.interval === "year" ? "tahun" : "bulan"}
                        </span>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Payment Method Selector Card */}
            <div
              className="rounded-2xl border bg-white p-6 shadow-xs"
              style={{ borderColor: "#E8E4DC" }}
            >
              <h2 className="font-display font-semibold text-base mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                2. Pilih Metode Pembayaran
              </h2>

              <div className="space-y-3">
                {/* QRIS Manual Option */}
                <label
                  onClick={() => setPaymentMethod("qris_manual")}
                  className={`flex items-start gap-3.5 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === "qris_manual"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-border/80 bg-white"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center flex-shrink-0 ${
                      paymentMethod === "qris_manual"
                        ? "border-primary bg-primary text-white"
                        : "border-muted-foreground"
                    }`}
                  >
                    {paymentMethod === "qris_manual" && <Check className="w-3 h-3" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-semibold text-sm text-foreground flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-primary" />
                        QRIS (E-Wallet & Mobile Banking)
                      </span>
                      <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200">
                        Rekomendasi Beta
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Scan kode QRIS menggunakan GoPay, OVO, ShopeePay, Dana, BCA Mobile, Livin Mandiri, atau bank apapun.
                    </p>
                  </div>
                </label>

                {/* Manual Bank Transfer BCA Option */}
                <label
                  onClick={() => setPaymentMethod("bank_transfer_bca")}
                  className={`flex items-start gap-3.5 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === "bank_transfer_bca"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-border/80 bg-white"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center flex-shrink-0 ${
                      paymentMethod === "bank_transfer_bca"
                        ? "border-primary bg-primary text-white"
                        : "border-muted-foreground"
                    }`}
                  >
                    {paymentMethod === "bank_transfer_bca" && <Check className="w-3 h-3" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-semibold text-sm text-foreground flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary" />
                        Transfer Bank BCA Manual
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">BCA</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Transfer manual via ATM / m-BCA dengan konfirmasi cepat via WhatsApp.
                    </p>
                  </div>
                </label>

                {/* Xendit Option (Ready for future switch) */}
                <label
                  onClick={() => setPaymentMethod("xendit_invoice")}
                  className={`flex items-start gap-3.5 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === "xendit_invoice"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-border/80 bg-white"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center flex-shrink-0 ${
                      paymentMethod === "xendit_invoice"
                        ? "border-primary bg-primary text-white"
                        : "border-muted-foreground"
                    }`}
                  >
                    {paymentMethod === "xendit_invoice" && <Check className="w-3 h-3" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-semibold text-sm text-foreground flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-primary" />
                        Xendit Payment Gateway (Virtual Account & CC)
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        Instant Auto-verify
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Virtual Account otomatis & Kartu Kredit. Akun aktif otomatis 24 jam.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Action */}
          <div className="space-y-4">
            <div
              className="rounded-2xl border bg-white p-6 shadow-sm sticky top-20"
              style={{ borderColor: "#E8E4DC" }}
            >
              <h3 className="font-display font-bold text-base mb-4 text-foreground">
                Ringkasan Pesanan
              </h3>

              <div className="space-y-3 pb-4 border-b border-border text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{plan.name}</span>
                  <span className="font-medium text-foreground">{formattedPrice}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Periode</span>
                  <span>1 {plan.interval === "year" ? "Tahun" : "Bulan"}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-600 font-medium">
                  <span>Biaya Admin</span>
                  <span>Gratis (Rp 0)</span>
                </div>
              </div>

              <div className="pt-4 mb-6">
                <div className="flex items-baseline justify-between">
                  <span className="font-display font-bold text-base text-foreground">Total Tagihan</span>
                  <div className="text-right">
                    <span className="font-display font-bold text-xl text-primary">
                      {formattedPrice}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      *Akan ditambahkan 3 digit kode unik saat invoice dibuat
                    </span>
                  </div>
                </div>
              </div>

              {!authChecking && !user && (
                <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                  Kamu belum login. Setelah klik bayar, kamu akan diarahkan untuk login atau mendaftar gratis terlebih dahulu.
                </div>
              )}

              <Button
                onClick={handleProceed}
                disabled={loading}
                className="w-full h-12 rounded-xl text-sm font-semibold gap-2 bg-primary hover:bg-primary/90 text-white shadow-md"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyiapkan Invoice...
                  </>
                ) : (
                  <>
                    Lanjutkan ke Pembayaran
                    <Check className="w-4 h-4" />
                  </>
                )}
              </Button>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Garansi aktivasi cepat & aman</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}
