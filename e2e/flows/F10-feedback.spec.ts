import { expect, test } from "@playwright/test"
import { getAIFeedback, getInboxMessage, getProfile } from "../helpers/db"
import { sendTestMessage } from "../helpers/wa-webhook"

const BASE_URL = process.env.BASE_URL || "http://localhost:3000"
const SENDER = "6281234567890"

test.describe("F10 — Feedback Loop", () => {
  test("F10.1 — Correction recorded when draft edited", async ({ request }) => {
    const userId = process.env.TEST_USER_ID
    if (!userId) test.skip()

    // Send a message that will trigger AI draft
    const res = await sendTestMessage(request, BASE_URL, {
      userId,
      sender: SENDER,
      message: "berapa lama estimasi pengerjaannya kak?",
      name: "Siti Nurhaliza",
      messageId: `msg-test-feedback-${Date.now()}`,
    })
    expect(res.ok()).toBeTruthy()

    // Wait for AI to generate draft
    await test.waitForTimeout(10000)

    // Get the message ID and AI draft
    const msg = await getInboxMessage(userId, SENDER)
    expect(msg).not.toBeNull()
    expect(msg.ai_draft_reply).not.toBeNull()

    const messageId = msg.id

    // Send a reply with DIFFERENT text than the draft
    const replyRes = await request.post(`${BASE_URL}/api/messages/send`, {
      data: {
        whatsapp_number: SENDER,
        message: "Estimasi 3-4 minggu ya Kak Siti, tergantung model 😊",
        reply_to_id: messageId,
      },
    })
    expect(replyRes.ok()).toBeTruthy()

    // Wait for feedback processing
    await test.waitForTimeout(2000)

    // Assert feedback recorded
    const feedback = await getAIFeedback(userId)
    expect(feedback).not.toBeNull()
    expect(feedback.original).not.toBe("")
    expect(feedback.corrected).not.toBe("")
    expect(feedback.original).not.toBe(feedback.corrected)

    // Assert feedback count incremented
    const profile = await getProfile(userId)
    expect(profile?.feedback_count).toBeGreaterThan(0)
  })
})
