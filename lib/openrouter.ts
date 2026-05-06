import type { MessageClassification } from '@/types'

const BASE = 'https://openrouter.ai/api/v1'
const DEFAULT_MODEL = 'google/gemini-flash-1.5'

export async function callAI(
  system: string,
  user: string,
  maxTokens: number = 500,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set')

  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://rostra.app',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: maxTokens,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenRouter ${res.status}: ${text}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

export async function analyzeBrandVoice(messages: string[]): Promise<string> {
  const sample = messages.slice(-100).join('\n')

  const system = `
Kamu adalah analis gaya komunikasi bisnis Indonesia.
Tugasmu: analisa pesan WhatsApp dari admin sebuah bisnis kecil,
lalu buat deskripsi gaya komunikasi yang SPESIFIK dan ACTIONABLE.

Output harus berupa paragraf singkat (3-5 kalimat) yang mendeskripsikan:
1. Sapaan yang biasa digunakan (Kak, Kak [nama], dll)
2. Emoji yang sering dipakai
3. Panjang pesan (singkat/panjang)
4. Frasa atau kata khas yang sering muncul
5. Cara merespons pertanyaan harga / ketersediaan
6. Tingkat formalitas

JANGAN gunakan bullet points. Tulis dalam bentuk paragraf natural.
Output langsung digunakan sebagai system prompt untuk AI reply —
jadi tulis seolah kamu menginstruksikan AI untuk meniru gaya ini.
`

  const user = `
Berikut contoh pesan WhatsApp dari admin bisnis ini:

${sample}

Analisa dan deskripsikan gaya komunikasi mereka.
`

  return callAI(system, user, 300)
}

export async function classifyMessage(message: string): Promise<MessageClassification> {
  const system = `Kamu mengklasifikasikan pesan pelanggan bisnis Indonesia.
Klasifikasikan sebagai:
- "rutin": pertanyaan harga, ketersediaan, jadwal, status pesanan, konfirmasi
- "sensitif": keluhan, konflik, permintaan refund, ancaman, ketidakpuasan besar
- "tidak_diketahui": sapaan singkat, tidak jelas, atau tidak relevan

Balas HANYA dengan satu kata: rutin, sensitif, atau tidak_diketahui`

  const result = await callAI(system, `Pesan: ${message}`, 20)
  const clean = result.trim().toLowerCase().replace(/[^a-z_]/g, '')
  if (clean === 'rutin' || clean === 'sensitif') return clean
  return 'tidak_diketahui'
}

export async function draftReply(
  message: string,
  brandVoice: string,
  history?: Array<{ direction: string; message_body: string }>,
): Promise<string> {
  const system = brandVoice?.trim()
    ? brandVoice
    : 'Kamu adalah asisten admin toko online Indonesia. Balas pesan pelanggan dengan sopan, ramah, dan singkat.'

  let userPrompt = message
  if (history && history.length > 1) {
    const historyText = history
      .slice(-8)
      .map(m => `${m.direction === 'masuk' ? 'Pelanggan' : 'Admin'}: ${m.message_body}`)
      .join('\n')
    userPrompt = `Riwayat percakapan:\n${historyText}\n\nDraft balasan untuk pesan terakhir pelanggan:`
  }

  return callAI(system, userPrompt, 300)
}
