const WA_BASE = () => {
  const url = process.env.WA_SERVICE_URL?.replace(/\/$/, "")
  if (!url) throw new Error("WA_SERVICE_URL not set")
  return url
}

export async function sendTextMessage(to: string, message: string, userId: string): Promise<void> {
  const res = await fetch(`${WA_BASE()}/session/${userId}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, message }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`WA service send failed ${res.status}: ${text}`)
  }
}

export async function fetchChatHistory(
  userId: string,
  chatJid: string,
  oldestMsgKey: { remoteJid: string; fromMe: boolean; id: string },
  oldestMsgTimestampMs: number,
  count = 5,
): Promise<{ success: boolean; count?: number }> {
  const res = await fetch(`${WA_BASE()}/session/${userId}/fetch-history`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chatJid,
      oldestMsgKey,
      oldestMsgTimestamp: oldestMsgTimestampMs,
      count,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`WA service fetch-history failed ${res.status}: ${text}`)
  }
  return res.json()
}

export function normalizeWANumber(input: string): string | null {
  if (!input) return null

  let cleaned = input.trim()

  // WhatsApp JID formats from Baileys
  if (cleaned.endsWith("@lid")) {
    const id = cleaned.slice(0, -4)
    return id.length > 0 ? id + "@lid" : null
  }
  if (cleaned.endsWith("@s.whatsapp.net")) {
    cleaned = cleaned.slice(0, -15)
  }

  // Handle scientific notation from Excel (e.g., 6.28E+11, 8.12E+09)
  if (/^\d+\.?\d*[eE][+]?\d+$/.test(cleaned)) {
    try {
      const num = Number(cleaned)
      const rounded = Math.round(num)
      const roundedStr = String(rounded)
      // Detect likely truncation: if result ends in 4+ zeros, Excel dropped trailing digits
      if (/0{4,}$/.test(roundedStr)) {
        console.warn(
          `[normalizeWANumber] Scientific notation "${input}" converted to ` +
            `"${roundedStr}" but appears truncated (Excel precision loss). Returning null.`,
        )
        return null
      }
      cleaned = roundedStr
    } catch {
      return null
    }
  }

  // Strip all non-digit characters
  cleaned = cleaned.replace(/[^\d]/g, "")
  if (!cleaned) return null

  // Handle international dialing prefixes (00 from many countries, 011 from US/Canada)
  if (cleaned.startsWith("0062")) {
    cleaned = cleaned.slice(2) // → 62...
  } else if (cleaned.startsWith("01162")) {
    cleaned = cleaned.slice(3) // → 62...
  } else if (cleaned.startsWith("00") || cleaned.startsWith("011")) {
    // Non-62 international prefix → reject (only handle Indonesian numbers)
    return null
  }

  if (cleaned.startsWith("62")) {
    return cleaned.length >= 10 && cleaned.length <= 15 ? cleaned : null
  }
  if (cleaned.startsWith("0")) {
    const result = "62" + cleaned.slice(1)
    return result.length >= 10 && result.length <= 15 ? result : null
  }
  if (cleaned.startsWith("8")) {
    const result = "62" + cleaned
    return result.length >= 10 && result.length <= 15 ? result : null
  }

  return null
}

export async function getDeviceStatus(
  userId: string,
): Promise<{ connected: boolean; number?: string }> {
  try {
    const res = await fetch(`${WA_BASE()}/session/${userId}/status`)
    if (!res.ok) return { connected: false }
    const data = await res.json()
    return { connected: data.connected === true, number: data.number }
  } catch {
    return { connected: false }
  }
}
