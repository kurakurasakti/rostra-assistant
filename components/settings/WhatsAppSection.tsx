"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { CheckCircle2, Loader2, Link2, Link2Off, QrCode, Bell } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Skeleton } from "@/components/ui/skeleton"

type WaStep = "checking" | "idle" | "generating" | "scanning" | "connected"

export default function WhatsAppSection({
  initialNotificationNumber,
}: {
  initialNotificationNumber?: string | null
}) {
  const [waStep, setWaStep] = useState<WaStep>("checking")
  const [waNumber, setWaNumber] = useState("")
  const [qrBase64, setQrBase64] = useState("")
  const [connectedNumber, setConnectedNumber] = useState("")
  const [notificationNumber, setNotificationNumber] = useState(initialNotificationNumber ?? "")
  const [savingNotif, setSavingNotif] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  useEffect(() => {
    fetch("/api/whatsapp/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.connected) {
          setConnectedNumber(d.number ?? "")
          setWaStep("connected")
        } else {
          setWaStep("idle")
        }
      })
      .catch(() => setWaStep("idle"))
    return () => stopPolling()
  }, [stopPolling])

  async function handleGenerateQR() {
    if (!waNumber.trim()) return
    setWaStep("generating")
    const res = await fetch("/api/whatsapp/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ whatsapp_number: waNumber.trim() }),
    })
    const data = await res.json()
    if (!res.ok || data.error) {
      toast.error(data.error ?? "Gagal membuat QR.")
      setWaStep("idle")
      return
    }
    if (!data.qr) {
      toast.error("QR tidak tersedia. Coba lagi.")
      setWaStep("idle")
      return
    }
    setQrBase64(data.qr)
    setWaStep("scanning")
    startPolling()
  }

  function startPolling() {
    stopPolling()
    pollingRef.current = setInterval(async () => {
      const res = await fetch("/api/whatsapp/status")
      const data = await res.json()
      if (data.connected) {
        stopPolling()
        setConnectedNumber(data.number ?? waNumber)
        setWaStep("connected")
        toast.success("WhatsApp berhasil terhubung!")
      }
    }, 3000)
  }

  async function handleDisconnect() {
    stopPolling()
    const res = await fetch("/api/whatsapp/disconnect", { method: "POST" })
    if (res.ok) {
      setWaStep("idle")
      setQrBase64("")
      setConnectedNumber("")
      toast.success("WhatsApp diputus.")
    } else {
      toast.error("Gagal memutus koneksi.")
    }
  }

  async function handleSaveNotification() {
    setSavingNotif(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSavingNotif(false); return }

    const { error } = await supabase
      .from("profiles")
      .update({ notification_wa_number: notificationNumber.trim() || null })
      .eq("id", user.id)

    if (error) toast.error("Gagal menyimpan.")
    else toast.success("Nomor notifikasi disimpan.")
    setSavingNotif(false)
  }

  return (
    <div className="space-y-6">
      {/* QR Connect section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-semibold text-sm">Koneksi WhatsApp</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Hubungkan nomor WhatsApp bisnis via QR scan.</p>
          </div>
          {waStep === "connected" ? (
            <Link2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <Link2Off className="w-4 h-4 text-muted-foreground" />
          )}
        </div>

        {waStep === "checking" && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-9 w-28" />
          </div>
        )}

        {waStep === "idle" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Nomor WhatsApp Bisnis</Label>
              <Input placeholder="628123456789" value={waNumber} onChange={(e) => setWaNumber(e.target.value)} className="h-10" />
              <p className="text-xs text-muted-foreground">Format internasional tanpa +, contoh: 628123456789</p>
            </div>
            <Button onClick={handleGenerateQR} disabled={!waNumber.trim()} className="gap-2">
              <QrCode className="w-4 h-4" />
              Generate QR
            </Button>
          </div>
        )}

        {waStep === "generating" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Membuat QR code...
          </div>
        )}

        {waStep === "scanning" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Scan QR ini dengan WhatsApp di nomor <strong>{waNumber}</strong>. Menunggu scan...
            </p>
            <div className="flex items-start gap-4">
              <div className="rounded-lg border border-border bg-white p-2 inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrBase64?.startsWith("http") || qrBase64?.startsWith("data:") ? qrBase64 : `data:image/png;base64,${qrBase64}`} alt="QR Code WhatsApp" className="w-48 h-48" />
              </div>
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Menunggu scan...
                </div>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { stopPolling(); setWaStep("idle"); setQrBase64("") }}>
                  Batal
                </Button>
              </div>
            </div>
          </div>
        )}

        {waStep === "connected" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              WhatsApp terhubung{connectedNumber ? `: +${connectedNumber.slice(0, 2)} ${connectedNumber.slice(2, 6)} ${connectedNumber.slice(6, 9)} ${connectedNumber.slice(9)}` : ""}
            </div>
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs text-destructive hover:text-destructive" onClick={handleDisconnect}>
              Putuskan Koneksi
            </Button>
          </div>
        )}
      </div>

      {/* Notification number section */}
      <div className="pt-5 border-t border-border space-y-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <div>
            <h2 className="font-display font-semibold text-sm">Notifikasi Eskalasi</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Rostra kirim WA ke nomor ini saat ada pesan sensitif atau percobaan manipulasi AI.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Nomor WA Pribadi (untuk notifikasi)</Label>
          <Input
            placeholder="628123456789"
            value={notificationNumber}
            onChange={(e) => setNotificationNumber(e.target.value)}
            className="h-10"
          />
          <p className="text-xs text-muted-foreground">
            Kosongkan jika tidak ingin menerima notifikasi. Beda dari nomor bisnis WA di atas.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleSaveNotification}
          disabled={savingNotif}
          className="h-8 text-xs gap-1.5"
        >
          {savingNotif ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
          Simpan Nomor Notifikasi
        </Button>
      </div>
    </div>
  )
}
