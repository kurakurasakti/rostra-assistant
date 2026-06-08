import { test, expect } from "@playwright/test";

test.describe("F15 — Client Message History", () => {
  test("F15.1 — Tab 3 shows conversation history", async ({ page }) => {
    await page.goto("/clients");

    // Click on Siti Nurhaliza
    await page.click("text=Siti Nurhaliza");
    await page.waitForURL(/\/clients\//);

    // Click Riwayat Pesan tab
    await page.click('button:has-text("Riwayat Pesan")');

    // Messages from inbox should appear
    await expect(page.locator("text=kak mau tanya harga kebaya")).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.locator("text=Halo Kak, untuk harga kebaya")).toBeVisible();

    // Check different styling for inbound vs outbound
    const inboundCount = await page
      .locator(".bg-muted\\/80")
      .count();
    const outboundCount = await page
      .locator(".bg-primary")
      .count();

    expect(inboundCount).toBeGreaterThan(0);
    expect(outboundCount).toBeGreaterThan(0);
  });
});
