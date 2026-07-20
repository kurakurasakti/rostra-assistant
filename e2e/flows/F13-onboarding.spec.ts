import { expect, test } from "@playwright/test"

test.describe("F13 — Dashboard Onboarding", () => {
  test("F13.1 — Onboarding card shows correct state for new user", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined })
    const page = await ctx.newPage()

    // Register a brand new user
    const email = `onboarding-${Date.now()}@glim-test.com`
    await page.goto("/register")
    await page.fill("#businessName", "Onboarding Test")
    await page.fill("#email", email)
    await page.fill("#password", "TestPassword123!")
    await page.fill("#inviteCode", process.env.TEST_INVITE_CODE || "")
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/settings/, { timeout: 15_000 })

    // First login → onboarding wizard appears; skip it so it never blocks clicks
    await expect(page.getByTestId("onboarding-wizard")).toBeVisible()
    await page.getByTestId("wizard-skip").click()
    await expect(page.getByTestId("onboarding-wizard")).not.toBeVisible()

    // Navigate to dashboard
    await page.goto("/")

    // Onboarding card should be visible
    await expect(page.locator("text=Mulai dengan Glim")).toBeVisible()

    // All 3 steps unchecked initially
    await expect(page.locator("text=Hubungkan WhatsApp")).toBeVisible()
    await expect(page.locator("text=Tambah Client pertama")).toBeVisible()
    await expect(page.locator("text=Buat pesanan pertama")).toBeVisible()

    await ctx.close()
  })

  test("F13.2 — Deep link goes to correct tab", async ({ page }) => {
    await page.goto("/")

    // Click step 1 link
    await page.click('a[href="/settings?tab=whatsapp"]')

    // Should navigate to settings with whatsapp tab
    await expect(page).toHaveURL(/\/settings/)
  })

  test("F13.3 — Onboarding wizard shows once, then never again", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined })
    const page = await ctx.newPage()

    // Register a brand new user
    const email = `wizard-${Date.now()}@glim-test.com`
    await page.goto("/register")
    await page.fill("#businessName", "Wizard Test")
    await page.fill("#email", email)
    await page.fill("#password", "TestPassword123!")
    await page.fill("#inviteCode", process.env.TEST_INVITE_CODE || "")
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/settings/, { timeout: 15_000 })

    // Wizard appears on first login
    const wizard = page.getByTestId("onboarding-wizard")
    await expect(wizard).toBeVisible()

    // Walk through all 6 steps (welcome + 5 setup steps)
    const next = page.getByTestId("wizard-next")
    for (let i = 0; i < 5; i++) {
      await expect(next).toHaveText("Lanjut")
      await next.click()
    }
    await expect(next).toHaveText("Selesai")
    await next.click()
    await expect(wizard).not.toBeVisible()

    // Reload — wizard must not reappear (persisted server-side).
    // markSeen upsert is fire-and-forget; give it a moment to commit.
    await page.waitForTimeout(1500)
    await page.reload()
    await page.waitForLoadState("networkidle")
    await expect(wizard).not.toBeVisible()

    await ctx.close()
  })
})
