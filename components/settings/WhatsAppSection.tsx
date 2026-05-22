"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { CheckCircle2, Loader2, Link2, Link2Off, QrCode } from "lucide-react"

type WaStep = "idle" | "generating" | "scanning" | "connected"

export default function WhatsAppSection() {
  const [waStep, setWaStep] = useState<WaStep>("idle")
  const [waNumber, setWaNumber] = useState("")
  const [qrBase64, setQrBase64] = useState("")
  const [connectedNumber, setConnectedNumber] = useState("")
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
          setWaStep("connected")
          if (d.number) setConnectedNumber(d.number)
        }
      })
      .catch(() => {})
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

  return (
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
  )
}
