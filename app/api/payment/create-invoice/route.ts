import { type NextRequest, NextResponse } from "next/server"
import { PaymentService } from "@/lib/payment/service"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { planId = "glim_pro_monthly", paymentMethod = "qris_manual", customerNotes } = body

    // Fetch user business name if available
    const { data: profile } = await supabase
      .from("profiles")
      .select("business_name")
      .eq("id", user.id)
      .maybeSingle()

    const result = await PaymentService.createInvoice({
      userId: user.id,
      userEmail: user.email || undefined,
      businessName: profile?.business_name || undefined,
      planId,
      paymentMethod,
      customerNotes,
    })

    return NextResponse.json({
      success: true,
      invoice: result.invoice,
      instructions: result.instructions,
      checkoutUrl: result.checkoutUrl,
    })
  } catch (error) {
    console.error("[api/payment/create-invoice] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    )
  }
}
