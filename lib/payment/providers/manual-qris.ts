import { PAYMENT_CONFIG } from "@/lib/payment/config"
import type {
  CreateInvoiceParams,
  CreateInvoiceResult,
  PaymentInstruction,
  PaymentProviderAdapter,
} from "@/lib/payment/types"
import type { Invoice, SubscriptionPlan } from "@/types"

export class ManualQRISProvider implements PaymentProviderAdapter {
  readonly providerName = "manual" as const

  private generateInvoiceNumber(): string {
    const date = new Date()
    const ymd = date.toISOString().slice(0, 10).replace(/-/g, "")
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    return `INV-GLM-${ymd}-${randomSuffix}`
  }

  private generateUniqueCode(): number {
    // Generate a 3-digit number between 100 and 899 to keep amounts neat
    return Math.floor(100 + Math.random() * 800)
  }

  async createInvoice(
    params: CreateInvoiceParams,
    plan: SubscriptionPlan,
  ): Promise<CreateInvoiceResult> {
    const invoiceNumber = this.generateInvoiceNumber()
    const uniqueCode = this.generateUniqueCode()
    const baseAmount = plan.price
    const totalAmount = baseAmount + uniqueCode

    const now = new Date()
    const expiresAt = new Date(
      now.getTime() + PAYMENT_CONFIG.invoiceExpiryHours * 60 * 60 * 1000,
    ).toISOString()

    const invoice: Invoice = {
      id: "", // Will be assigned by database insert
      invoice_number: invoiceNumber,
      user_id: params.userId,
      subscription_id: null,
      plan_id: plan.id,
      plan_name: plan.name,
      base_amount: baseAmount,
      unique_code: uniqueCode,
      total_amount: totalAmount,
      currency: "IDR",
      status: "pending",
      payment_method: params.paymentMethod || "qris_manual",
      provider: "manual",
      provider_id: null,
      provider_data: {
        uniqueCode,
        merchantName: PAYMENT_CONFIG.qris.merchantName,
        customerNotes: params.customerNotes || null,
      },
      proof_url: null,
      sender_name: null,
      sender_bank: null,
      customer_notes: params.customerNotes || null,
      admin_notes: null,
      paid_at: null,
      expires_at: expiresAt,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }

    const instructions = this.getPaymentInstructions(invoice)

    return {
      invoice,
      instructions,
    }
  }

  getPaymentInstructions(invoice: Invoice): PaymentInstruction {
    const formattedTotal = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(invoice.total_amount)

    if (invoice.payment_method === "bank_transfer_bca") {
      const bca = PAYMENT_CONFIG.bankAccounts.find((b) => b.bank === "BCA")
      return {
        method: "bank_transfer_bca",
        title: "Transfer Bank BCA Manual",
        bankName: "BCA",
        accountNumber: bca?.accountNumber || "8830881234",
        accountName: bca?.accountHolder || "PT Rostra Solusi Digital",
        steps: [
          `Buka m-BCA / KlikBCA / ATM BCA.`,
          `Pilih menu Transfer Antar Rekening BCA.`,
          `Masukkan nomor rekening ${bca?.accountNumber || "8830881234"} a.n ${bca?.accountHolder || "PT Rostra Solusi Digital"}.`,
          `Transfer TEPAT ${formattedTotal} (termasuk 3 digit kode unik ${invoice.unique_code}).`,
          `Simpan bukti transfer dan upload di halaman ini atau kirim via WhatsApp.`,
        ],
        notes: `PENTING: Transfer sesuai nominal ${formattedTotal} agar verifikasi manual dapat dilakukan dengan cepat.`,
      }
    }

    return {
      method: "qris_manual",
      title: "QRIS (Semua E-Wallet & Mobile Banking)",
      qrisImageUrl: PAYMENT_CONFIG.qris.staticQrImageUrl,
      steps: [
        `Buka aplikasi pembayaran pilihan kamu (BCA mobile, Livin Mandiri, GoPay, OVO, ShopeePay, Dana, dll).`,
        `Scan kode QRIS yang tertera di layar.`,
        `Masukkan nominal pembayaran TEPAT ${formattedTotal} (termasuk kode unik ${invoice.unique_code}).`,
        `Periksa nama merchant: "${PAYMENT_CONFIG.qris.merchantName}".`,
        `Selesaikan pembayaran dan upload bukti transfer di halaman ini.`,
      ],
      notes: `Kode unik Rp ${invoice.unique_code} digunakan untuk membedakan transaksi kamu agar verifikasi berjalan cepat.`,
    }
  }

  static getWhatsAppConfirmationUrl(
    invoice: Invoice,
    businessName?: string,
    userEmail?: string,
  ): string {
    const formattedTotal = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(invoice.total_amount)

    const text = `Halo Admin Glim 👋
Saya ingin konfirmasi pembayaran langganan:

🧾 *No. Invoice:* ${invoice.invoice_number}
📦 *Paket:* ${invoice.plan_name}
💰 *Total Transfer:* ${formattedTotal}
🏢 *Bisnis:* ${businessName || "-"}
📧 *Email:* ${userEmail || "-"}

Bukti transfer sudah saya siapkan. Mohon bantuannya untuk aktivasi akun. Terima kasih!`

    const encoded = encodeURIComponent(text)
    return `https://wa.me/${PAYMENT_CONFIG.adminWaNumber}?text=${encoded}`
  }
}
