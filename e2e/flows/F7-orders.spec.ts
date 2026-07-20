import { expect, test } from "@playwright/test"
import { getScheduledMessages } from "../helpers/db"

test.describe("F7 — Order Management", () => {
  test("F7.1 — Create order with payment stages and appointment", async ({ page }) => {
    await page.goto("/clients")

    // Click on client
    await page.click("text=Siti Nurhaliza")
    await page.waitForURL(/\/clients\//)

    // Go to Pesanan tab
    await page.click('button:has-text("Pesanan")')

    // Click new order
    await page.click('button:has-text("Buat Pesanan Baru")')

    // Fill order
    await page.fill("input", "Kebaya custom pengantin")

    // Total price
    await page.fill('input[placeholder*="Rp"]', "3500000")

    // Status
    await page.selectOption("select", "aktif")

    // Add payment stage
    await page.click('button:has-text("Tambah Tahap Pembayaran")')
    await page.fill('input[placeholder*="Nama"]', "DP 50%")
    await page.fill('input[placeholder*="Jumlah"]', "1750000")

    // Due date: 7 days from today
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 7)
    await page.fill('input[type="date"]', dueDate.toISOString().split("T")[0])

    // Add appointment
    await page.click('button:has-text("Tambah Janji Temu")')

    // Save order
    await page.click('button:has-text("Simpan Pesanan")')

    // Order appears in list
    await expect(page.locator("text=Kebaya custom pengantin")).toBeVisible({
      timeout: 10_000,
    })

    // Payment stage visible
    await expect(page.locator("text=DP 50%")).toBeVisible()
  })

  test("F7.2 — Scheduled messages auto-generated", async () => {
    const userId = process.env.TEST_USER_ID
    if (!userId) test.skip()

    const messages = await getScheduledMessages(userId)
    expect(messages.length).toBeGreaterThanOrEqual(3)

    const types = messages.map((m) => m.type)
    expect(types).toContain("konfirmasi_pesanan")
    expect(types).toContain("pengingat_pembayaran")
    expect(types).toContain("pengingat_janji_temu")

    const pendingMsg = messages.find((m) => m.type === "konfirmasi_pesanan")
    expect(pendingMsg?.status).toBe("menunggu")
  })

  test("F7.3 — Mark payment as paid", async ({ page }) => {
    await page.goto("/clients")
    await page.click("text=Siti Nurhaliza")
    await page.waitForURL(/\/clients\//)
    await page.click('button:has-text("Pesanan")')
    await page.click("text=Kebaya custom pengantin")

    // Mark payment as paid
    await page.click('button:has-text("Tandai Lunas")')

    // Should show as paid
    await expect(page.locator("text=DP 50%").locator("..")).toContainText("Lunas", {
      timeout: 5_000,
    })
  })
})
