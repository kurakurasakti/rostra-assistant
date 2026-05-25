import { test, expect } from "@playwright/test";
import { sendTestMessage } from "../helpers/wa-webhook";
import { getInboxMessage } from "../helpers/db";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

test.describe("F8 — WhatsApp Inbox", () => {
  test("F8.1 — Receive message appears in inbox", async ({ page, request }) => {
    const userId = process.env.TEST_USER_ID;
    if (!userId) test.skip();

    // Send test message via webhook
    const res = await sendTestMessage(request, BASE_URL, {
      userId,
      sender: "6281234567890",
      message: "kak mau tanya harga kebaya untuk wisuda dong",
      name: "Siti Nurhaliza",
    });
    expect(res.ok()).toBeTruthy();

    // Navigate to inbox
    await page.goto("/inbox");

    // Conversation should appear
    await expect(page.locator("text=Siti Nurhaliza")).toBeVisible({
      timeout: 10_000,
    });

    // Click conversation
    await page.click("text=Siti Nurhaliza");

    // Message text visible
    await expect(page.locator("text=kak mau tanya harga kebaya")).toBeVisible();
  });

  test("F8.2 — AI draft generated", async ({ page }) => {
    const userId = process.env.TEST_USER_ID;
    if (!userId) test.skip();

    await page.goto("/inbox");
    await page.click("text=Siti Nurhaliza");

    // Look for AI draft button
    await expect(page.locator('button:has-text("Muat Draft AI")')).toBeVisible({
      timeout: 10_000,
    });

    // Click to load draft
    await page.click('button:has-text("Muat Draft AI")');

    // AI draft should appear in textarea
    await expect(page.locator("textarea")).not.toBeEmpty({ timeout: 15_000 });
  });

  test("F8.3 — Send reply", async ({ page }) => {
    await page.goto("/inbox");
    await page.click("text=Siti Nurhaliza");

    // Edit the draft slightly
    await page.fill("textarea", "Halo Kak, untuk harga kebaya mulai dari 1.5 juta ya");

    // Send
    await page.click('button:has-text("Kirim")');

    // Sent message appears in thread
    await expect(page.locator("text=Halo Kak, untuk harga kebaya")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("F8.4 — Realtime update across tabs", async ({ page, context, request }) => {
    const userId = process.env.TEST_USER_ID;
    if (!userId) test.skip();

    // Open inbox in a second tab
    const page2 = await context.newPage();
    await page2.goto("/inbox");

    await page.goto("/inbox");

    // Send another webhook message
    const res = await sendTestMessage(request, BASE_URL, {
      userId,
      sender: "6281234567890",
      message: "testing realtime update",
      name: "Siti Nurhaliza",
      messageId: `msg-test-realtime-${Date.now()}`,
    });
    expect(res.ok()).toBeTruthy();

    // New message appears without page reload
    await expect(page.locator("text=testing realtime update")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page2.locator("text=testing realtime update")).toBeVisible({
      timeout: 10_000,
    });

    await page2.close();
  });
});
