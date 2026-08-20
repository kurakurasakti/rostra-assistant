import { type NextRequest, NextResponse } from "next/server"
import { requireAdminUser } from "@/lib/auth/admin"
import { PaymentService } from "@/lib/payment/service"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized: Silakan login terlebih dahulu" }, { status: 401 })
    }

    // Best Practice RBAC check
    const authCheck = await requireAdminUser(user)
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.reason || "Forbidden: Akses ditolak" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "all"
    const search = searchParams.get("search") || undefined

    const invoices = await PaymentService.getAllInvoicesForAdmin({
      status,
      search,
    })

    return NextResponse.json({
      success: true,
      invoices,
    })
  } catch (error) {
    console.error("[api/admin/invoices] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    )
  }
}
