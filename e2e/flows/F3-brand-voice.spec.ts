import path from "node:path"
import { expect, test } from "@playwright/test"

test.describe("F3 — Brand Voice Setup", () => {
  test("F3.1 — Upload WhatsApp chat export and analyze brand voice", async ({ page }) => {
    await page.goto("/settings?tab=ai")

    // Upload a WhatsApp export file
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(path.resolve("e2e/fixtures/whatsapp-export.txt"))

    // Sender list should appear
    await expect(page.locator("text=Pilih Pengirim")).toBeVisible({ timeout: 10_000 })

    // Select the business owner sender
    await page.selectOption("select", { index: 1 })

    // Click analyze
    await page.click('button:has-text("Analisa Gaya")')

    // Loading state
    await expect(page.locator('button:has-text("Menganalisa")')).toBeVisible()

    // Brand voice text appears
    await expect(page.locator("#brandVoice")).not.toBeEmpty({ timeout: 30_000 })

    // Save
    await page.click('button:has-text("Simpan")')

    // Success toast
    await expect(page.locator('[role="status"]')).toBeVisible({ timeout: 5_000 })
  })

  test("F3.2 — Test AI draft preview", async ({ page }) => {
    await page.goto("/settings?tab=ai")

    await page.fill("input", { text: "kak mau tanya harga kebaya dong" })
    await page.click('button:has-text("Coba Sekarang")')

    // AI-generated reply should appear
    await expect(page.locator(".text-sm")).not.toBeEmpty({ timeout: 15_000 })
  })
})
