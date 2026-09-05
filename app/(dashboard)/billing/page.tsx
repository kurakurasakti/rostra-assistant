"use client"

import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  HelpCircle,
  Loader2,
  MessageSquare,
  Plus,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SUBSCRIPTION_PLANS } from "@/lib/payment/config"
import type { Invoice, Subscription, SubscriptionPlan } from "@/types"

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function loadData(silent = false) {
    if (!silent) setRefreshing(true)
    try {
      const res = await fetch("/api/subscription/status")
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memuat status langganan")
      }

      setSubscription(data.subscription)
      setInvoices(data.invoices || [])
    } catch (err) {
      console.error("[BillingPage] Error:", err)
      if (!silent) toast.error("Gagal memuat data langganan")
    } finally {
      setLoading(false)
      if (!silent) setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Memuat info langganan...</p>
      </div>
    )
  }

  const isTrial = subscription?.status === "trialing"
  const isActive = subscription?.status === "active"
  const isExpired = subscription?.status === "expired" || subscription?.status === "past_due"

  // Calculate days remaining
  let daysRemaining = 0
  let expiryDateFormatted = "-"
  if (subscription?.current_period_end) {
    const end = new Date(subscription.current_period_end)
    const now = new Date()
    daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    expiryDateFormatted = new Intl.DateTimeFormat("id-ID", {
      dateStyle: "long",
    }).format(end)
  }

  const activePlanName =
    subscription?.plan_id && SUBSCRIPTION_PLANS[subscription.plan_id]
      ? SUBSCRIPTION_PLANS[subscription.plan_id].name
      : "Glim Pro Bulanan"

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-foreground">
            Langganan & Pembayaran
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola paket langganan Glim Assistant, masa aktif akun, dan riwayat faktur.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(false)}
            disabled={refreshing}
            className="text-xs h-9 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Perbarui
          </Button>
          <Link href="/checkout">
            <Button
              size="sm"
              className="text-xs h-9 gap-1.5 bg-primary hover:bg-primary/90 text-white"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Upgrade / Perpanjang
            </Button>
          </Link>
        </div>
      </div>

      {/* Subscription Status Card */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs relative overflow-hidden">
        {/* Glow accent */}
        <div
          aria-hidden="true"
          className="absolute -right-20 -top-20 w-64 h-64 rounded-full pointer-events-none blur-3xl opacity-40"
          style={{
            background: isActive
              ? "radial-gradient(circle, rgba(26,122,74,0.3) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(112,60,139,0.3) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 grid md:grid-cols-[1.5fr_1fr] gap-6 items-center">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              {isActive ? (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-semibold text-xs py-1 px-3">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                  Langganan Aktif
                </Badge>
              ) : isTrial ? (
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold text-xs py-1 px-3">
                  <Clock className="w-3.5 h-3.5 mr-1 text-amber-600 dark:text-amber-400" />
                  Free Trial (14 Hari)
                </Badge>
              ) : (
                <Badge variant="destructive" className="font-semibold text-xs py-1 px-3">
                  <AlertCircle className="w-3.5 h-3.5 mr-1" />
                  Masa Aktif Berakhir
                </Badge>
              )}
              <span className="text-xs text-muted-foreground font-mono font-medium">
                Paket: {activePlanName}
              </span>
            </div>

            <h2 className="font-display font-bold text-2xl text-foreground mb-2">
              {isActive
                ? "Akun Glim Pro Kamu Beroperasi Penuh"
                : isTrial
                  ? `Sisa Masa Trial: ${daysRemaining} Hari Lagi`
                  : "Masa Langganan Kamu Telah Berakhir"}
            </h2>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              {isActive
                ? `Masa aktif berlaku hingga ${expiryDateFormatted}. Otomatisasi AI WhatsApp dan pengingat jadwal terus berjalan normal.`
                : isTrial
                  ? `Nikmati seluruh fitur Glim tanpa batas hingga ${expiryDateFormatted}. Upgrade sekarang untuk menjaga kelancaran operasional toko.`
                  : "Segera lakukan pembayaran untuk mengaktifkan kembali bot auto-reply AI dan pengingat WhatsApp."}
            </p>

            {isTrial && (
              <div className="mt-4 max-w-sm">
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Progress Trial</span>
                  <span>{14 - daysRemaining} dari 14 hari digunakan</span>
                </div>
                <Progress value={((14 - daysRemaining) / 14) * 100} className="h-2 rounded-full" />
              </div>
            )}
          </div>

          <div className="flex flex-col sm:items-end justify-center gap-3">
            <div className="text-left sm:text-right">
              <p className="text-xs text-muted-foreground">Berlaku sampai</p>
              <p className="font-display font-bold text-lg text-foreground">
                {expiryDateFormatted}
              </p>
            </div>

            <Link href="/checkout" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-11 px-6 rounded-xl font-semibold gap-2 bg-primary hover:bg-primary/90 text-white shadow-sm">
                <Zap className="w-4 h-4" />
                {isActive ? "Perpanjang Masa Aktif" : "Upgrade ke Pro Sekarang"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Invoice History Section */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-display font-bold text-lg text-foreground">
              Riwayat Tagihan & Faktur
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Daftar seluruh transaksi pembayaran langganan kamu.
            </p>
          </div>

          <Link href="/checkout">
            <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Buat Tagihan Baru
            </Button>
          </Link>
        </div>

        {invoices.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-border rounded-xl">
            <CreditCard className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium text-foreground">Belum ada riwayat tagihan</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Tagihan pembayaran akan muncul di sini setelah kamu melakukan checkout.
            </p>
            <Link href="/checkout">
              <Button size="sm" variant="outline" className="text-xs">
                Pilih Paket Langganan
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">No. Invoice</TableHead>
                  <TableHead className="text-xs">Tanggal</TableHead>
                  <TableHead className="text-xs">Paket</TableHead>
                  <TableHead className="text-xs">Total Pembayaran</TableHead>
                  <TableHead className="text-xs">Metode</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const invDate = new Intl.DateTimeFormat("id-ID", {
                    dateStyle: "medium",
                  }).format(new Date(inv.created_at))

                  const invAmount = new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    maximumFractionDigits: 0,
                  }).format(inv.total_amount)

                  let statusBadge = (
                    <Badge
                      variant="outline"
                      className="text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30 text-[10px]"
                    >
                      Menunggu Bayar
                    </Badge>
                  )

                  if (inv.status === "paid") {
                    statusBadge = (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-medium">
                        Lunas
                      </Badge>
                    )
                  } else if (inv.status === "waiting_confirmation") {
                    statusBadge = (
                      <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 text-[10px] font-medium">
                        Menunggu Konfirmasi
                      </Badge>
                    )
                  } else if (inv.status === "expired") {
                    statusBadge = (
                      <Badge
                        variant="outline"
                        className="text-destructive border-destructive/30 text-[10px]"
                      >
                        Kedaluwarsa
                      </Badge>
                    )
                  }

                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs font-medium text-foreground">
                        {inv.invoice_number}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{invDate}</TableCell>
                      <TableCell className="text-xs text-foreground font-medium">
                        {inv.plan_name}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-bold text-foreground">
                        {invAmount}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {inv.payment_method === "bank_transfer_bca" ? "BCA Manual" : "QRIS Manual"}
                      </TableCell>
                      <TableCell>{statusBadge}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/payment/${inv.id}`}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-primary gap-1"
                          >
                            {inv.status === "paid" ? "Lihat Faktur" : "Bayar Sekarang"}
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Payment Support Info */}
      <div className="rounded-2xl border border-border p-6 bg-card dark:bg-card/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-display font-semibold text-sm text-foreground">
              Butuh Bantuan Faktur Pajak atau Pembayaran Khusus?
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hubungi Customer Care Glim untuk permintaan khusus atau invoice korporasi.
            </p>
          </div>
        </div>

        <a
          href="https://wa.me/6281234567890?text=Halo%20Admin%20Glim,%20saya%20butuh%20bantuan%20terkait%20billing"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" size="sm" className="text-xs gap-1.5 h-9 rounded-xl">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            Chat WhatsApp Admin
          </Button>
        </a>
      </div>
    </div>
  )
}
