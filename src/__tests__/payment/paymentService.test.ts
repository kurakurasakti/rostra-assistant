import { describe, expect, it } from "vitest"
import { PAYMENT_CONFIG, SUBSCRIPTION_PLANS } from "@/lib/payment/config"
import { ManualQRISProvider } from "@/lib/payment/providers/manual-qris"
import { XenditProvider } from "@/lib/payment/providers/xendit"
import { PaymentService } from "@/lib/payment/service"
import type { Invoice } from "@/types"

describe("Payment Plans & Config", () => {
  it("should have valid monthly and annual subscription plans", () => {
    const plans = PaymentService.getPlans()
    expect(plans.length).toBeGreaterThanOrEqual(2)

    const monthly = SUBSCRIPTION_PLANS.glim_pro_monthly
    const annual = SUBSCRIPTION_PLANS.glim_pro_annual

    expect(monthly).toBeDefined()
    expect(monthly.price).toBe(299000)
    expect(monthly.interval).toBe("month")

    expect(annual).toBeDefined()
    expect(annual.price).toBe(2990000)
    expect(annual.interval).toBe("year")
    expect(annual.discountPercent).toBe(17)
  })

  it("should have correct manual bank and QRIS configurations", () => {
    expect(PAYMENT_CONFIG.qris.merchantName).toBeDefined()
    expect(PAYMENT_CONFIG.bankAccounts.length).toBeGreaterThan(0)
    expect(PAYMENT_CONFIG.bankAccounts[0].bank).toBe("BCA")
  })
})

describe("ManualQRISProvider", () => {
  const provider = new ManualQRISProvider()

  it("should generate a valid invoice with unique 3-digit code", async () => {
    const plan = SUBSCRIPTION_PLANS.glim_pro_monthly
    const result = await provider.createInvoice(
      {
        userId: "user-test-123",
        userEmail: "test@example.com",
        planId: plan.id,
      },
      plan,
    )

    expect(result.invoice.invoice_number).toMatch(/^INV-GLM-\d{8}-\d{4}$/)
    expect(result.invoice.base_amount).toBe(299000)
    expect(result.invoice.unique_code).toBeGreaterThanOrEqual(100)
    expect(result.invoice.unique_code).toBeLessThanOrEqual(999)
    expect(result.invoice.total_amount).toBe(
      result.invoice.base_amount + result.invoice.unique_code,
    )
    expect(result.invoice.status).toBe("pending")
    expect(result.invoice.payment_method).toBe("qris_manual")
    expect(result.instructions.steps.length).toBeGreaterThan(0)
  })

  it("should generate a proper WhatsApp confirmation link with pre-filled parameters", () => {
    const mockInvoice: Invoice = {
      id: "inv-uuid",
      invoice_number: "INV-GLM-20260819-1234",
      user_id: "user-123",
      subscription_id: null,
      plan_id: "glim_pro_monthly",
      plan_name: "Glim Pro Bulanan",
      base_amount: 299000,
      unique_code: 452,
      total_amount: 299452,
      currency: "IDR",
      status: "pending",
      payment_method: "qris_manual",
      provider: "manual",
      provider_id: null,
      proof_url: null,
      sender_name: null,
      sender_bank: null,
      customer_notes: null,
      admin_notes: null,
      paid_at: null,
      expires_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const waUrl = ManualQRISProvider.getWhatsAppConfirmationUrl(
      mockInvoice,
      "Studio Kebaya Cantik",
      "owner@kebaya.com",
    )

    expect(waUrl).toContain("https://wa.me/")
    expect(waUrl).toContain("INV-GLM-20260819-1234")
    expect(waUrl).toContain("Studio%20Kebaya%20Cantik")
  })
})

describe("XenditProvider", () => {
  const xenditProvider = new XenditProvider()

  it("should process webhook and recognize paid status", async () => {
    const payload = {
      id: "xendit_inv_123",
      external_id: "INV-XEN-20260819-9999",
      status: "PAID" as const,
      amount: 299000,
      payment_method: "BANK_TRANSFER",
      payment_channel: "BCA",
      paid_amount: 299000,
      paid_at: "2026-08-19T10:00:00.000Z",
    }

    const result = await xenditProvider.handleWebhook(payload)
    expect(result.invoiceNumber).toBe("INV-XEN-20260819-9999")
    expect(result.isPaid).toBe(true)
    expect(result.providerId).toBe("xendit_inv_123")
  })
})

describe("Admin Approval Notification", () => {
  it("should generate a friendly WhatsApp message to notify the user that their account is active", () => {
    const mockInvoice: Invoice = {
      id: "inv-uuid",
      invoice_number: "INV-GLM-20260819-1234",
      user_id: "user-123",
      subscription_id: null,
      plan_id: "glim_pro_monthly",
      plan_name: "Glim Pro Bulanan",
      base_amount: 299000,
      unique_code: 452,
      total_amount: 299452,
      currency: "IDR",
      status: "paid",
      payment_method: "qris_manual",
      provider: "manual",
      provider_id: null,
      proof_url: "https://example.com/proof.jpg",
      sender_name: "Budi Santoso",
      sender_bank: "BCA",
      customer_notes: null,
      admin_notes: null,
      paid_at: new Date().toISOString(),
      expires_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const waUrl = PaymentService.generateCustomerApprovalWhatsAppUrl(
      mockInvoice,
      "Studio Kebaya Melati",
      "081234567890",
    )

    expect(waUrl).toContain("https://wa.me/6281234567890")
    expect(waUrl).toContain("INV-GLM-20260819-1234")
    expect(waUrl).toContain("Studio%20Kebaya%20Melati")
    expect(waUrl).toContain("Glim%20Pro%20kamu%20sekarang%20sudah%20AKTIF")
  })
})

