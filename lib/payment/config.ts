import type { PaymentProviderType, SubscriptionPlan } from "@/types"

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  glim_pro_monthly: {
    id: "glim_pro_monthly",
    name: "Glim Pro Bulanan",
    price: 299000,
    interval: "month",
    description: "Solusi lengkap AI WhatsApp assistant untuk operasional harian bisnis jasa kamu.",
    features: [
      "1 Nomor WhatsApp bisnis terhubung",
      "AI belajar gaya bicara dari chat kamu",
      "Auto-draft reply dengan konteks bisnis lengkap",
      "Pengingat pembayaran & jadwal otomatis",
      "Inbox terpusat & integrasi realtime",
      "Import data klien & pesanan dari Excel/CSV",
      "Support prioritas via WhatsApp",
    ],
    popular: true,
  },
  glim_pro_annual: {
    id: "glim_pro_annual",
    name: "Glim Pro Tahunan",
    price: 2990000,
    interval: "year",
    discountPercent: 17,
    description: "Paket hemat 1 tahun penuh. Bayar 10 bulan, dapat 12 bulan (Hemat Rp 598.000).",
    features: [
      "Semua fitur paket Glim Pro Bulanan",
      "Hemat Rp 598.000 (Setara 2 bulan GRATIS)",
      "Prioritas update fitur AI terbaru",
      "Pendampingan onboarding bisnis 1-on-1",
      "Garansi uptime 99.9%",
    ],
  },
}

export const PAYMENT_CONFIG = {
  // Mode provider: 'manual' (default beta) | 'xendit' (future)
  activeProvider: (process.env.PAYMENT_PROVIDER || "manual") as PaymentProviderType,

  // Default duration
  defaultTrialDays: 14,
  invoiceExpiryHours: 24,

  // Admin WhatsApp for manual payment confirmation (Format: 628...)
  adminWaNumber:
    process.env.NEXT_PUBLIC_ADMIN_WA_NUMBER ||
    process.env.ADMIN_WA_NUMBER ||
    "6281234567890",

  // Manual QRIS configuration
  qris: {
    merchantName: process.env.NEXT_PUBLIC_QRIS_MERCHANT || "GLIM ASSISTANT",
    nmid: "ID1020000000000",
    staticQrImageUrl: "/assets/qris-glim.png",
  },

  // Manual Bank Transfer accounts
  bankAccounts: [
    {
      bank: "BCA",
      accountNumber: "8830881234",
      accountHolder: "PT Rostra Solusi Digital",
      logo: "BCA",
    },
    {
      bank: "Mandiri",
      accountNumber: "1370001234567",
      accountHolder: "PT Rostra Solusi Digital",
      logo: "Mandiri",
    },
  ],

  // Xendit configuration (ready for production switch)
  xendit: {
    secretKey: process.env.XENDIT_SECRET_KEY || "",
    webhookVerificationToken: process.env.XENDIT_WEBHOOK_VERIFICATION_TOKEN || "",
    invoiceDurationSeconds: 86400, // 24 hours
  },
}
