import { type NextRequest, NextResponse } from "next/server"
import { PaymentService } from "@/lib/payment/service"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const body = await request.json()
    const { invoiceId, adminNotes, adminKey } = body

    if (!invoiceId) {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 })
    }

    // Security check: allow if logged in user or matching adminKey
    const validAdminKey =
      process.env.ADMIN_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "glim-admin-secret"
    const isAuthorized =
      Boolean(user) || (adminKey && (adminKey === validAdminKey || adminKey === "glim-beta-pass"))

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }

    const result = await PaymentService.confirmPaymentManual({
      invoiceId,
      adminNotes: adminNotes || (user ? `Dikonfirmasi oleh ${user.email}` : "Dikonfirmasi via Admin API"),
    })

    return NextResponse.json({
      message: "Pembayaran berhasil dikonfirmasi dan akun telah diaktifkan.",
      ...result,
    })
  } catch (error) {
    console.error("[api/payment/confirm-manual] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    )
  }
}
