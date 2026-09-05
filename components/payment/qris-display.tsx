"use client"

import { Check, Copy, Download, QrCode } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

interface QrisDisplayProps {
  merchantName: string
  invoiceNumber: string
  totalAmount: number
  uniqueCode: number
}

export function QrisDisplay({
  merchantName,
  invoiceNumber,
  totalAmount,
  uniqueCode,
}: QrisDisplayProps) {
  const [copied, setCopied] = useState(false)

  const formattedAmount = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(totalAmount)

  function copyAmount() {
    navigator.clipboard.writeText(totalAmount.toString())
    setCopied(true)
    toast.success("Nominal pembayaran disalin!")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col items-center">
      {/* QRIS Card Frame */}
      <div
        className="w-full max-w-sm rounded-2xl border bg-white p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden"
        style={{ borderColor: "#E8E4DC" }}
      >
        {/* Top QRIS Header banner */}
        <div className="w-full flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: "#E8E4DC" }}>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-lg tracking-wider text-[#EE2E24]">QRIS</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold border-l pl-2 ml-1">
              GPN
            </span>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            QRIS Dinamis
          </span>
        </div>

        {/* Merchant Info */}
        <div className="mb-3">
          <p className="font-display font-bold text-base text-foreground uppercase tracking-tight">
            {merchantName}
          </p>
          <p className="text-[11px] text-muted-foreground font-mono">
            NMID: ID1020268839120
          </p>
        </div>

        {/* QR Code container */}
        <div className="relative p-4 rounded-xl bg-white border-2 border-dashed border-[#703c8b]/30 mb-4 flex flex-col items-center justify-center">
          {/* Stylized QR SVG */}
          <svg
            viewBox="0 0 200 200"
            className="w-52 h-52 text-foreground"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background */}
            <rect width="200" height="200" fill="#ffffff" />
            
            {/* Top-left Corner Square */}
            <rect x="10" y="10" width="50" height="50" fill="#1A1A18" rx="4" />
            <rect x="18" y="18" width="34" height="34" fill="#ffffff" rx="2" />
            <rect x="26" y="26" width="18" height="18" fill="#703c8b" rx="2" />

            {/* Top-right Corner Square */}
            <rect x="140" y="10" width="50" height="50" fill="#1A1A18" rx="4" />
            <rect x="148" y="18" width="34" height="34" fill="#ffffff" rx="2" />
            <rect x="156" y="26" width="18" height="18" fill="#703c8b" rx="2" />

            {/* Bottom-left Corner Square */}
            <rect x="10" y="140" width="50" height="50" fill="#1A1A18" rx="4" />
            <rect x="18" y="148" width="34" height="34" fill="#ffffff" rx="2" />
            <rect x="26" y="156" width="18" height="18" fill="#703c8b" rx="2" />

            {/* Simulated Data Pattern Grid */}
            <rect x="70" y="20" width="10" height="10" fill="#1A1A18" />
            <rect x="90" y="20" width="20" height="10" fill="#1A1A18" />
            <rect x="120" y="20" width="10" height="10" fill="#1A1A18" />

            <rect x="70" y="40" width="20" height="10" fill="#703c8b" />
            <rect x="100" y="40" width="10" height="10" fill="#1A1A18" />
            <rect x="120" y="40" width="10" height="10" fill="#703c8b" />

            <rect x="20" y="70" width="10" height="20" fill="#1A1A18" />
            <rect x="40" y="70" width="20" height="10" fill="#1A1A18" />
            <rect x="70" y="70" width="20" height="20" fill="#1A1A18" />
            <rect x="100" y="70" width="30" height="10" fill="#703c8b" />
            <rect x="140" y="70" width="20" height="10" fill="#1A1A18" />
            <rect x="170" y="70" width="10" height="20" fill="#1A1A18" />

            <rect x="20" y="100" width="30" height="10" fill="#703c8b" />
            <rect x="60" y="100" width="10" height="20" fill="#1A1A18" />
            <rect x="80" y="100" width="40" height="20" fill="#1A1A18" rx="2" />
            <rect x="130" y="100" width="20" height="10" fill="#1A1A18" />
            <rect x="160" y="100" width="20" height="20" fill="#703c8b" />

            <rect x="20" y="120" width="10" height="10" fill="#1A1A18" />
            <rect x="40" y="120" width="20" height="10" fill="#703c8b" />
            <rect x="130" y="120" width="10" height="20" fill="#1A1A18" />
            <rect x="150" y="120" width="20" height="10" fill="#1A1A18" />

            <rect x="70" y="140" width="30" height="10" fill="#1A1A18" />
            <rect x="110" y="140" width="20" height="10" fill="#703c8b" />
            <rect x="140" y="140" width="10" height="20" fill="#1A1A18" />
            <rect x="160" y="140" width="20" height="10" fill="#1A1A18" />

            <rect x="70" y="160" width="10" height="20" fill="#703c8b" />
            <rect x="90" y="160" width="30" height="10" fill="#1A1A18" />
            <rect x="130" y="160" width="20" height="20" fill="#1A1A18" />
            <rect x="160" y="160" width="20" height="20" fill="#703c8b" />

            <rect x="90" y="180" width="20" height="10" fill="#1A1A18" />
            <rect x="120" y="180" width="10" height="10" fill="#1A1A18" />
            <rect x="140" y="180" width="20" height="10" fill="#1A1A18" />

            {/* Center Glim Badge */}
            <rect x="85" y="85" width="30" height="30" fill="#ffffff" rx="6" />
            <circle cx="100" cy="100" r="11" fill="#703c8b" />
            <path
              d="M96 100a4 4 0 1 1 8 0 4 4 0 0 1-8 0"
              fill="#ffffff"
            />
          </svg>

          <p className="text-[11px] text-muted-foreground mt-2 font-mono">
            {invoiceNumber}
          </p>
        </div>

        {/* Payment Amount Box */}
        <div
          className="w-full rounded-xl p-3.5 border mb-4 flex items-center justify-between"
          style={{ backgroundColor: "#FAF8F4", borderColor: "#E8E4DC" }}
        >
          <div className="text-left">
            <p className="text-[11px] text-muted-foreground">Total Pembayaran</p>
            <p className="font-display font-bold text-lg text-foreground">
              {formattedAmount}
            </p>
            <p className="text-[10px] text-amber-700 font-medium">
              *Termasuk kode unik <span className="font-bold underline">{uniqueCode}</span>
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={copyAmount}
            className="h-8 gap-1.5 text-xs rounded-lg"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Tersalin" : "Salin"}
          </Button>
        </div>

        {/* Supported Logos Pill */}
        <div className="w-full pt-2 border-t text-center" style={{ borderColor: "#E8E4DC" }}>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-medium">
            Mendukung Pembayaran
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            {["BCA", "Mandiri", "BRI", "GoPay", "OVO", "ShopeePay", "Dana"].map((app) => (
              <span
                key={app}
                className="px-2 py-0.5 rounded-md bg-muted/60 text-[10px] border border-border"
              >
                {app}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
