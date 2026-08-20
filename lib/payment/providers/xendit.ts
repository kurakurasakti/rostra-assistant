import { PAYMENT_CONFIG } from "@/lib/payment/config"
import type {
  CheckStatusResult,
  CreateInvoiceParams,
  CreateInvoiceResult,
  PaymentInstruction,
  PaymentProviderAdapter,
  XenditInvoiceWebhookPayload,
} from "@/lib/payment/types"
import type { Invoice, SubscriptionPlan } from "@/types"

export class XenditProvider implements PaymentProviderAdapter {
  readonly providerName = "xendit" as const
  private apiKey: string

  constructor() {
    this.apiKey = PAYMENT_CONFIG.xendit.secretKey
  }

  private generateInvoiceNumber(): string {
    const date = new Date()
    const ymd = date.toISOString().slice(0, 10).replace(/-/g, "")
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    return `INV-XEN-${ymd}-${randomSuffix}`
  }

  async createInvoice(
    params: CreateInvoiceParams,
    plan: SubscriptionPlan,
  ): Promise<CreateInvoiceResult> {
    const invoiceNumber = this.generateInvoiceNumber()
    const baseAmount = plan.price
    const totalAmount = baseAmount

    const now = new Date()
    const expiresAt = new Date(
      now.getTime() + PAYMENT_CONFIG.invoiceExpiryHours * 60 * 60 * 1000,
    ).toISOString()

    // If Xendit API key is configured, call official Xendit Invoice API
    if (this.apiKey) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        const authHeader = `Basic ${Buffer.from(`${this.apiKey}:`).toString("base64")}`

        const response = await fetch("https://api.xendit.co/v2/invoices", {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            external_id: invoiceNumber,
            amount: totalAmount,
            payer_email: params.userEmail || "customer@rostra.app",
            description: `Langganan ${plan.name} - Glim Assistant`,
            invoice_duration: PAYMENT_CONFIG.xendit.invoiceDurationSeconds,
            success_redirect_url: `${appUrl}/billing?status=success&inv=${invoiceNumber}`,
            failure_redirect_url: `${appUrl}/billing?status=failed&inv=${invoiceNumber}`,
            currency: "IDR",
            customer: {
              email: params.userEmail,
              given_names: params.businessName || "Pemilik Bisnis",
            },
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error("[XenditProvider] Failed to create invoice:", errorData)
          throw new Error(
            `Xendit API error: ${errorData.message || response.statusText || response.status}`,
          )
        }

        const data = await response.json()

        const invoice: Invoice = {
          id: "",
          invoice_number: invoiceNumber,
          user_id: params.userId,
          subscription_id: null,
          plan_id: plan.id,
          plan_name: plan.name,
          base_amount: baseAmount,
          unique_code: 0,
          total_amount: totalAmount,
          currency: "IDR",
          status: "pending",
          payment_method: "xendit_invoice",
          provider: "xendit",
          provider_id: data.id,
          provider_data: data,
          proof_url: null,
          sender_name: null,
          sender_bank: null,
          customer_notes: params.customerNotes || null,
          admin_notes: null,
          paid_at: null,
          expires_at: data.expiry_date || expiresAt,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        }

        return {
          invoice,
          instructions: this.getPaymentInstructions(invoice),
          checkoutUrl: data.invoice_url,
        }
      } catch (err) {
        console.error("[XenditProvider] Exception calling Xendit:", err)
        // Fallback to offline simulation if API call fails
      }
    }

    // Fallback simulation when API Key is not yet set in beta
    const invoice: Invoice = {
      id: "",
      invoice_number: invoiceNumber,
      user_id: params.userId,
      subscription_id: null,
      plan_id: plan.id,
      plan_name: plan.name,
      base_amount: baseAmount,
      unique_code: 0,
      total_amount: totalAmount,
      currency: "IDR",
      status: "pending",
      payment_method: "xendit_invoice",
      provider: "xendit",
      provider_id: `xen_mock_${Date.now()}`,
      provider_data: {
        mock: true,
        message: "Xendit integration ready. Set XENDIT_SECRET_KEY in environment to enable live gateway.",
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

    return {
      invoice,
      instructions: this.getPaymentInstructions(invoice),
      checkoutUrl: undefined,
    }
  }

  getPaymentInstructions(invoice: Invoice): PaymentInstruction {
    return {
      method: "xendit_invoice",
      title: "Xendit Payment Gateway (Virtual Account / QRIS / E-Wallet / CC)",
      steps: [
        "Klik tombol 'Bayar via Xendit' untuk membuka halaman pembayaran resmi.",
        "Pilih metode pembayaran yang kamu inginkan (BCA VA, Mandiri VA, BRI, BNI, QRIS, GoPay, OVO, ShopeePay, Kartu Kredit).",
        "Selesaikan pembayaran sesuai panduan di layar Xendit.",
        "Akun kamu akan aktif secara instan dan otomatis tanpa perlu upload bukti transfer.",
      ],
      notes: "Pembayaran terverifikasi otomatis dalam hitungan detik 24/7.",
    }
  }

  async checkStatus(providerId: string): Promise<CheckStatusResult> {
    if (!this.apiKey) {
      return { status: "pending" }
    }

    try {
      const authHeader = `Basic ${Buffer.from(`${this.apiKey}:`).toString("base64")}`
      const response = await fetch(`https://api.xendit.co/v2/invoices/${providerId}`, {
        headers: {
          Authorization: authHeader,
        },
      })

      if (!response.ok) {
        return { status: "pending" }
      }

      const data: XenditInvoiceWebhookPayload = await response.json()
      if (data.status === "PAID" || data.status === "SETTLED") {
        return {
          status: "paid",
          paidAt: data.paid_at || new Date().toISOString(),
          rawResponse: data,
        }
      }

      if (data.status === "EXPIRED") {
        return {
          status: "expired",
          rawResponse: data,
        }
      }

      return {
        status: "pending",
        rawResponse: data,
      }
    } catch (err) {
      console.error("[XenditProvider] Failed to check status:", err)
      return { status: "pending" }
    }
  }

  async handleWebhook(
    payload: unknown,
    headers?: Record<string, string>,
  ): Promise<{
    invoiceNumber: string
    isPaid: boolean
    paidAt?: string
    providerId?: string
    metadata?: Record<string, unknown>
  }> {
    const callbackTokenHeader =
      headers?.["x-callback-token"] || headers?.["X-CALLBACK-TOKEN"]

    // Verify token if configured
    if (
      PAYMENT_CONFIG.xendit.webhookVerificationToken &&
      callbackTokenHeader !== PAYMENT_CONFIG.xendit.webhookVerificationToken
    ) {
      throw new Error("Invalid Xendit webhook callback token")
    }

    const data = payload as XenditInvoiceWebhookPayload
    const isPaid = data.status === "PAID" || data.status === "SETTLED"

    return {
      invoiceNumber: data.external_id,
      isPaid,
      paidAt: data.paid_at || (isPaid ? new Date().toISOString() : undefined),
      providerId: data.id,
      metadata: {
        paymentMethod: data.payment_method,
        paymentChannel: data.payment_channel,
        paidAmount: data.paid_amount,
      },
    }
  }
}
