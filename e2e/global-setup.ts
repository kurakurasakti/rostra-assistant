import { chromium, type FullConfig } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const AUTH_PATH = path.resolve("e2e/.auth/user.json");

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || "http://localhost:3000";

  const email = process.env.TEST_USER_EMAIL || "test-e2e@glim-test.com";
  const password = process.env.TEST_USER_PASS || "TestPassword123!";
  const inviteCode = process.env.TEST_INVITE_CODE || "";

  // Try to sign in first
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if user exists
    const { data: users } = await supabase.auth.admin.listUsers();
    const existing = users?.users.find((u) => u.email === email);

    if (!existing) {
      // Register via browser
      const browser = await chromium.launch();
      const page = await browser.newPage();
      await page.goto(`${baseURL}/register`);
      await page.fill("#businessName", "Test Bisnis");
      await page.fill("#email", email);
      await page.fill("#password", password);
      await page.fill("#inviteCode", inviteCode);
      await page.click('button[type="submit"]');
      await page.waitForURL("**/settings**", { timeout: 15_000 });
      await page.context().storageState({ path: AUTH_PATH });
      await browser.close();
    } else {
      // Login
      const browser = await chromium.launch();
      const page = await browser.newPage();
      await page.goto(`${baseURL}/login`);
      await page.fill("#email", email);
      await page.fill("#password", password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/^\/(\?|settings|$)/, { timeout: 15_000 });
      await page.context().storageState({ path: AUTH_PATH });
      await browser.close();
    }

    // Store user ID
    const { data: userData } = await supabase.auth.admin.listUsers();
    const user = userData?.users.find((u) => u.email === email);
    if (user) {
      process.env.TEST_USER_ID = user.id;
    }
  } else {
    // No Supabase admin key — try login via browser only
    const browser = await chromium.launch();
    const page = await browser.newPage({ storageState: undefined });
    await page.goto(`${baseURL}/login`);
    await page.fill("#email", email);
    await page.fill("#password", password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/^\/(\?|settings|$)/, { timeout: 15_000 });
    await page.context().storageState({ path: AUTH_PATH });
    await browser.close();
  }
}

export default globalSetup;
