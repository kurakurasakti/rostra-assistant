import type { APIRequestContext } from "@playwright/test"

const WEBHOOK_PATH = "/api/webhook/whatsapp"

export async function sendTestMessage(
  request: APIRequestContext,
  baseURL: string,
  payload: {
    userId: string
    sender: string
    message: string
    name: string
    messageId?: string
  },
) {
  return request.post(`${baseURL}${WEBHOOK_PATH}`, {
    headers: {
      "Content-Type": "application/json",
      "x-webhook-secret": process.env.WEBHOOK_SECRET || "",
    },
    data: {
      ...payload,
      messageId: payload.messageId || `msg-test-${Date.now()}`,
    },
  })
}
