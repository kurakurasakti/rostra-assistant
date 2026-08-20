import { PAYMENT_CONFIG, SUBSCRIPTION_PLANS } from "@/lib/payment/config"
import { ManualQRISProvider } from "@/lib/payment/providers/manual-qris"
import { XenditProvider } from "@/lib/payment/providers/xendit"
import type {
  CreateInvoiceParams,
  CreateInvoiceResult,
  PaymentInstruction,
  PaymentProviderAdapter,
} from "@/lib/payment/types"
import { createServiceClient } from "@/lib/supabase/server"
import type { Invoice, Subscription, SubscriptionPlan } from "@/types"

export class PaymentService {
  private static getProvider(method?: string): PaymentProviderAdapter {
    if (method === "xendit_invoice" || PAYMENT_CONFIG.activeProvider === "xendit") {
      return new XenditProvider()
    }
    return new ManualQRISProvider()
  }

  static getPlans(): SubscriptionPlan[] {
    return Object.values(SUBSCRIPTION_PLANS)
  }

  static getPlan(planId: string): SubscriptionPlan | undefined {
    return SUBSCRIPTION_PLANS[planId]
  }

  /**
   * Get or initialize a user's subscription (defaults to 14 days free trial)
   */
  static async getOrCreateSubscription(userId: string): Promise<Subscription> {
    const supabase = await createServiceClient()

    const { data: existing, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()

    if (existing && !error) {
      return existing as Subscription
    }

    // Auto-create trial subscription
    const now = new Date()
    const trialEndsAt = new Date(
      now.getTime() + PAYMENT_CONFIG.defaultTrialDays * 24 * 60 * 60 * 1000,
    ).toISOString()

    const newSub = {
      user_id: userId,
      plan_id: "glim_pro_monthly",
      status: "trialing",
      trial_ends_at: trialEndsAt,
      current_period_start: now.toISOString(),
      current_period_end: trialEndsAt,
      cancel_at_period_end: false,
    }

    const { data: inserted, error: insertError } = await supabase
      .from("subscriptions")
      .insert(newSub)
      .select("*")
      .single()

    if (insertError) {
      console.error("[PaymentService] Error creating initial subscription:", insertError)
      // Fallback object in case table doesn't exist yet
      return {
        id: "fallback-sub",
        user_id: userId,
        plan_id: "glim_pro_monthly",
        status: "trialing",
        trial_ends_at: trialEndsAt,
        current_period_start: now.toISOString(),
        current_period_end: trialEndsAt,
        cancel_at_period_end: false,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      }
    }

    return inserted as Subscription
  }

  /**
   * Create an invoice for subscription upgrade or renewal
   */
  static async createInvoice(params: CreateInvoiceParams): Promise<CreateInvoiceResult> {
    const plan = this.getPlan(params.planId)
    if (!plan) {
      throw new Error(`Invalid plan ID: ${params.planId}`)
    }

    const provider = this.getProvider(params.paymentMethod)
    const result = await provider.createInvoice(params, plan)

    // Link current subscription if available
    const userSub = await this.getOrCreateSubscription(params.userId)
    result.invoice.subscription_id = userSub?.id || null

    // Persist invoice into DB
    const supabase = await createServiceClient()
    const invoicePayload = {
      invoice_number: result.invoice.invoice_number,
      user_id: params.userId,
      subscription_id: result.invoice.subscription_id,
      plan_id: result.invoice.plan_id,
      plan_name: result.invoice.plan_name,
      base_amount: result.invoice.base_amount,
      unique_code: result.invoice.unique_code,
      total_amount: result.invoice.total_amount,
      currency: result.invoice.currency,
      status: result.invoice.status,
      payment_method: result.invoice.payment_method,
      provider: result.invoice.provider,
      provider_id: result.invoice.provider_id,
      provider_data: result.invoice.provider_data,
      customer_notes: result.invoice.customer_notes,
      expires_at: result.invoice.expires_at,
    }

    const { data: inserted, error } = await supabase
      .from("invoices")
      .insert(invoicePayload)
      .select("*")
      .single()

    if (error) {
      console.error("[PaymentService] Error inserting invoice:", error)
      throw new Error(`Failed to create invoice in database: ${error.message}`)
    }

    return {
      invoice: inserted as Invoice,
      instructions: result.instructions,
      checkoutUrl: result.checkoutUrl,
    }
  }

  /**
   * Get invoice details by ID or Invoice Number
   */
  static async getInvoice(
    invoiceIdOrNumber: string,
    userId?: string,
  ): Promise<{
    invoice: Invoice
    instructions: PaymentInstruction
    whatsappUrl: string
  } | null> {
    const supabase = await createServiceClient()

    let query = supabase.from("invoices").select("*")
    if (invoiceIdOrNumber.includes("INV-")) {
      query = query.eq("invoice_number", invoiceIdOrNumber)
    } else {
      query = query.eq("id", invoiceIdOrNumber)
    }

    if (userId) {
      query = query.eq("user_id", userId)
    }

    const { data, error } = await query.maybeSingle()
    if (error || !data) {
      return null
    }

    const invoice = data as Invoice
    const provider = this.getProvider(invoice.payment_method)
    const instructions = provider.getPaymentInstructions(invoice)

    // Fetch user profile for WhatsApp greeting
    const { data: profile } = await supabase
      .from("profiles")
      .select("business_name")
      .eq("id", invoice.user_id)
      .maybeSingle()

    const whatsappUrl = ManualQRISProvider.getWhatsAppConfirmationUrl(
      invoice,
      profile?.business_name || "Bisnis Glim",
    )

    let proofSignedUrl: string | null = null
    if (invoice.proof_url) {
      proofSignedUrl = await this.getProofSignedUrl(invoice.proof_url, 300)
    }

    return {
      invoice: {
        ...invoice,
        proof_signed_url: proofSignedUrl || undefined,
      },
      instructions,
      whatsappUrl,
    }
  }

  /**
   * Generate a server-side signed URL for private payment proof (5 min expiry)
   */
  static async getProofSignedUrl(
    storagePathOrUrl?: string | null,
    expiresInSeconds: number = 300,
  ): Promise<string | null> {
    if (!storagePathOrUrl) return null

    // If it's already a full URL (not from supabase storage) or data URI, return as-is
    if (
      storagePathOrUrl.startsWith("http://") ||
      storagePathOrUrl.startsWith("https://") ||
      storagePathOrUrl.startsWith("data:")
    ) {
      return storagePathOrUrl
    }

    try {
      const supabase = await createServiceClient()
      const cleanPath = storagePathOrUrl.replace(/^payment-proofs\//, "")
      const { data, error } = await supabase.storage
        .from("payment-proofs")
        .createSignedUrl(cleanPath, expiresInSeconds)

      if (error || !data) {
        console.error("[getProofSignedUrl] Error creating signed URL:", error)
        return null
      }
      return data.signedUrl
    } catch (err) {
      console.error("[getProofSignedUrl] Exception:", err)
      return null
    }
  }


  /**
   * Submit manual payment proof
   */
  static async submitPaymentProof(params: {
    invoiceId: string
    userId: string
    proofUrl?: string
    senderName?: string
    senderBank?: string
    customerNotes?: string
  }): Promise<Invoice> {
    const supabase = await createServiceClient()

    const updatePayload: Record<string, unknown> = {
      status: "waiting_confirmation",
      updated_at: new Date().toISOString(),
    }

    if (params.proofUrl) updatePayload.proof_url = params.proofUrl
    if (params.senderName) updatePayload.sender_name = params.senderName
    if (params.senderBank) updatePayload.sender_bank = params.senderBank
    if (params.customerNotes) updatePayload.customer_notes = params.customerNotes

    const { data, error } = await supabase
      .from("invoices")
      .update(updatePayload)
      .eq("id", params.invoiceId)
      .eq("user_id", params.userId)
      .select("*")
      .single()

    if (error || !data) {
      throw new Error(`Failed to submit proof: ${error?.message || "Invoice not found"}`)
    }

    return data as Invoice
  }

  /**
   * Admin confirms payment and immediately activates subscription
   */
  static async confirmPaymentManual(params: {
    invoiceId: string
    adminNotes?: string
  }): Promise<{ success: boolean; invoice: Invoice; subscription: Subscription }> {
    const supabase = await createServiceClient()

    // 1. Fetch invoice
    const { data: invoiceData, error: invError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", params.invoiceId)
      .single()

    if (invError || !invoiceData) {
      throw new Error(`Invoice not found: ${invError?.message}`)
    }

    const invoice = invoiceData as Invoice
    const now = new Date()

    // 2. Mark invoice as paid
    const { data: updatedInvoice, error: updateInvError } = await supabase
      .from("invoices")
      .update({
        status: "paid",
        paid_at: now.toISOString(),
        admin_notes: params.adminNotes || "Dikonfirmasi manual oleh Admin",
        updated_at: now.toISOString(),
      })
      .eq("id", invoice.id)
      .select("*")
      .single()

    if (updateInvError || !updatedInvoice) {
      throw new Error(`Failed to update invoice status: ${updateInvError?.message}`)
    }

    // 3. Calculate subscription duration
    const plan = this.getPlan(invoice.plan_id)
    const isAnnual = plan?.interval === "year" || invoice.plan_id.includes("annual")
    const durationDays = isAnnual ? 365 : 30

    // Fetch existing subscription to determine start/end dates
    const existingSub = await this.getOrCreateSubscription(invoice.user_id)
    let periodStart = now

    // If current subscription is still active in future, extend from that end date
    if (
      existingSub.status === "active" &&
      existingSub.current_period_end &&
      new Date(existingSub.current_period_end) > now
    ) {
      periodStart = new Date(existingSub.current_period_end)
    }

    const periodEnd = new Date(periodStart.getTime() + durationDays * 24 * 60 * 60 * 1000)

    // 4. Update or activate subscription
    const { data: updatedSub, error: subError } = await supabase
      .from("subscriptions")
      .upsert({
        user_id: invoice.user_id,
        plan_id: invoice.plan_id,
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
        updated_at: now.toISOString(),
      })
      .select("*")
      .single()

    if (subError || !updatedSub) {
      console.error("[PaymentService] Failed to activate subscription:", subError)
      throw new Error(`Failed to update user subscription: ${subError?.message}`)
    }

    return {
      success: true,
      invoice: updatedInvoice as Invoice,
      subscription: updatedSub as Subscription,
    }
  }

  /**
   * Handle Xendit Webhook callback
   */
  static async handleXenditWebhook(payload: unknown, headers?: Record<string, string>) {
    const xenditProvider = new XenditProvider()
    const result = await xenditProvider.handleWebhook(payload, headers)

    if (!result.isPaid) {
      return { received: true, status: "ignored_not_paid" }
    }

    const supabase = await createServiceClient()
    const { data: invoiceData } = await supabase
      .from("invoices")
      .select("*")
      .eq("invoice_number", result.invoiceNumber)
      .maybeSingle()

    if (!invoiceData) {
      console.warn(`[XenditWebhook] Invoice not found: ${result.invoiceNumber}`)
      return { received: true, status: "invoice_not_found" }
    }

    const invoice = invoiceData as Invoice
    return await this.confirmPaymentManual({
      invoiceId: invoice.id,
      adminNotes: `Auto-verified via Xendit Gateway (ID: ${result.providerId || "-"})`,
    })
  }

  /**
   * Get all invoices for a user
   */
  static async getUserInvoices(userId: string): Promise<Invoice[]> {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[PaymentService] Error fetching user invoices:", error)
      return []
    }

    return (data || []) as Invoice[]
  }

  /**
   * Admin: Get all transactions across all users with business profiles
   */
  static async getAllInvoicesForAdmin(params?: {
    status?: string
    search?: string
  }): Promise<
    (Invoice & {
      business_name?: string
      customer_email?: string
      customer_phone?: string
    })[]
  > {
    const supabase = await createServiceClient()

    let query = supabase.from("invoices").select("*").order("created_at", { ascending: false })

    if (params?.status && params.status !== "all") {
      query = query.eq("status", params.status)
    }

    const { data: invoicesData, error } = await query
    if (error || !invoicesData) {
      console.error("[PaymentService] Admin error fetching invoices:", error)
      return []
    }

    // Fetch associated profiles
    const userIds = [...new Set(invoicesData.map((i) => i.user_id))]
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, business_name, notification_wa_number")
      .in("id", userIds)

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]))

    const enriched = await Promise.all(
      invoicesData.map(async (inv) => {
        const prof = profileMap.get(inv.user_id)
        let proofSignedUrl: string | null = null
        if (inv.proof_url) {
          proofSignedUrl = await PaymentService.getProofSignedUrl(inv.proof_url, 300)
        }
        return {
          ...inv,
          proof_signed_url: proofSignedUrl || undefined,
          business_name: prof?.business_name || undefined,
          customer_phone: prof?.notification_wa_number || undefined,
        }
      }),
    )

    if (params?.search) {
      const q = params.search.toLowerCase()
      return enriched.filter(
        (i) =>
          i.invoice_number.toLowerCase().includes(q) ||
          i.plan_name.toLowerCase().includes(q) ||
          i.sender_name?.toLowerCase().includes(q) ||
          i.business_name?.toLowerCase().includes(q),
      )
    }

    return enriched
  }


  /**
   * Admin: Reject proof / reset invoice
   */
  static async rejectPaymentProof(invoiceId: string, reason?: string): Promise<Invoice> {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from("invoices")
      .update({
        status: "pending",
        admin_notes: reason ? `Ditolak: ${reason}` : "Bukti pembayaran ditolak oleh Admin. Silakan upload ulang.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId)
      .select("*")
      .single()

    if (error || !data) {
      throw new Error(`Failed to reject proof: ${error?.message}`)
    }

    return data as Invoice
  }

  /**
   * Generate WhatsApp message link from Admin to Customer confirming activation
   */
  static generateCustomerApprovalWhatsAppUrl(
    invoice: Invoice,
    businessName?: string,
    customerPhone?: string,
  ): string {
    const formattedTotal = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(invoice.total_amount)

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
}
