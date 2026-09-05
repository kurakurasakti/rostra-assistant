import { type NextRequest, NextResponse } from "next/server"
import { PaymentService } from "@/lib/payment/service"
import { createClient } from "@/lib/supabase/server"

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

    const result = await PaymentService.getInvoice(invoiceId, user?.id)
    if (!result) {
      return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error("[api/payment/[invoiceId]] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    )
  }
}
