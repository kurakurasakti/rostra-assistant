/**
 * Payment proof upload validation & path sanitization utilities
 */

export const ALLOWED_PROOF_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

export type AllowedProofMime = (typeof ALLOWED_PROOF_MIMES)[number]

export const MAX_PROOF_SIZE_BYTES = 3 * 1024 * 1024 // 3MB

/**
 * Validate MIME type and file size against security constraints
 */
export function validateProofFile(
  mimeType?: string | null,
  sizeBytes?: number | null,
): { valid: boolean; error?: string } {
  if (!mimeType) {
    return { valid: false, error: "Tipe file tidak terdeteksi." }
  }

  const normalizedMime = mimeType.trim().toLowerCase()
  if (!ALLOWED_PROOF_MIMES.includes(normalizedMime as AllowedProofMime)) {
    return {
      valid: false,
      error: "Format bukti transfer tidak valid. Hanya format JPG, PNG, atau WEBP yang diperbolehkan.",
    }
  }

  if (sizeBytes != null) {
    if (sizeBytes <= 0) {
      return { valid: false, error: "File bukti transfer kosong." }
    }
    if (sizeBytes > MAX_PROOF_SIZE_BYTES) {
      return {
        valid: false,
        error: `Ukuran file bukti transfer melebihi batas maksimal 3MB (${(sizeBytes / (1024 * 1024)).toFixed(1)}MB).`,
      }
    }
  }

  return { valid: true }
}

/**
 * Sanitize a string segment to prevent path traversal attacks (e.g. '../', '..\\', null bytes)
 */
export function sanitizePathSegment(segment: string): string {
  if (!segment) return ""
  // Remove path traversal, slashes, backslashes, null bytes, and non-alphanumeric chars (except - and _)
  return segment
    .replace(/\0/g, "")
    .replace(/\\/g, "")
    .replace(/\//g, "")
    .replace(/\.\./g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .trim()
}

/**
 * Build a sanitized private storage path for payment proof: {userId}/{paymentId}.{ext}
 */
export function buildProofStoragePath(
  userId: string,
  paymentId: string,
  mimeType: string = "image/jpeg",
): string {
  const safeUserId = sanitizePathSegment(userId)
  const safePaymentId = sanitizePathSegment(paymentId)

  if (!safeUserId || !safePaymentId) {
    throw new Error("Invalid userId or paymentId for storage path")
  }

  let ext = "jpg"
  const normMime = mimeType.trim().toLowerCase()
  if (normMime === "image/png") {
    ext = "png"
  } else if (normMime === "image/webp") {
    ext = "webp"
  }

  return `${safeUserId}/${safePaymentId}.${ext}`
}

/**
 * Validate image buffer magic numbers for defense in depth
 */
export function isValidImageMagicBytes(buffer: Uint8Array | Buffer): boolean {
  if (!buffer || buffer.length < 4) return false

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true
  }

  // PNG: 89 50 4E 47
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return true
  }

  // WEBP: RIFF .... WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50 // P
  ) {
    return true
  }

  return false
}
