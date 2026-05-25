import { test, expect } from "@playwright/test";

test.describe("F1 — Authentication", () => {
  test("F1.1 — Registration with valid invite code", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();

    await page.goto("/register");
    await page.fill("#businessName", "Test Bisnis E2E");
    await page.fill("#email", `test-${Date.now()}@rostra-test.com`);
    await page.fill("#password", "TestPassword123!");
    await page.fill("#inviteCode", process.env.TEST_INVITE_CODE || "");
    await page.click('button[type="submit"]');

    // After successful registration, user is redirected
    await page.waitForURL(/\/settings/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/settings/);

    // No error toast visible
    await expect(page.locator('[role="status"]')).not.toBeVisible();
    await ctx.close();
  });

  test("F1.2 — Registration with wrong invite code", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();

    await page.goto("/register");
    await page.fill("#businessName", "Test Bisnis E2E");
    await page.fill("#email", `bad-${Date.now()}@rostra-test.com`);
    await page.fill("#password", "TestPassword123!");
    await page.fill("#inviteCode", "WRONGCODE");
    await page.click('button[type="submit"]');

    // Should stay on register page with error
    await expect(page).toHaveURL(/\/register/);
    await expect(page.locator(".bg-destructive\\/10")).toBeVisible();

    await ctx.close();
  });

  test("F1.3 — Login", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", process.env.TEST_USER_EMAIL || "");
    await page.fill("#password", process.env.TEST_USER_PASS || "");
    await page.click('button[type="submit"]');

    await page.waitForURL(/^\/(\?|settings|$)/, { timeout: 15_000 });
    await expect(page.locator("h1")).toContainText("Dashboard");
  });

  test("F1.4 — Protected route redirect", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();

    await page.goto("/");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);

    await ctx.close();
  });
});
