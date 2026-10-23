import { type NextRequest, NextResponse } from "next/server"
import { withErrorHandler } from "@/lib/api-handler"
import { PaymentService } from "@/lib/payment/service"
import { createClient } from "@/lib/supabase/server"

async function handleGET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const subscription = await PaymentService.getOrCreateSubscription(user.id)
    const invoices = await PaymentService.getUserInvoices(user.id)
    const plans = PaymentService.getPlans()

    return NextResponse.json({
      success: true,
      subscription,
      invoices,
      plans,
    })
  } catch (error) {
    console.error("[api/subscription/status] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    )
  }
}

export const GET = withErrorHandler("GET /api/subscription/status", handleGET)
