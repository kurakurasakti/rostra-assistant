import { describe, expect, it, vi } from "vitest"
import { checkIsAdmin, isEmailAdmin, requireAdminUser } from "@/lib/auth/admin"
import {
  ALLOWED_PROOF_MIMES,
  buildProofStoragePath,
  isValidImageMagicBytes,
  MAX_PROOF_SIZE_BYTES,
  sanitizePathSegment,
  validateProofFile,
} from "@/lib/payment/upload-validation"

describe("Payment Proof Upload Validation & Storage Security", () => {
  it("upload rejects non-image mime types and oversized files", () => {
    // 1. Disallow non-image mime types
    const invalidMimes = [
      "application/pdf",
      "text/html",
      "image/svg+xml",
      "application/javascript",
      "image/gif",
      "text/plain",
      "",
    ]

    for (const mime of invalidMimes) {
      const result = validateProofFile(mime, 1024 * 100)
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    }

    // 2. Accept allowed image mime types
    for (const mime of ALLOWED_PROOF_MIMES) {
      const result = validateProofFile(mime, 1024 * 500)
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    }

    // 3. Reject oversized files (> 3MB)
    const oversizedResult = validateProofFile("image/jpeg", MAX_PROOF_SIZE_BYTES + 1)
    expect(oversizedResult.valid).toBe(false)
    expect(oversizedResult.error).toContain("3MB")

    // 4. Reject empty files (0 bytes)
    const emptyResult = validateProofFile("image/jpeg", 0)
    expect(emptyResult.valid).toBe(false)
  })

  it("sanitizes storage path and prevents path traversal", () => {
    const maliciousUserId = "../../../etc/passwd"
    const maliciousInvoiceId = "..\\..\\windows\\system32"

    const cleanUser = sanitizePathSegment(maliciousUserId)
    expect(cleanUser).not.toContain("..")
    expect(cleanUser).not.toContain("/")
    expect(cleanUser).not.toContain("\\")

    const path = buildProofStoragePath(maliciousUserId, maliciousInvoiceId, "image/png")
    expect(path).toBe("etcpasswd/windowssystem32.png")
    expect(path).not.toContain("..")
  })

  it("validates image magic bytes correctly", () => {
    // Valid JPEG magic bytes: FF D8 FF
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
    expect(isValidImageMagicBytes(jpegBuffer)).toBe(true)

    // Valid PNG magic bytes: 89 50 4E 47
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a])
    expect(isValidImageMagicBytes(pngBuffer)).toBe(true)

    // Valid WEBP magic bytes: RIFF....WEBP
    const webpBuffer = Buffer.from("RIFF1234WEBPVP8 ")
    expect(isValidImageMagicBytes(webpBuffer)).toBe(true)

    // Fake / malicious script buffer disguised as image
    const scriptBuffer = Buffer.from("<script>alert(1)</script>")
    expect(isValidImageMagicBytes(scriptBuffer)).toBe(false)
  })
})

describe("RBAC & Role-Upgrade Prevention", () => {
  it("non-admin cannot update own role and is rejected by admin guards", async () => {
    const regularUser = {
      id: "regular-user-uuid",
      email: "user@example.com",
    }

    // Email check
    expect(isEmailAdmin(regularUser.email)).toBe(false)

    // Admin guard check
    const check = await requireAdminUser(regularUser)
    expect(check.authorized).toBe(false)
    expect(check.reason).toContain("Forbidden")

    const isAdmin = await checkIsAdmin(regularUser)
    expect(isAdmin).toBe(false)
  })

  it("allows access for verified admin email or database admin role", async () => {
    const originalEnv = process.env.ADMIN_EMAILS
    process.env.ADMIN_EMAILS = "owner@glim.app,admin@example.com"

    try {
      const adminUser = {
        id: "admin-user-uuid",
        email: "owner@glim.app",
      }

      expect(isEmailAdmin(adminUser.email)).toBe(true)
      const check = await requireAdminUser(adminUser)
      expect(check.authorized).toBe(true)
    } finally {
      process.env.ADMIN_EMAILS = originalEnv
    }
  })
})
