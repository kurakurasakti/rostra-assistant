import { expect, test } from "@playwright/test"

test.describe("F11 — Notification Bell", () => {
  test("F11.1 — Bell shows unread badge", async ({ page }) => {
    await page.goto("/")

    // Bell icon should show badge
    await expect(page.locator('[class*="notification"]')).toBeVisible()
  })

  test("F11.2 — Bell popover opens and lists notifications", async ({ page }) => {
    await page.goto("/")

    // Click bell icon
    await page.click('[class*="notification"]')

    // Popover should appear
    await expect(page.locator("text=Percobaan manipulasi AI")).toBeVisible({
      timeout: 5_000,
    })
  })

  test("F11.3 — Badge clears after viewing", async ({ page }) => {
    await page.goto("/")

    // Click bell to open
    await page.click('[class*="notification"]')

    // Close popover
    await page.keyboard.press("Escape")

    // Badge should be cleared or hidden
    await expect(page.locator('[class*="notification"]')).not.toContainText(/[1-9]/)
  })
})
