import { type NextRequest, NextResponse } from "next/server"
import { checkIsAdmin } from "@/lib/auth/admin"
import { PaymentService } from "@/lib/payment/service"
import {
  buildProofStoragePath,
  isValidImageMagicBytes,
  validateProofFile,
} from "@/lib/payment/upload-validation"
import { createClient, createServiceClient } from "@/lib/supabase/server"

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
      return NextResponse.json({ error: "Unauthorized: Silakan login terlebih dahulu" }, { status: 401 })
    }

    // Verify invoice exists and belongs to this user (IDOR protection)
    const invoiceResult = await PaymentService.getInvoice(invoiceId, user.id)
    if (!invoiceResult) {
      return NextResponse.json({ error: "Invoice tidak ditemukan atau bukan milik Anda" }, { status: 404 })
    }

    const contentType = request.headers.get("content-type") || ""
    let senderName: string | undefined
    let senderBank: string | undefined
    let notes: string | undefined
    let fileBuffer: Buffer | null = null
    let fileMimeType: string = "image/jpeg"
    let storagePath: string | undefined

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      const file = formData.get("file") as File | null
      senderName = (formData.get("senderName") as string) || undefined
      senderBank = (formData.get("senderBank") as string) || undefined
      notes = (formData.get("notes") as string) || undefined

      if (file && file.size > 0) {
        const validation = validateProofFile(file.type, file.size)
        if (!validation.valid) {
          return NextResponse.json({ error: validation.error }, { status: 400 })
        }

        const arrayBuffer = await file.arrayBuffer()
        fileBuffer = Buffer.from(arrayBuffer)
        fileMimeType = file.type

        if (!isValidImageMagicBytes(fileBuffer)) {
          return NextResponse.json(
            { error: "File yang diunggah bukan gambar yang valid (Magic bytes mismatch)." },
            { status: 400 },
          )
        }
      }
    } else {
      const body = await request.json().catch(() => ({}))
      senderName = body.senderName
      senderBank = body.senderBank
      notes = body.notes

      if (body.proofUrl && typeof body.proofUrl === "string") {
        const rawUrl = body.proofUrl.trim()
        if (rawUrl.startsWith("data:")) {
          // Parse data URI: data:image/jpeg;base64,...
          const match = rawUrl.match(/^data:([^;]+);base64,(.+)$/)
          if (match) {
            const detectedMime = match[1]
            const base64Data = match[2]
            const validation = validateProofFile(detectedMime, Math.floor((base64Data.length * 3) / 4))
            if (!validation.valid) {
              return NextResponse.json({ error: validation.error }, { status: 400 })
            }
            fileBuffer = Buffer.from(base64Data, "base64")
            fileMimeType = detectedMime

            if (!isValidImageMagicBytes(fileBuffer)) {
              return NextResponse.json(
                { error: "File data URI bukan format gambar valid." },
                { status: 400 },
              )
            }
          } else {
            return NextResponse.json({ error: "Format data URI tidak valid." }, { status: 400 })
          }
        } else if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
          // Disallow raw external URLs for storage security
          return NextResponse.json(
            { error: "Harap unggah file gambar langsung (JPG, PNG, WEBP)." },
            { status: 400 },
          )
        }
      }
    }

    // Upload to private Supabase storage bucket 'payment-proofs' if file provided
    if (fileBuffer) {
      storagePath = buildProofStoragePath(user.id, invoiceId, fileMimeType)

      const serviceClient = await createServiceClient()
      const { error: uploadError } = await serviceClient.storage
        .from("payment-proofs")
        .upload(storagePath, fileBuffer, {
          contentType: fileMimeType,
          upsert: true,
        })

      if (uploadError) {
        console.error("[api/payment/proof] Upload to storage error:", uploadError)
        return NextResponse.json(
          { error: `Gagal mengunggah file bukti ke storage: ${uploadError.message}` },
          { status: 500 },
        )
      }
    }

    // Sanitize metadata string lengths
    const safeSenderName = senderName ? String(senderName).slice(0, 100).trim() : undefined
    const safeSenderBank = senderBank ? String(senderBank).slice(0, 50).trim() : undefined
    const safeNotes = notes ? String(notes).slice(0, 500).trim() : undefined

    const updatedInvoice = await PaymentService.submitPaymentProof({
      invoiceId,
      userId: user.id,
      proofUrl: storagePath || invoiceResult.invoice.proof_url || undefined,
      senderName: safeSenderName,
      senderBank: safeSenderBank,
      customerNotes: safeNotes,
    })

    // Generate 5-minute signed URL for immediate preview
    const signedUrl = await PaymentService.getProofSignedUrl(updatedInvoice.proof_url, 300)

    return NextResponse.json({
      success: true,
      invoice: {
        ...updatedInvoice,
        proof_signed_url: signedUrl || undefined,
      },
      signedUrl,
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

/**
 * GET: Securely generate a 5-minute signed URL for previewing payment proof (owner or admin only)
 */
export async function GET(
  _request: NextRequest,
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
      return NextResponse.json({ error: "Unauthorized: Silakan login terlebih dahulu" }, { status: 401 })
    }

    // Fetch invoice
    const serviceClient = await createServiceClient()
    const { data: invoice, error: fetchError } = await serviceClient
      .from("invoices")
      .select("id, user_id, proof_url")
      .eq("id", invoiceId)
      .maybeSingle()

    if (fetchError || !invoice) {
      return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 })
    }

    // Authorization: Must be owner OR admin
    const isAdmin = await checkIsAdmin(user)
    if (invoice.user_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: Anda tidak memiliki akses ke bukti transfer ini" }, { status: 403 })
    }

    if (!invoice.proof_url) {
      return NextResponse.json({ error: "Bukti transfer belum diunggah" }, { status: 404 })
    }

    const signedUrl = await PaymentService.getProofSignedUrl(invoice.proof_url, 300)
    if (!signedUrl) {
      return NextResponse.json({ error: "Gagal membuat URL pratinjau bukti transfer" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      signedUrl,
    })
  } catch (error) {
    console.error("[api/payment/proof:GET] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    )
  }
}
