import { test, expect } from "@playwright/test";

test.describe("F6 — Client Management", () => {
  test("F6.1 — Add client manually", async ({ page }) => {
    await page.goto("/clients");

    // Open add client sheet
    await page.click('button:has-text("Tambah Klien")');

    // Fill form
    await page.fill('input[placeholder="Contoh: Siti Rahayu"]', "Siti Nurhaliza");
    await page.fill(
      'input[placeholder="08123456789 atau 628123456789"]',
      "081234567890",
    );
    await page.fill('input[placeholder="siti@email.com"]', "siti@test.com");
    await page.fill("textarea", "Pelanggan VIP, suka model klasik");

    // Submit
    await page.click('button[type="submit"]:has-text("Tambah Klien")');

    // Client appears in list
    await expect(page.locator("text=Siti Nurhaliza")).toBeVisible({ timeout: 10_000 });
  });

  test("F6.2 — Duplicate phone number rejected", async ({ page }) => {
    await page.goto("/clients");

    await page.click('button:has-text("Tambah Klien")');
    await page.fill('input[placeholder="Contoh: Siti Rahayu"]', "Siti Lain");
    await page.fill(
      'input[placeholder="08123456789 atau 628123456789"]',
      "081234567890",
    );
    await page.click('button[type="submit"]:has-text("Tambah Klien")');

    // Duplicate error
    await expect(page.locator("text=Nomor WhatsApp sudah terdaftar")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("F6.3 — Client detail — AI notes", async ({ page }) => {
    await page.goto("/clients");

    // Click on client
    await page.click("text=Siti Nurhaliza");
    await page.waitForURL(/\/clients\//);

    // Navigate to Profil tab
    await page.click('button:has-text("Profil")');

    // Fill AI notes
    await page.fill("textarea", "Pelanggan VIP, sudah order 5x. Boleh diskon max 10%. Panggil Kak Siti.");
    await page.click('button:has-text("Simpan")');

    // Success toast
    await expect(page.locator('[role="status"]')).toBeVisible({ timeout: 5_000 });

    // Reload and verify persistence
    await page.reload();
    await expect(page.locator("textarea")).toHaveValue(
      /Pelanggan VIP/,
    );
  });
});
