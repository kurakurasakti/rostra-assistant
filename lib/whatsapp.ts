const WA_BASE = () => {
  const url = process.env.WA_SERVICE_URL
  if (!url) throw new Error('WA_SERVICE_URL not set')
  return url
}

export async function sendTextMessage(
  to: string,
  message: string,
  userId: string,
): Promise<void> {
  const res = await fetch(`${WA_BASE()}/session/${userId}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, message }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`WA service send failed ${res.status}: ${text}`)
  }
}

export function normalizeWANumber(input: string): string | null {
  if (!input) return null

  let cleaned = input.trim()

  // Handle scientific notation from Excel (e.g. 6.28E+11)
  if (/^\d+\.?\d*[eE][+]?\d+$/.test(cleaned)) {
    try {
      cleaned = String(Math.round(Number(cleaned)))
    } catch {
      return null
    }
  }

  cleaned = cleaned.replace(/[^\d]/g, '')
  if (!cleaned) return null

  if (cleaned.startsWith('62')) {
    return cleaned.length >= 10 ? cleaned : null
  }
  if (cleaned.startsWith('0')) {
    const result = '62' + cleaned.slice(1)
    return result.length >= 10 ? result : null
  }
  if (cleaned.startsWith('8')) {
    const result = '62' + cleaned
    return result.length >= 10 ? result : null
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
