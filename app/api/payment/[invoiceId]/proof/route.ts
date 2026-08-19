import { type NextRequest, NextResponse } from "next/server"
import { PaymentService } from "@/lib/payment/service"
import { createClient } from "@/lib/supabase/server"

function isValidImageUrl(url?: string | null): boolean {
  if (!url) return false
  const trimmed = url.trim().toLowerCase()

  // Disallow javascript/data html/svg scripts
  if (
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:text/html") ||
    trimmed.endsWith(".svg") ||
    trimmed.includes("<script")
  ) {
    return false
  }

  // Must be https:// or valid image data URI
  return (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("data:image/jpeg") ||
    trimmed.startsWith("data:image/png") ||
    trimmed.startsWith("data:image/webp")
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  try {
    const { invoiceId } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { proofUrl, senderName, senderBank, notes } = body

    if (proofUrl && !isValidImageUrl(proofUrl)) {
      return NextResponse.json(
        { error: "Format bukti transfer tidak valid. Gunakan format JPG, PNG, atau WEBP." },
        { status: 400 },
      )
    }

    // Sanitize string lengths
    const safeSenderName = senderName ? String(senderName).slice(0, 100).trim() : undefined
    const safeSenderBank = senderBank ? String(senderBank).slice(0, 50).trim() : undefined
    const safeNotes = notes ? String(notes).slice(0, 500).trim() : undefined

    const updatedInvoice = await PaymentService.submitPaymentProof({
      invoiceId,
      userId: user.id,
      proofUrl: proofUrl || undefined,
      senderName: safeSenderName,
      senderBank: safeSenderBank,
      customerNotes: safeNotes,
    })

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
    })
  } catch (error) {
    console.error("[api/payment/proof] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    )
  }
}
