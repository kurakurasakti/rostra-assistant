import type {
  Invoice,
  InvoiceStatus,
  PaymentMethodType,
  PaymentProviderType,
  SubscriptionPlan,
} from "@/types"

export interface CreateInvoiceParams {
  userId: string
  userEmail?: string
  businessName?: string
  planId: string
  paymentMethod?: PaymentMethodType
  customerNotes?: string
}

export interface PaymentInstruction {
  method: PaymentMethodType
  title: string
  accountNumber?: string
  accountName?: string
  bankName?: string
  qrisImageUrl?: string
  qrisPayload?: string
  steps: string[]
  notes?: string
}

export interface CreateInvoiceResult {
  invoice: Invoice
  instructions: PaymentInstruction
  checkoutUrl?: string // For Xendit or redirect-based gateways
}

export interface CheckStatusResult {
  status: InvoiceStatus
  paidAt?: string
  rawResponse?: unknown
}

export interface XenditInvoiceWebhookPayload {
  id: string
  external_id: string
  user_id?: string
  status: "PENDING" | "PAID" | "SETTLED" | "EXPIRED"
  merchant_name?: string
  amount: number
  payer_email?: string
  description?: string
  payment_method?: string
  payment_channel?: string
  paid_amount?: number
  paid_at?: string
  created?: string
  updated?: string
  currency?: string
}

export interface PaymentProviderAdapter {
  readonly providerName: PaymentProviderType
  createInvoice(params: CreateInvoiceParams, plan: SubscriptionPlan): Promise<CreateInvoiceResult>
  getPaymentInstructions(invoice: Invoice): PaymentInstruction
  checkStatus?(providerId: string): Promise<CheckStatusResult>
  handleWebhook?(payload: unknown, headers?: Record<string, string>): Promise<{
    invoiceNumber: string
    isPaid: boolean
    paidAt?: string
    providerId?: string
    metadata?: Record<string, unknown>
  }>
}
