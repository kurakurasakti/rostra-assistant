import { expect, test } from "@playwright/test"

test.describe("F5 — Escalation Rules Setup", () => {
  test("F5.1 — View default escalation keywords", async ({ page }) => {
    await page.goto("/settings?tab=ai")

    // Default keywords should be visible
    await expect(page.locator("text=kecewa")).toBeVisible()
    await expect(page.locator("text=cancel")).toBeVisible()
    await expect(page.locator("text=batal")).toBeVisible()
    await expect(page.locator("text=refund")).toBeVisible()
  })

  test("F5.2 — Add custom keyword and persist", async ({ page }) => {
    await page.goto("/settings?tab=ai")

    // Add keyword
    await page.fill("input", "tidak jadi")
    await page.click('button:has-text("Tambah")')

    // Keyword appears in list
    await expect(page.locator("text=tidak jadi")).toBeVisible()

    // Save
    await page.click('button:has-text("Simpan")')
    await expect(page.locator('[role="status"]')).toBeVisible()

    // Reload and verify persistence
    await page.reload()
    await expect(page.locator("text=tidak jadi")).toBeVisible()
  })

  test("F5.3 — Auto-reply level display", async ({ page }) => {
    await page.goto("/settings?tab=ai")

    // Level 1 should be active
    await expect(page.locator("text=Draft Mode")).toBeVisible()
    await expect(page.locator("text=AKTIF")).toBeVisible()

    // Level 2 should show lock with progress
    await expect(page.locator("text=Level 2")).toBeVisible()
    await expect(page.locator(".lucide-lock")).toBeVisible()

    // Level 3 should show lock
    await expect(page.locator("text=Level 3")).toBeVisible()
  })
})
