import { test, expect } from "@playwright/test";

const BUSINESS_TEXT = `Kami butik kebaya di Surabaya. Jahit custom kebaya mulai 1.5 juta sampai 5 juta tergantung model dan bahan. Buka Senin–Sabtu jam 9 pagi sampai 5 sore. Terima DP minimal 50%. Estimasi pengerjaan 3–4 minggu. Pembayaran via BCA, GoPay, OVO. PO sedang buka sampai akhir bulan.`;

test.describe("F4 — Business Knowledge Setup", () => {
  test("F4.1 — Extract from text input", async ({ page }) => {
    await page.goto("/settings?tab=business");

    // Switch to text input mode if needed
    await page.fill("textarea", BUSINESS_TEXT);

    // Click extract
    await page.click('button:has-text("Ekstrak")');

    // Structured fields should populate
    await expect(page.locator("text=Layanan")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("text=Jam Operasional")).toBeVisible();
    await expect(page.locator("text=Metode Pembayaran")).toBeVisible();
    await expect(page.locator("text=Status PO")).toBeVisible();

    // Save
    await page.click('button:has-text("Simpan")');

    // Success toast
    await expect(page.locator('[role="status"]')).toBeVisible({ timeout: 5_000 });
  });

  test("F4.2 — Extract from PDF/image upload", async ({ page }) => {
    await page.goto("/settings?tab=business");

    // Switch to upload mode
    await page.click('button:has-text("Upload File")');

    // Upload a file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(
      path.resolve("e2e/fixtures/price-list.pdf"),
    );

    // Loading state
    await expect(page.locator("text=Mengolah")).toBeVisible({ timeout: 5_000 });

    // After completion, fields should be populated
    await expect(page.locator("text=Layanan")).toBeVisible({ timeout: 30_000 });

    // Save
    await page.click('button:has-text("Simpan")');

    // Success toast
    await expect(page.locator('[role="status"]')).toBeVisible({ timeout: 5_000 });
  });
});
