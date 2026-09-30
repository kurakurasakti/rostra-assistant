import { type NextRequest, NextResponse } from "next/server"
import { PaymentService } from "@/lib/payment/service"
import { createClient } from "@/lib/supabase/server"
import { requireAdminUser } from "@/lib/auth/admin"
import { logSecurityEvent } from "@/lib/auth/rate-limiter"

/**
 * Manually confirm a payment and activate the subscription.
 *
 * Admin-only. Requires an authenticated session that passes
 * requireAdminUser — there is deliberately no shared-secret bypass,
 * because this endpoint activates paid subscriptions and previously
 * accepted a hardcoded key that was also inlined into the public
 * payment page bundle.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { authorized, reason } = await requireAdminUser(user)
    if (!authorized) {
      if (user) {
        await logSecurityEvent({
          eventType: "admin_confirm_denied",
          email: user.email ?? undefined,
        })
      }
      return NextResponse.json({ error: reason ?? "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const { invoiceId, adminNotes } = body

    if (!invoiceId || typeof invoiceId !== "string") {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 })
    }

    const result = await PaymentService.confirmPaymentManual({
      invoiceId,
      adminNotes: adminNotes || `Dikonfirmasi oleh ${user?.email ?? "admin"}`,
    })

    return NextResponse.json({
      message: "Pembayaran berhasil dikonfirmasi dan akun telah diaktifkan.",
      ...result,
    })
  } catch (error) {
    console.error("[api/payment/confirm-manual] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
