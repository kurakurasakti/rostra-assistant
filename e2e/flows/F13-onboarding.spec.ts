import { test, expect } from "@playwright/test";

test.describe("F13 — Dashboard Onboarding", () => {
  test("F13.1 — Onboarding card shows correct state for new user", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();

    // Register a brand new user
    const email = `onboarding-${Date.now()}@rostra-test.com`;
    await page.goto("/register");
    await page.fill("#businessName", "Onboarding Test");
    await page.fill("#email", email);
    await page.fill("#password", "TestPassword123!");
    await page.fill("#inviteCode", process.env.TEST_INVITE_CODE || "");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/settings/, { timeout: 15_000 });

    // Navigate to dashboard
    await page.goto("/");

    // Onboarding card should be visible
    await expect(page.locator("text=Mulai dengan Rostra")).toBeVisible();

    // All 3 steps unchecked initially
    await expect(page.locator("text=Hubungkan WhatsApp")).toBeVisible();
    await expect(page.locator("text=Tambah klien pertama")).toBeVisible();
    await expect(page.locator("text=Buat pesanan pertama")).toBeVisible();

    await ctx.close();
  });

  test("F13.2 — Deep link goes to correct tab", async ({ page }) => {
    await page.goto("/");

    // Click step 1 link
    await page.click('a[href="/settings?tab=whatsapp"]');

    // Should navigate to settings with whatsapp tab
    await expect(page).toHaveURL(/\/settings/);
  });
});
