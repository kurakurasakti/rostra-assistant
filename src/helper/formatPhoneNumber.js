export const formatPhoneNumber = (number) => {
  if (!number) return ""

  const clean = number.replace(/\D/g, "")
  if (clean.startsWith("62")) {
    const rest = clean.slice(2)
    const parts = []
    let remaining = rest

    // Format: first 4 digits, then 3, then 4, etc.
    while (remaining.length > 0) {
      if (parts.length === 0 && remaining.length >= 4) {
        parts.push(remaining.slice(0, 4))
        remaining = remaining.slice(4)
      } else if (parts.length === 1 && remaining.length >= 3) {
        parts.push(remaining.slice(0, 3))
        remaining = remaining.slice(3)
      } else {
        const chunkSize = Math.min(4, remaining.length)
        parts.push(remaining.slice(0, chunkSize))
        remaining = remaining.slice(chunkSize)
      }
    }

    return `+62 ${parts.join(" ")}`
  }

  return number
}
