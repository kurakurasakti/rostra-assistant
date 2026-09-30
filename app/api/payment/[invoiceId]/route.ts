import { type NextRequest, NextResponse } from "next/server"
import { PaymentService } from "@/lib/payment/service"
import { createClient } from "@/lib/supabase/server"
import { checkIsAdmin } from "@/lib/auth/admin"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  try {
    const { invoiceId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Invoices expose customer PII and payment state, so the read is
    // scoped to the owner. Passing userId through to PaymentService
    // applies the owner filter; without a session that filter was
    // skipped entirely and any invoice id returned the full record.
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const isAdmin = await checkIsAdmin(user)

    const result = await PaymentService.getInvoice(invoiceId, isAdmin ? undefined : user.id)
    if (!result) {
      // Same response for "does not exist" and "not yours" so the
      // endpoint cannot be used to probe which invoice ids are real.
      return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error("[api/payment/[invoiceId]] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
