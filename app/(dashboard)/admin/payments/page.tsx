"use client"

import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getAdminToCustomerWhatsAppUrl } from "@/lib/payment/utils"
import type { Invoice } from "@/types"

type EnrichedInvoice = Invoice & {
  business_name?: string
  customer_email?: string
  customer_phone?: string
}

export default function AdminPaymentsPage() {
  const [invoices, setInvoices] = useState<EnrichedInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isForbidden, setIsForbidden] = useState(false)

  // Action states
  const [selectedInvoice, setSelectedInvoice] = useState<EnrichedInvoice | null>(null)
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  async function loadInvoices(silent = false) {
    if (!silent) setRefreshing(true)
    try {
      const url = new URL("/api/admin/invoices", window.location.origin)
      if (statusFilter !== "all") url.searchParams.set("status", statusFilter)
      if (searchQuery.trim()) url.searchParams.set("search", searchQuery.trim())

      const res = await fetch(url.toString())
      if (res.status === 403) {
        setIsForbidden(true)
        setLoading(false)
        return
      }

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Gagal memuat daftar transaksi admin")
      }

      setInvoices(data.invoices || [])
      setIsForbidden(false)
    } catch (err) {
      console.error("[AdminPayments] Error:", err)
      if (!silent) toast.error("Gagal memuat data transaksi")
    } finally {
      setLoading(false)
      if (!silent) setRefreshing(false)
    }
  }

  useEffect(() => {
    loadInvoices()
  }, [statusFilter])

  async function handleApprove(invoice: EnrichedInvoice) {
    setProcessingId(invoice.id)
    try {
      const res = await fetch(`/api/admin/invoices/${invoice.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminNotes: "Disetujui via Admin Payments Dashboard",
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyetujui transaksi")
      }

      toast.success(
        `Pembayaran untuk ${invoice.business_name || invoice.invoice_number} berhasil disetujui & akun telah aktif!`,
      )

      // Update state locally
      setInvoices((prev) =>
        prev.map((i) =>
          i.id === invoice.id
            ? { ...i, status: "paid", paid_at: new Date().toISOString() }
            : i,
        ),
      )
    } catch (err) {
      console.error("[Approve] Error:", err)
      toast.error(err instanceof Error ? err.message : "Gagal menyetujui pembayaran")
    } finally {
      setProcessingId(null)
    }
  }

  async function handleReject() {
    if (!selectedInvoice) return
    setProcessingId(selectedInvoice.id)
    try {
      const res = await fetch(`/api/admin/invoices/${selectedInvoice.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: rejectReason || "Bukti tidak valid / nominal tidak cocok",
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Gagal menolak bukti")
      }

      toast.success("Bukti transfer telah ditolak. Status tagihan dikembalikan ke pending.")
      setRejectModalOpen(false)
      setRejectReason("")

      setInvoices((prev) =>
        prev.map((i) => (i.id === selectedInvoice.id ? { ...i, status: "pending" } : i)),
      )
    } catch (err) {
      console.error("[Reject] Error:", err)
      toast.error(err instanceof Error ? err.message : "Gagal menolak bukti pembayaran")
    } finally {
      setProcessingId(null)
    }
  }

  // Filter metrics
  const waitingCount = invoices.filter((i) => i.status === "waiting_confirmation").length
  const paidInvoices = invoices.filter((i) => i.status === "paid")
  const totalRevenue = paidInvoices.reduce((acc, i) => acc + Number(i.total_amount || 0), 0)

  if (isForbidden) {
    return (
      <div className="p-8 max-w-md mx-auto text-center flex flex-col items-center justify-center min-h-[60vh] animate-fade-up">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="font-display font-bold text-2xl mb-2 text-foreground">Akses Ditolak (403)</h1>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Halaman portal verifikasi pembayaran ini hanya dapat diakses oleh akun Administrator Glim yang terdaftar di konfigurasi sistem (ADMIN_EMAILS).
        </p>
        <Link href="/dashboard">
          <Button className="rounded-xl">Kembali ke Dashboard</Button>
        </Link>
      </div>
    )
  }

  const formattedRevenue = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(totalRevenue)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
              Admin Portal
            </Badge>
            <span className="text-xs text-muted-foreground">Verifikasi Pembayaran Masuk</span>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-foreground">
            Kelola Transaksi & Pembayaran User
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Lihat bukti transfer QRIS/Bank dari customer dan aktifkan akun dalam satu klik.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadInvoices(false)}
            disabled={refreshing}
            className="text-xs h-9 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
          <Link href="/billing">
            <Button variant="secondary" size="sm" className="text-xs h-9">
              Buka Billing User
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Waiting Confirmation */}
        <div
          onClick={() => setStatusFilter("waiting_confirmation")}
          className={`rounded-2xl p-5 border bg-white shadow-xs cursor-pointer transition-all ${
            statusFilter === "waiting_confirmation" ? "border-amber-500 ring-2 ring-amber-500/20" : ""
          }`}
          style={{ borderColor: statusFilter === "waiting_confirmation" ? "#F59E0B" : "#E8E4DC" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Perlu Dikonfirmasi
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-bold text-3xl text-foreground">
              {waitingCount}
            </span>
            <span className="text-xs text-amber-700 font-medium">Transaksi menunggu</span>
          </div>
        </div>

        {/* Paid Invoices */}
        <div
          onClick={() => setStatusFilter("paid")}
          className={`rounded-2xl p-5 border bg-white shadow-xs cursor-pointer transition-all ${
            statusFilter === "paid" ? "border-emerald-500 ring-2 ring-emerald-500/20" : ""
          }`}
          style={{ borderColor: statusFilter === "paid" ? "#10B981" : "#E8E4DC" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Pembayaran Lunas
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-bold text-3xl text-foreground">
              {paidInvoices.length}
            </span>
            <span className="text-xs text-emerald-700 font-medium">User aktif</span>
          </div>
        </div>

        {/* Total Revenue */}
        <div
          className="rounded-2xl p-5 border bg-white shadow-xs"
          style={{ borderColor: "#E8E4DC" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Omset Terverifikasi
            </span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-bold text-2xl text-primary">
              {formattedRevenue}
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        className="rounded-2xl border bg-white p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
        style={{ borderColor: "#E8E4DC" }}
      >
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "Semua" },
            { id: "waiting_confirmation", label: `🟡 Perlu Konfirmasi (${waitingCount})` },
            { id: "paid", label: "🟢 Lunas" },
            { id: "pending", label: "⏳ Menunggu Bayar" },
            { id: "expired", label: "Kedaluwarsa" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                statusFilter === tab.id
                  ? "bg-primary text-white shadow-xs"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 max-w-xs w-full">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Cari invoice, bisnis, pengirim..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadInvoices(false)}
              className="h-8 pl-8 text-xs rounded-xl border-[#E8E4DC]"
              style={{ backgroundColor: "#FAF8F4" }}
            />
          </div>
          <Button size="sm" variant="outline" onClick={() => loadInvoices(false)} className="h-8 text-xs">
            Cari
          </Button>
        </div>
      </div>

      {/* Invoices List Table */}
      <div
        className="rounded-2xl border bg-white p-6 shadow-xs"
        style={{ borderColor: "#E8E4DC" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-base text-foreground">
            Daftar Transaksi Masuk
          </h3>
          <span className="text-xs text-muted-foreground">
            Menampilkan {invoices.length} transaksi
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Memuat data transaksi...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-xl" style={{ borderColor: "#E8E4DC" }}>
            <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium text-foreground">Tidak ada transaksi ditemukan</p>
            <p className="text-xs text-muted-foreground mt-1">
              {statusFilter !== "all" ? "Coba ganti filter status di atas." : "Belum ada transaksi yang dibuat oleh user."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">No. Invoice & Tanggal</TableHead>
                  <TableHead className="text-xs">Bisnis / Pengirim</TableHead>
                  <TableHead className="text-xs">Paket</TableHead>
                  <TableHead className="text-xs">Nominal Transfer</TableHead>
                  <TableHead className="text-xs">Bukti Transfer</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Aksi Verifikasi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const dateStr = new Intl.DateTimeFormat("id-ID", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(inv.created_at))

                  const amountStr = new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    maximumFractionDigits: 0,
                  }).format(inv.total_amount)

                  const isWaiting = inv.status === "waiting_confirmation"
                  const isPaid = inv.status === "paid"

                  const waNotificationUrl = getAdminToCustomerWhatsAppUrl(
                    inv,
                    inv.business_name,
                    inv.customer_phone,
                  )

                  return (
                    <TableRow key={inv.id} className={isWaiting ? "bg-amber-50/40" : ""}>
                      {/* Invoice & Date */}
                      <TableCell>
                        <p className="font-mono text-xs font-bold text-foreground">
                          {inv.invoice_number}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{dateStr}</p>
                      </TableCell>

                      {/* Business & Sender */}
                      <TableCell>
                        <p className="text-xs font-semibold text-foreground">
                          {inv.business_name || "Bisnis Belum Diset"}
                        </p>
                        {inv.sender_name && (
                          <p className="text-[11px] text-muted-foreground">
                            Pengirim: <span className="font-medium text-foreground">{inv.sender_name}</span> ({inv.sender_bank || "QRIS"})
                          </p>
                        )}
                        {inv.customer_notes && (
                          <p className="text-[10px] text-amber-800 italic mt-0.5">
                            "{inv.customer_notes}"
                          </p>
                        )}
                      </TableCell>

                      {/* Plan */}
                      <TableCell className="text-xs text-foreground font-medium">
                        {inv.plan_name}
                      </TableCell>

                      {/* Amount with unique code highlight */}
                      <TableCell>
                        <p className="font-mono font-bold text-xs text-foreground">{amountStr}</p>
                        {inv.unique_code > 0 && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded">
                            Kode unik: {inv.unique_code}
                          </span>
                        )}
                      </TableCell>

                      {/* Proof Preview */}
                      <TableCell>
                        {inv.proof_url ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPreviewProofUrl(inv.proof_url)}
                            className="h-7 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/5"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            Lihat Foto
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">
                            Belum upload
                          </span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {isPaid ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                            Lunas & Aktif
                          </Badge>
                        ) : isWaiting ? (
                          <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-semibold text-[10px] animate-pulse">
                            Perlu Verifikasi
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-[10px]">
                            {inv.status}
                          </Badge>
                        )}
                      </TableCell>

                      {/* Action buttons */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isWaiting && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(inv)}
                                disabled={processingId === inv.id}
                                className="h-8 text-xs font-semibold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs"
                              >
                                {processingId === inv.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    Approve
                                  </>
                                )}
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedInvoice(inv)
                                  setRejectModalOpen(true)
                                }}
                                disabled={processingId === inv.id}
                                className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}

                          {isPaid && (
                            <a
                              href={waNotificationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block"
                            >
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 text-[#25D366] border-[#25D366]/40 hover:bg-[#25D366]/10"
                              >
                                <MessageSquare className="w-3 h-3" />
                                Kabari via WA
                              </Button>
                            </a>
                          )}

                          {!isWaiting && !isPaid && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleApprove(inv)}
                              disabled={processingId === inv.id}
                              className="h-7 text-xs text-muted-foreground hover:text-foreground"
                            >
                              Force Approve
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Proof Preview Modal */}
      <Dialog open={!!previewProofUrl} onOpenChange={(open) => !open && setPreviewProofUrl(null)}>
        <DialogContent className="max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-base">
              Foto Bukti Pembayaran
            </DialogTitle>
            <DialogDescription className="text-xs">
              Periksa nominal transfer, nama pengirim, dan tanggal struk pembayaran.
            </DialogDescription>
          </DialogHeader>

          <div className="my-3 max-h-[70vh] overflow-auto rounded-xl border bg-muted/20 flex items-center justify-center p-2">
            {previewProofUrl && (
              <img
                src={previewProofUrl}
                alt="Bukti Transfer"
                className="max-h-[60vh] max-w-full rounded-lg object-contain"
              />
            )}
          </div>

          <DialogFooter className="flex justify-between items-center sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewProofUrl(null)}
              className="text-xs"
            >
              Tutup
            </Button>
            {previewProofUrl && (
              <a
                href={previewProofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
              >
                Buka Ukuran Penuh
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Reason Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-base text-destructive">
              Tolak Bukti Pembayaran
            </DialogTitle>
            <DialogDescription className="text-xs">
              Invoice akan dikembalikan ke status pending agar customer dapat mengupload ulang.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 my-2">
            <label className="text-xs font-medium text-foreground">
              Alasan Penolakan (akan dicatat di invoice):
            </label>
            <Input
              placeholder="Contoh: Nominal kurang Rp 500 / Foto struk buram"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="text-xs"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectModalOpen(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleReject}
              disabled={processingId !== null}
              className="text-xs"
            >
              Konfirmasi Tolak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
