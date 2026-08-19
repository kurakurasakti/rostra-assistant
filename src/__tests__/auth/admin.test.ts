import { describe, expect, it } from "vitest"
import { isEmailAdmin } from "@/lib/auth/admin"

describe("Admin Authorization & RBAC", () => {
  it("should recognize emails configured in ADMIN_EMAILS", () => {
    process.env.ADMIN_EMAILS = "roy@rostra.app, admin@glim.app"

    expect(isEmailAdmin("roy@rostra.app")).toBe(true)
    expect(isEmailAdmin("ROY@ROSTRA.APP")).toBe(true)
    expect(isEmailAdmin("admin@glim.app")).toBe(true)
    expect(isEmailAdmin("regularuser@gmail.com")).toBe(false)
    expect(isEmailAdmin(null)).toBe(false)
    expect(isEmailAdmin(undefined)).toBe(false)
  })
})
