import { PAYMENT_CONFIG } from "@/lib/payment/config"
import type { Invoice } from "@/types"

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Generate WhatsApp message link from Customer to Admin confirming payment
 */
export function getCustomerToAdminWhatsAppUrl(
  invoice: Invoice,
  businessName?: string,
  userEmail?: string,
): string {
  const formattedTotal = formatCurrency(invoice.total_amount)

  const text = `Halo Admin Glim 👋
Saya ingin konfirmasi pembayaran langganan:

🧾 *No. Invoice:* ${invoice.invoice_number}
📦 *Paket:* ${invoice.plan_name}
💰 *Total Transfer:* ${formattedTotal}
🏢 *Bisnis:* ${businessName || "-"}
📧 *Email:* ${userEmail || "-"}

Bukti transfer sudah saya siapkan. Mohon bantuannya untuk aktivasi akun. Terima kasih!`

  return `https://wa.me/${PAYMENT_CONFIG.adminWaNumber}?text=${encodeURIComponent(text)}`
}

/**
 * Generate WhatsApp message link from Admin to Customer confirming activation
 */
export function getAdminToCustomerWhatsAppUrl(
  invoice: Invoice,
  businessName?: string,
  customerPhone?: string,
): string {
  const formattedTotal = formatCurrency(invoice.total_amount)

  const text = `Halo Kak ${businessName ? `(${businessName})` : ""} 👋
Kabar baik! Pembayaran kamu sebesar ${formattedTotal} untuk tagihan *${invoice.invoice_number}* (${invoice.plan_name}) telah berhasil kami verifikasi.

🎉 *Akun Glim Pro kamu sekarang sudah AKTIF!*
Kamu sudah bisa menikmati seluruh fitur auto-reply AI WhatsApp & pengingat jadwal tanpa batas.

Silakan akses dashboard kamu di:
👉 https://rostra.app/dashboard

Jika butuh panduan setup, tim kami siap membantu kapan saja. Sukses selalu untuk bisnisnya! 🚀`

  let phone = customerPhone ? customerPhone.replace(/\D/g, "") : ""
  if (phone.startsWith("08")) {
    phone = `62${phone.slice(1)}`
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}
