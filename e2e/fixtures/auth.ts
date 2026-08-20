import { test as base, type Page } from "@playwright/test"

export type AuthFixtures = {
  authedPage: Page
  userId: string
}

export const test = base.extend<AuthFixtures>({
  authedPage: async ({ page }, use) => {
    await page.goto("/login")
    await page.fill("#email", process.env.TEST_USER_EMAIL!)
    await page.fill("#password", process.env.TEST_USER_PASS!)
    await page.click('button[type="submit"]')
    await page.waitForURL(/^\/(\?|settings|$)/)
    await use(page)
  },

  userId: async ({}, use) => {
    use(process.env.TEST_USER_ID || "")
  },
})

export { expect } from "@playwright/test"
