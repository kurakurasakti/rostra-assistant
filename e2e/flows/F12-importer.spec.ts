import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

test.describe("F12 — Excel/CSV Importer API", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("F12.1 — Valid rows imported successfully", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/import/confirm`, {
      data: {
        rows: [
          { name: "Dewi Lestari", phone: "082345678901", email: "dewi@test.com", notes: "" },
          { name: "Rina Melati", phone: "083456789012", email: "", notes: "Repeat customer" },
          { name: "Fitri Handayani", phone: "084567890123", email: "", notes: "" },
        ],
      },
    });

    const body = await response.json();
    expect(response.status()).toBe(200);
    expect(body).toMatchObject({
      imported: 3,
      skipped: 0,
      duplicates: 0,
      errors: [],
    });
  });

  test("F12.2 — Duplicate detection", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/import/confirm`, {
      data: {
        rows: [
          { name: "Dewi Lestari", phone: "082345678901", email: "dewi@test.com", notes: "" },
          { name: "Rina Melati", phone: "083456789012", email: "", notes: "Repeat customer" },
          { name: "Fitri Handayani", phone: "084567890123", email: "", notes: "" },
        ],
      },
    });

    const body = await response.json();
    expect(response.status()).toBe(200);
    expect(body).toMatchObject({
      imported: 0,
      skipped: 0,
      duplicates: 3,
      errors: [],
    });
  });

  test("F12.3 — Invalid rows rejected", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/import/confirm`, {
      data: {
        rows: [
          { name: "Valid", phone: "085678901234", email: "", notes: "" },
          { name: "", phone: "086789012345", email: "", notes: "" },
          { name: "Invalid Phone", phone: "ABCXYZ", email: "", notes: "" },
        ],
      },
    });

    const body = await response.json();
    expect(response.status()).toBe(200);
    expect(body).toMatchObject({
      imported: 1,
      skipped: 2,
      duplicates: 0,
    });
    expect(body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ row: 3, reason: expect.stringContaining("Nama") }),
        expect.objectContaining({ row: 4, reason: expect.stringContaining("ABCXYZ") }),
      ]),
    );
  });
});
