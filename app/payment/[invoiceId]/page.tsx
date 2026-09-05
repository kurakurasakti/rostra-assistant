"use client"

import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  HelpCircle,
  Loader2,
  MessageSquare,
  QrCode,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Logo } from "@/components/logo"
import { QrisDisplay } from "@/components/payment/qris-display"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { PAYMENT_CONFIG } from "@/lib/payment/config"
import type { PaymentInstruction } from "@/lib/payment/types"
import type { Invoice } from "@/types"

export default function PaymentInvoicePage() {
  const params = useParams()
  const router = useRouter()
  const invoiceId = params.invoiceId as string

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [instructions, setInstructions] = useState<PaymentInstruction | null>(null)
  const [whatsappUrl, setWhatsappUrl] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submittingProof, setSubmittingProof] = useState(false)

  // Proof submission form
  const [senderName, setSenderName] = useState("")
  const [senderBank, setSenderBank] = useState("BCA / QRIS")
  const [proofUrl, setProofUrl] = useState("")
  const [notes, setNotes] = useState("")
  const [proofFile, setProofFile] = useState<File | null>(null)

  // Admin instant confirmation state (for beta convenience)
  const [adminKey, setAdminKey] = useState("")
  const [adminConfirming, setAdminConfirming] = useState(false)

  // Countdown timer
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(
    null,
  )

  async function fetchInvoice(silent = false) {
    if (!silent) setRefreshing(true)
    try {
      const res = await fetch(`/api/payment/${invoiceId}`)
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memuat invoice")
      }

      setInvoice(data.invoice)
      setInstructions(data.instructions)
      setWhatsappUrl(data.whatsappUrl)

      if (data.invoice.sender_name) setSenderName(data.invoice.sender_name)
      if (data.invoice.sender_bank) setSenderBank(data.invoice.sender_bank)
      if (data.invoice.proof_url) setProofUrl(data.invoice.proof_url)
    } catch (err) {
      console.error("[PaymentPage] Error fetching invoice:", err)
      if (!silent) toast.error("Gagal memuat detail pembayaran")
    } finally {
      setLoading(false)
      if (!silent) setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchInvoice()
  }, [invoiceId])

  // Polling every 8 seconds if status is pending or waiting_confirmation
  useEffect(() => {
    if (!invoice || invoice.status === "paid" || invoice.status === "expired") return

    const interval = setInterval(() => {
      fetchInvoice(true)
    }, 8000)

    return () => clearInterval(interval)
  }, [invoice?.status, invoiceId])

  // Calculate countdown
  useEffect(() => {
    if (!invoice?.expires_at) return

    function updateCountdown() {
      const expiry = new Date(invoice!.expires_at).getTime()
      const now = new Date().getTime()
      const diff = expiry - now

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 })
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft({ hours, minutes, seconds })
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [invoice?.expires_at])

  async function handleSubmitProof(e: React.FormEvent) {
    e.preventDefault()
    setSubmittingProof(true)

    try {
      const formData = new FormData()
      if (proofFile) {
        formData.append("file", proofFile)
      }
      if (senderName) formData.append("senderName", senderName)
      if (senderBank) formData.append("senderBank", senderBank)
      if (notes) formData.append("notes", notes)

      const res = await fetch(`/api/payment/${invoiceId}/proof`, {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mengirim bukti pembayaran")
      }

      toast.success("Bukti pembayaran berhasil dikirim! Admin akan memverifikasi segera.")
      setInvoice(data.invoice)
    } catch (err) {
      console.error("[SubmitProof] Error:", err)
      toast.error(err instanceof Error ? err.message : "Gagal mengirim konfirmasi")
    } finally {
      setSubmittingProof(false)
    }
  }

  // Admin Quick Confirmation for Beta

  async function handleAdminQuickConfirm() {
    setAdminConfirming(true)
    try {
      const res = await fetch("/api/payment/confirm-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: invoice!.id,
          adminKey: adminKey || "glim-beta-pass",
          adminNotes: "Konfirmasi instan via Admin Quick Bar",
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal konfirmasi admin")
      }

      toast.success("Pembayaran berhasil dikonfirmasi! Langganan sekarang AKTIF.")
      setInvoice(data.invoice)
    } catch (err) {
      console.error("[AdminConfirm] Error:", err)
      toast.error(err instanceof Error ? err.message : "Konfirmasi gagal")
    } finally {
      setAdminConfirming(false)
    }
  }

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text)
    toast.success(`${label} disalin ke clipboard!`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: "#F8F6F2" }}>
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Memuat tagihan pembayaran...</p>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ backgroundColor: "#F8F6F2" }}>
        <AlertCircle className="w-12 h-12 text-destructive mb-3" />
        <h1 className="font-display font-bold text-xl mb-2">Tagihan Tidak Ditemukan</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Nomor tagihan yang kamu cari tidak valid atau telah dihapus.
        </p>
        <Link href="/billing">
          <Button variant="outline">Kembali ke Billing</Button>
        </Link>
      </div>
    )
  }

  const formattedTotal = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(invoice.total_amount)

  const isPaid = invoice.status === "paid"
  const isWaiting = invoice.status === "waiting_confirmation"

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8F6F2" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md border-b"
        style={{ backgroundColor: "rgba(248,246,242,0.92)", borderColor: "#E8E4DC" }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Logo variant="lockup" tone="light" height={22} />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchInvoice(false)}
              disabled={refreshing}
              className="text-xs gap-1.5 h-8"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Cek Status
            </Button>
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="text-xs h-8">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 sm:py-10 w-full">
        {/* Status Header Banner */}
        <div className="mb-8">
          {isPaid ? (
            <div className="rounded-2xl p-6 bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-fade-up">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-lg text-emerald-950">
                    Pembayaran Berhasil & Akun Telah Aktif! 🎉
                  </h2>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Terima kasih! Paket {invoice.plan_name} kamu sudah aktif dan siap digunakan.
                  </p>
                </div>
              </div>
              <Link href="/dashboard">
                <Button className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm">
                  Buka Dashboard
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          ) : isWaiting ? (
            <div className="rounded-2xl p-5 bg-blue-50 border border-blue-200 text-blue-950 flex items-center gap-3.5 shadow-xs animate-fade-up">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h2 className="font-display font-semibold text-base text-blue-950">
                  Bukti Pembayaran Diterima — Menunggu Konfirmasi Admin
                </h2>
                <p className="text-xs text-blue-800 mt-0.5">
                  Admin kami sedang memverifikasi transfer kamu (biasanya 1–15 menit pada jam kerja). Status akan terupdate otomatis.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-5 bg-white border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs" style={{ borderColor: "#E8E4DC" }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-amber-800 bg-amber-50 border-amber-300 font-semibold text-[11px]">
                    Menunggu Pembayaran
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">{invoice.invoice_number}</span>
                </div>
                <h1 className="font-display font-bold text-xl sm:text-2xl text-foreground">
                  Selesaikan Pembayaran {invoice.plan_name}
                </h1>
              </div>

              {/* Countdown badge */}
              {timeLeft && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-mono font-bold">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>
                    Sisa waktu: {String(timeLeft.hours).padStart(2, "0")}:{String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Two Columns: Payment & Confirmation */}
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 items-start">
          {/* Left Column: QRIS / Bank Transfer Details */}
          <div className="space-y-6">
            <Tabs defaultValue={invoice.payment_method === "bank_transfer_bca" ? "bank" : "qris"} className="w-full">
              <TabsList className="grid grid-cols-2 w-full mb-4 bg-muted/60 p-1 rounded-xl">
                <TabsTrigger value="qris" className="rounded-lg text-xs font-medium gap-1.5">
                  <QrCode className="w-3.5 h-3.5" />
                  QRIS Realtime
                </TabsTrigger>
                <TabsTrigger value="bank" className="rounded-lg text-xs font-medium gap-1.5">
                  Transfer Bank BCA
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: QRIS */}
              <TabsContent value="qris" className="mt-0">
                <QrisDisplay
                  merchantName={PAYMENT_CONFIG.qris.merchantName}
                  invoiceNumber={invoice.invoice_number}
                  totalAmount={invoice.total_amount}
                  uniqueCode={invoice.unique_code}
                />
              </TabsContent>

              {/* Tab 2: Bank Transfer */}
              <TabsContent value="bank" className="mt-0">
                <div
                  className="rounded-2xl border bg-white p-6 shadow-xs space-y-4"
                  style={{ borderColor: "#E8E4DC" }}
                >
                  <div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
                      Rekening Resmi
                    </span>
                    <h3 className="font-display font-bold text-lg text-foreground mt-2">
                      Bank Central Asia (BCA)
                    </h3>
                  </div>

                  <div className="p-4 rounded-xl bg-[#FAF8F4] border border-[#E8E4DC] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Nomor Rekening</p>
                        <p className="font-mono font-bold text-lg text-foreground">8830881234</p>
                        <p className="text-xs text-muted-foreground">a.n PT Rostra Solusi Digital</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyText("8830881234", "Nomor Rekening BCA")}
                        className="text-xs h-8 gap-1.5 rounded-lg"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Salin
                      </Button>
                    </div>

                    <div className="border-t border-[#E8E4DC] pt-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Nominal Transfer Tepat</p>
                        <p className="font-display font-bold text-lg text-primary">{formattedTotal}</p>
                        <p className="text-[10px] text-amber-700 font-medium">
                          *Termasuk 3 digit kode unik ({invoice.unique_code})
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyText(invoice.total_amount.toString(), "Nominal")}
                        className="text-xs h-8 gap-1.5 rounded-lg"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Salin
                      </Button>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1.5 leading-relaxed">
                    <p className="font-medium text-foreground">Panduan Transfer:</p>
                    <p>1. Buka aplikasi m-BCA / ATM BCA kamu.</p>
                    <p>2. Transfer tepat nominal <span className="font-bold text-foreground">{formattedTotal}</span>.</p>
                    <p>3. Ambil screenshot / foto struk bukti transfer.</p>
                    <p>4. Upload bukti transfer di sebelah kanan atau konfirmasi via WhatsApp.</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column: Confirmation Form & WhatsApp */}
          <div className="space-y-5">
            {/* WhatsApp 1-Click Confirmation Card */}
            <div
              className="rounded-2xl border bg-white p-6 shadow-xs text-center"
              style={{ borderColor: "#E8E4DC" }}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="font-display font-semibold text-base text-foreground mb-1">
                Konfirmasi Cepat via WhatsApp
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Kirim bukti transfer langsung ke Admin via WhatsApp untuk aktivasi prioritas.
              </p>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block w-full"
              >
                <Button className="w-full h-11 rounded-xl font-semibold gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white shadow-sm">
                  <MessageSquare className="w-4 h-4" />
                  Konfirmasi ke WhatsApp Admin
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
            </div>

            {/* Upload Proof Form Card */}
            <div
              className="rounded-2xl border bg-white p-6 shadow-xs"
              style={{ borderColor: "#E8E4DC" }}
            >
              <h3 className="font-display font-semibold text-base text-foreground mb-3 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-primary" />
                Upload Bukti Pembayaran di Sini
              </h3>

              <form onSubmit={handleSubmitProof} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="senderName" className="text-xs font-medium">
                    Nama Pemilik Rekening / Pengirim
                  </Label>
                  <Input
                    id="senderName"
                    placeholder="Contoh: Budi Santoso / Melati Studio"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    required
                    className="h-9 text-xs rounded-xl border-[#E8E4DC]"
                    style={{ backgroundColor: "#FAF8F4" }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="senderBank" className="text-xs font-medium">
                    Metode / Bank yang Digunakan
                  </Label>
                  <Input
                    id="senderBank"
                    placeholder="Contoh: QRIS BCA / GoPay / Mandiri"
                    value={senderBank}
                    onChange={(e) => setSenderBank(e.target.value)}
                    className="h-9 text-xs rounded-xl border-[#E8E4DC]"
                    style={{ backgroundColor: "#FAF8F4" }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="proofFile" className="text-xs font-medium">
                    Pilih File Foto Bukti Transfer
                  </Label>
                  <Input
                    id="proofFile"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    className="h-9 text-xs rounded-xl border-[#E8E4DC] cursor-pointer"
                    style={{ backgroundColor: "#FAF8F4" }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs font-medium">
                    Catatan Tambahan (Opsional)
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Contoh: Pembayaran atas nama Studio Foto Melati"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="text-xs rounded-xl border-[#E8E4DC]"
                    style={{ backgroundColor: "#FAF8F4" }}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submittingProof || isPaid}
                  className="w-full h-10 rounded-xl text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-white"
                >
                  {submittingProof ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Mengirim Bukti...
                    </>
                  ) : isWaiting ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Perbarui Bukti Pembayaran
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      Kirim Bukti Pembayaran
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Admin / Developer Beta Testing Toolbar */}
            <div
              className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-4 text-xs text-amber-950"
            >
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                <span>Beta Admin Quick Confirmation</span>
              </div>
              <p className="text-[11px] text-amber-800 mb-3 leading-relaxed">
                Fitur pengembang untuk mencoba simulasi verifikasi manual tanpa harus buka database.
              </p>

              <div className="flex items-center gap-2">
                <Input
                  type="password"
                  placeholder="Admin key (opsional)"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  className="h-8 text-[11px] rounded-lg bg-white border-amber-200"
                />
                <Button
                  size="sm"
                  onClick={handleAdminQuickConfirm}
                  disabled={adminConfirming || isPaid}
                  className="h-8 text-xs bg-amber-700 hover:bg-amber-800 text-white rounded-lg flex-shrink-0"
                >
                  {adminConfirming ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Set Lunas (Approve)"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
