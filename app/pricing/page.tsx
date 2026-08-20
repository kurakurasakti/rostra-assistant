"use client"

import { ArrowRight, Check, Sparkles, Zap } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Footer } from "@/components/footer"
import { Logo } from "@/components/logo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SUBSCRIPTION_PLANS } from "@/lib/payment/config"

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"month" | "year">("month")

  const monthlyPlan = SUBSCRIPTION_PLANS.glim_pro_monthly
  const annualPlan = SUBSCRIPTION_PLANS.glim_pro_annual

  const currentPlan = billingCycle === "month" ? monthlyPlan : annualPlan

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8F6F2" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md border-b"
        style={{ backgroundColor: "rgba(248,246,242,0.92)", borderColor: "#E8E4DC" }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Logo variant="lockup" tone="light" height={22} />
          <nav className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm px-3 py-1.5 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            >
              Beranda
            </Link>
            <Link
              href="/login"
              className="text-sm px-3 py-1.5 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium px-4 py-2 rounded-lg transition-all hover:opacity-90 bg-primary text-primary-foreground"
            >
              Daftar Gratis
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-16 sm:py-20 w-full">
        <div className="text-center mb-12 animate-fade-up">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full mb-4"
            style={{ backgroundColor: "#EDE0F5", color: "#4a2560" }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Investasi Terbaik untuk Efisiensi Bisnis
          </span>
          <h1 className="font-display font-bold text-3xl sm:text-5xl tracking-tight text-foreground mb-4">
            Harga Sederhana, Hasil Nyata.
          </h1>
          <p className="text-muted-foreground text-base max-w-lg mx-auto">
            Semua fitur otomatisasi WhatsApp & AI Glim sudah termasuk dalam satu paket lengkap.
            Tanpa biaya tersembunyi.
          </p>

          {/* Billing Cycle Switcher */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <div
              className="inline-flex items-center p-1 rounded-xl border bg-white shadow-xs"
              style={{ borderColor: "#E8E4DC" }}
            >
              <button
                type="button"
                onClick={() => setBillingCycle("month")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  billingCycle === "month"
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Bayar Bulanan
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("year")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  billingCycle === "year"
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Bayar Tahunan
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-900">
                  Hemat 17%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid md:grid-cols-2 gap-8 items-stretch max-w-3xl mx-auto">
          {/* Free Trial Card */}
          <div
            className="rounded-2xl p-8 border bg-white flex flex-col justify-between"
            style={{ borderColor: "#E8E4DC" }}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display font-bold text-xl text-foreground">Free Trial</h3>
                <Badge variant="outline" className="text-xs">
                  14 Hari
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Coba seluruh fitur Glim tanpa risiko sebelum berlangganan.
              </p>

              <div className="mb-6">
                <span className="font-display font-bold text-4xl text-foreground">Rp 0</span>
                <span className="text-xs text-muted-foreground ml-2">selama 14 hari</span>
              </div>

              <ul className="space-y-3 mb-8">
                {[
                  "Akses penuh AI Assistant WhatsApp",
                  "Integrasi 1 Nomor WhatsApp bisnis",
                  "Auto-draft balasan sesuai brand voice",
                  "Pengingat jadwal & pembayaran otomatis",
                  "Import klien dari Excel/CSV",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-foreground">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <Link href="/register">
              <Button variant="outline" className="w-full h-11 rounded-xl font-medium">
                Mulai Trial Gratis
              </Button>
            </Link>
          </div>

          {/* Glim Pro Card */}
          <div
            className="rounded-2xl p-8 border-2 bg-white flex flex-col justify-between relative shadow-lg"
            style={{ borderColor: "#703c8b" }}
          >
            <div className="absolute -top-3.5 right-6">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary text-white shadow-xs">
                Paling Populer
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display font-bold text-xl text-foreground">
                  {billingCycle === "month" ? "Glim Pro Bulanan" : "Glim Pro Tahunan"}
                </h3>
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {billingCycle === "month"
                  ? "Langganan fleksibel tanpa komitmen jangka panjang."
                  : "Hemat 2 bulan dengan langganan tahunan."}
              </p>

              <div className="mb-6">
                <span className="font-display font-bold text-4xl text-foreground">
                  {billingCycle === "month" ? "Rp 299.000" : "Rp 2.990.000"}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  /{billingCycle === "month" ? "bulan" : "tahun"}
                </span>
                {billingCycle === "year" && (
                  <p className="text-xs text-emerald-600 font-medium mt-1">
                    Setara Rp 249.000/bulan (Hemat Rp 598.000)
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {currentPlan.features.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-foreground">
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: "#EDE0F5", color: "#703c8b" }}
                    >
                      <Check className="w-2.5 h-2.5" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <Link href={`/checkout?plan=${currentPlan.id}`}>
              <Button className="w-full h-11 rounded-xl font-medium gap-2 bg-primary hover:bg-primary/90 text-white shadow-sm">
                Pilih Paket Ini
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Payment Methods Info Box */}
        <div
          className="mt-14 rounded-2xl border p-6 text-center max-w-3xl mx-auto bg-white/70"
          style={{ borderColor: "#E8E4DC" }}
        >
          <h4 className="font-display font-semibold text-base mb-2">Metode Pembayaran Mudah & Fleksibel</h4>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-4">
            Mendukung QRIS (GoPay, OVO, ShopeePay, Dana, BCA, Mandiri, dll) dan Transfer Bank Manual dengan konfirmasi cepat.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {["QRIS Realtime", "BCA", "Mandiri", "GoPay", "OVO", "ShopeePay", "Dana"].map((m) => (
              <Badge key={m} variant="secondary" className="text-xs py-1 px-2.5">
                {m}
              </Badge>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
