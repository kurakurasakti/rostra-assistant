export type OrderStatus = "aktif" | "selesai" | "dibatalkan"
export type MessageStatus = "menunggu" | "terkirim" | "gagal" | "dibatalkan"
export type InboxDirection = "masuk" | "keluar"
export type InboxStatus = "baru" | "antri" | "dibalas" | "diabaikan" | "dieskalasi"
export type MessageClassification = "rutin" | "sensitif" | "tidak_diketahui" | "injection_attempt"
export type TemplateType =
  | "konfirmasi_pesanan"
  | "pengingat_pembayaran"
  | "pengingat_janji_temu"
  | "custom"

export type QACategory = "harga" | "ketersediaan" | "jadwal" | "status" | "pembayaran" | "umum"

export interface ConversationExample {
  category: QACategory
  customer: string
  admin: string
  source: "upload" | "correction"
  used_count: number
  created_at: string
}

export interface BusinessKnowledgeStructured {
  services: {
    name: string
    price_range: string
    description?: string
  }[]
  operating_hours: string | null
  location: string | null
  payment_methods: string[]
  po_status: boolean
  po_close_date: string | null
  special_notes: string | null
}

export interface CompletenessResult {
  score: number
  missing: string[]
  isComplete: boolean
}

export interface Profile {
  id: string
  business_name: string
  brand_voice: string
  wa_connected: boolean
  onboarding_complete: boolean
  created_at: string
  updated_at: string
  // Legacy business knowledge fields (kept for backwards compat during migration)
  product_knowledge?: unknown
  operating_hours?: string | null
  location_info?: string | null
  processing_time?: string | null
  payment_methods?: string | null
  minimal_dp?: string | null
  po_status?: boolean | null
  po_close_date?: string | null
  slot_info?: string | null
  special_notes?: string | null
  escalation_keywords?: string[] | null
  // New business knowledge fields
  business_knowledge_raw?: string | null
  business_knowledge_structured?: BusinessKnowledgeStructured | null
  auto_reply_level?: number | null
  feedback_count?: number | null
  notification_wa_number?: string | null
  conversation_examples?: ConversationExample[] | null
  terms_agreed_at?: string | null
  terms_version?: string | null
  onboarding_wizard_seen_at?: string | null
  is_admin?: boolean | null
  role?: string | null
}


export interface Client {
  id: string
  user_id: string
  name: string
  whatsapp_number: string
  email: string | null
  notes: string | null
  ai_notes?: string | null
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  user_id: string
  client_id: string
  description: string
  total_price: number
  status: OrderStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PaymentStage {
  id: string
  order_id: string
  user_id: string
  name: string
  amount: number
  due_date: string
  paid: boolean
  paid_at: string | null
  reminder_days_before: number
  sort_order: number
  created_at: string
}

export interface Appointment {
  id: string
  order_id: string | null
  user_id: string
  client_id: string
  title: string
  scheduled_at: string
  location: string | null
  reminder_hours_before: number
  notes: string | null
  created_at: string
}

export interface ScheduledMessage {
  id: string
  user_id: string
  order_id: string
  client_id: string | null
  payment_stage_id: string | null
  appointment_id: string | null
  message_type: string
  whatsapp_number: string
  message_body: string
  scheduled_at: string
  sent_at: string | null
  status: MessageStatus
  error_message: string | null
  created_at: string
}

export type FullOrder = Order & {
  payment_stages: PaymentStage[]
  appointments: Appointment[]
  scheduled_messages: ScheduledMessage[]
}

export interface InboxMessage {
  id: string
  user_id: string
  client_id: string | null
  direction: InboxDirection
  whatsapp_number: string
  sender_name: string | null
  message_body: string
  classification: MessageClassification
  ai_draft_reply: string | null
  status: InboxStatus
  replied_at: string | null
  wa_message_id: string | null
  received_at: string
  media_url: string | null
  media_type: "image" | "document" | "audio" | null
  media_size: number | null
}

export interface MessageTemplate {
  id: string
  user_id: string
  type: TemplateType
  name: string
  body: string
  is_default: boolean
  created_at: string
}

export interface PaymentStageForm {
  tempId: string
  name: string
  amount: string
  due_date: string
  reminder_days_before: number
}

export interface AppointmentForm {
  tempId: string
  title: string
  scheduled_at: string
  location: string
  reminder_hours_before: number
  notes: string
}

// ─────────────────────────────────────────────────────────────
// Subscription & Payment Types
// ─────────────────────────────────────────────────────────────

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "expired"
export type InvoiceStatus = "pending" | "waiting_confirmation" | "paid" | "expired" | "cancelled"
export type PaymentMethodType =
  | "qris_manual"
  | "bank_transfer_bca"
  | "bank_transfer_mandiri"
  | "xendit_invoice"
export type PaymentProviderType = "manual" | "xendit"

export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  interval: "month" | "year"
  discountPercent?: number
  features: string[]
  popular?: boolean
  description: string
}

export interface Subscription {
  id: string
  user_id: string
  plan_id: string
  status: SubscriptionStatus
  trial_ends_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  invoice_number: string
  user_id: string
  subscription_id: string | null
  plan_id: string
  plan_name: string
  base_amount: number
  unique_code: number
  total_amount: number
  currency: string
  status: InvoiceStatus
  payment_method: PaymentMethodType
  provider: PaymentProviderType
  provider_id: string | null
  provider_data?: Record<string, unknown> | null
  proof_url: string | null
  proof_signed_url?: string | null
  sender_name: string | null
  sender_bank: string | null
  customer_notes: string | null
  admin_notes: string | null
  paid_at: string | null
  expires_at: string
  created_at: string
  updated_at: string
}

export interface AIUsageRecord {
  id: string
  user_id: string
  day: string
  requests: number
  est_tokens: number
  created_at: string
  updated_at: string
}
