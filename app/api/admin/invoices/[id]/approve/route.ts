import { type NextRequest, NextResponse } from "next/server"
import { requireAdminUser } from "@/lib/auth/admin"
import { PaymentService } from "@/lib/payment/service"
import { getAdminToCustomerWhatsAppUrl } from "@/lib/payment/utils"
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
    const { adminNotes } = body

    const result = await PaymentService.confirmPaymentManual({
      invoiceId: id,
      adminNotes: adminNotes || `Diverifikasi oleh admin ${user.email}`,
    })

    const whatsappUrl = getAdminToCustomerWhatsAppUrl(
      result.invoice,
      undefined,
      undefined,
    )

    return NextResponse.json({
      message: "Invoice berhasil disetujui & langganan user telah aktif.",
      whatsappUrl,
      ...result,
    })
  } catch (error) {
    console.error("[api/admin/invoices/approve] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    )
  }
}
