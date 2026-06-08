import { test, expect } from "@playwright/test";
import { getClientByPhone } from "../helpers/db";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

test.describe("F16 — Security Boundary Tests", () => {
  test("F16.1 — Cannot send messages without auth", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ storageState: undefined });
    const response = await ctx.post(`${BASE_URL}/api/messages/send`, {
      data: { whatsapp_number: "628xxx", message: "test" },
    });
    expect(response.status()).toBe(401);
    await ctx.dispose();
  });

  test("F16.2 — Cannot import without auth", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ storageState: undefined });
    const response = await ctx.post(`${BASE_URL}/api/import/confirm`, {
      data: { rows: [] },
    });
    expect(response.status()).toBe(401);
    await ctx.dispose();
  });

  test("F16.3 — Import scoped to auth user (ignores payload user_id)", async ({ request }) => {
    const userId = process.env.TEST_USER_ID;
    if (!userId) test.skip();

    // Import with a spoofed user_id in the payload
    const response = await request.post(`${BASE_URL}/api/import/confirm`, {
      data: {
        rows: [
          { name: "Test", phone: "087890123456", user_id: "00000000-0000-0000-0000-000000000000" },
        ],
      },
    });

    expect(response.ok()).toBeTruthy();

    // Verify the client was created under the authenticated user, not the spoofed one
    const client = await getClientByPhone("6287890123456");
    expect(client).not.toBeNull();
    expect(client.user_id).toBe(userId);
    expect(client.user_id).not.toBe("00000000-0000-0000-0000-000000000000");
  });
});
