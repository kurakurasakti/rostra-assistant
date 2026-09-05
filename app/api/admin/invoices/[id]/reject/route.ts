import { type NextRequest, NextResponse } from "next/server"
import { requireAdminUser } from "@/lib/auth/admin"
import { PaymentService } from "@/lib/payment/service"
import { createClient } from "@/lib/supabase/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Best Practice RBAC check
    const authCheck = await requireAdminUser(user)
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.reason || "Forbidden: Akses ditolak" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { reason } = body

    const updatedInvoice = await PaymentService.rejectPaymentProof(id, reason)

    return NextResponse.json({
      success: true,
      message: "Bukti pembayaran ditolak dan invoice dikembalikan ke status pending.",
      invoice: updatedInvoice,
    })
  } catch (error) {
    console.error("[api/admin/invoices/reject] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    )
  }
}
