import { test, expect } from "@playwright/test";

test.describe("F14 — Template Editor", () => {
  test("F14.1 — View, edit, and persist templates", async ({ page }) => {
    await page.goto("/settings?tab=ai");

    // Template cards should be visible
    await expect(page.locator("text=konfirmasi_pesanan")).toBeVisible();
    await expect(page.locator("text=pengingat_pembayaran")).toBeVisible();
    await expect(page.locator("text=pengingat_janji_temu")).toBeVisible();

    // Edit konfirmasi_pesanan template
    await page.click("text=konfirmasi_pesanan");

    // Insert variable chip
    await page.click('button:has-text("{{nama_klien}}")');

    // Verify chip inserted into textarea
    const textarea = page.locator("textarea");
    await expect(textarea).toHaveValue(/nama_klien/);

    // Save
    await page.click('button:has-text("Simpan")');

    // Success toast
    await expect(page.locator('[role="status"]')).toBeVisible({ timeout: 5_000 });

    // Reload and verify persistence
    await page.reload();
    await page.click("text=konfirmasi_pesanan");
    await expect(textarea).not.toBeEmpty();
  });

  test("F14.2 — Empty template rejected", async ({ page }) => {
    await page.goto("/settings?tab=ai");
    await page.click("text=konfirmasi_pesanan");

    // Clear the template body
    await page.fill("textarea", "");

    // Try to save
    await page.click('button:has-text("Simpan")');

    // Validation error
    await expect(page.locator("text=tidak boleh kosong")).toBeVisible({
      timeout: 5_000,
    });
  });
});
