import { type NextRequest, NextResponse } from "next/server"
import { PaymentService } from "@/lib/payment/service"

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value
    })

    console.log("[Webhook/Xendit] Received event:", {
      external_id: payload?.external_id,
      status: payload?.status,
      amount: payload?.amount,
    })

    const result = await PaymentService.handleXenditWebhook(payload, headers)

    return NextResponse.json({
      received: true,
      result,
    })
  } catch (error) {
    console.error("[Webhook/Xendit] Error handling webhook:", error)
    // Do not echo internal error text back to the caller: this is an
    // unauthenticated endpoint and the messages reveal configuration
    // state to anyone probing it.
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 400 })
  }
}
