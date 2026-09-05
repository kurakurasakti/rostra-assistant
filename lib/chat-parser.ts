import type { ConversationExample, QACategory } from "@/types"

export interface ParsedMessage {
  timestamp: string
  sender: string
  content: string
}

export interface ChatAnalysis {
  senders: string[]
  messagesBySender: Record<string, string[]>
  messages: ParsedMessage[]
  totalMessages: number
}

// Format 1 (Android/iOS bracketed): [DD/MM/YY, HH:MM:SS] Sender: msg
const MSG_REGEX_BRACKETED =
  /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}[.:]\d{2}(?:[.:]\d{2})?(?:\s+[aApP][mM])?)\]\s+([^:]+):\s+([\s\S]*)/
// Format 2 (Indonesian / International dash): DD/MM/YY, HH.MM - Sender: msg
const MSG_REGEX_DASH =
  /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}[.:]\d{2}(?:[.:]\d{2})?(?:\s+[aApP][mM])?)\s+-\s+([^:]+):\s+([\s\S]*)/

const SYSTEM_PATTERNS = [
  /end-to-end encrypted/i,
  /pesan dan panggilan terenkripsi/i,
  /changed their phone number/i,
  /\badded\b/i,
  /\bremoved\b/i,
  /\bleft\b/i,
  /<Media omitted>/i,
  /<Media tidak disertakan>/i,
  /<image omitted>/i,
  /<gambar tidak disertakan>/i,
  /changed the subject/i,
  /changed the group/i,
  /joined using this group/i,
  /Your security code with/i,
  /Messages to this chat and calls/i,
  /security number changed/i,
  /missed voice call/i,
  /missed video call/i,
  /panggilan tak terjawab/i,
]

function isSystemMessage(content: string): boolean {
  const trimmed = content.trim()
  if (!trimmed || trimmed === "null") return true
  return SYSTEM_PATTERNS.some((p) => p.test(trimmed))
}

export function parseWhatsAppExport(text: string): ChatAnalysis {
  const lines = text.split("\n")
  const messages: ParsedMessage[] = []
  let current: ParsedMessage | null = null

  for (const rawLine of lines) {
    // Strip invisible Unicode formatting characters (iOS LTR \u200e, RTL \u200f, BOM \ufeff)
    const line = rawLine.replace(/[\u200e\u200f\u202a-\u202e\ufeff]/g, "").trim()
    const match = MSG_REGEX_BRACKETED.exec(line) ?? MSG_REGEX_DASH.exec(line)
    if (match) {
      if (current) messages.push(current)
      const [, date, time, sender, content] = match
      current = {
        timestamp: `${date} ${time}`,
        sender: sender.trim(),
        content: content.trim(),
      }
    } else if (current && line) {
      current.content += "\n" + line
    }
  }
  if (current) messages.push(current)

  const filtered = messages.filter((m) => !isSystemMessage(m.content))

  const messagesBySender: Record<string, string[]> = {}
  for (const msg of filtered) {
    if (!messagesBySender[msg.sender]) messagesBySender[msg.sender] = []
    messagesBySender[msg.sender].push(msg.content)
  }

  return {
    senders: Object.keys(messagesBySender),
    messagesBySender,
    messages: filtered,
    totalMessages: filtered.length,
  }
}

// Returns last N messages as conversation pairs with role labels
export function extractConversationContext(
  analysis: ChatAnalysis,
  selectedSender: string,
  limit: number = 80,
): string {
  return analysis.messages
    .slice(-limit)
    .map((m) => {
      const role = m.sender === selectedSender ? "Admin" : "Pelanggan"
      return `${role}: ${m.content}`
    })
    .join("\n")
}

// ── FEW-SHOT QA EXTRACTION ────────────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<QACategory, string[]> = {
  harga: ["harga", "budget", "biaya", "cost", "mahal", "murah", "tarif"],
  ketersediaan: ["bisa", "masih ada", "tersedia", "ready", "stok", "ada"],
  jadwal: ["kapan", "jadwal", "fitting", "ambil", "tanggal", "waktu", "jam", "hari"],
  status: ["sudah", "progress", "gimana", "selesai", "jadi", "sampai mana", "update"],
  pembayaran: ["bayar", "transfer", "dp", "lunas", "kwitansi", "bukti", "pembayaran", "tagihan"],
  umum: [],
}

const TRIVIAL_ADMIN_REPLIES = [
  "ok",
  "oke",
  "siap",
  "noted",
  "iya",
  "ya",
  "baik",
  "done",
  "ok kak",
  "oke kak",
  "siap kak",
]

const SENSITIVE_PATTERNS = [
  /\b\d{10,16}\b/, // bank account / long numbers
  /\botp\b/i,
  /\bkode verifikasi\b/i,
  /\bkode rahasia\b/i,
  /\bpassword\b/i,
  /\bkata sandi\b/i,
  /\bpin\b/i,
]

function hasSensitiveContent(text: string): boolean {
  return SENSITIVE_PATTERNS.some((p) => p.test(text))
}

function parseTimestamp(ts: string): number {
  // Supports "DD/MM/YY HH:MM" and "DD/MM/YYYY HH.MM"
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2})[.:](\d{2})/.exec(ts)
  if (!m) return 0
  const year = m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3])
  return new Date(
    year,
    parseInt(m[2]) - 1,
    parseInt(m[1]),
    parseInt(m[4]),
    parseInt(m[5]),
  ).getTime()
}

export interface RawQAPair {
  customer: string
  admin: string
  customerTimestamp: string
  adminTimestamp: string
}

export function extractQAPairs(messages: ParsedMessage[], adminSender: string): RawQAPair[] {
  const pairs: RawQAPair[] = []
  const WINDOW_MS = 30 * 60 * 1000 // 30 minutes

  for (let i = 0; i < messages.length - 1; i++) {
    const curr = messages[i]
    if (curr.sender === adminSender) continue

    // Look ahead for admin reply within 30 min window
    for (let j = i + 1; j < messages.length; j++) {
      const next = messages[j]
      const currTs = parseTimestamp(curr.timestamp)
      const nextTs = parseTimestamp(next.timestamp)

      if (nextTs - currTs > WINDOW_MS) break
      if (next.sender !== adminSender) continue

      const customerMsg = curr.content.trim()
      const adminReply = next.content.trim()

      // Filter: too short (< 3 chars for customer, < 8 chars for admin) or too long
      if (customerMsg.length < 3) break
      if (adminReply.length < 8 || adminReply.length > 500) break

      // Filter: trivial admin replies
      if (TRIVIAL_ADMIN_REPLIES.some((t) => adminReply.toLowerCase() === t)) break

      // Filter: sensitive content
      if (hasSensitiveContent(customerMsg) || hasSensitiveContent(adminReply)) break

      pairs.push({
        customer: customerMsg,
        admin: adminReply,
        customerTimestamp: curr.timestamp,
        adminTimestamp: next.timestamp,
      })
      break
    }
  }

  return pairs
}

export function categorizeQAPair(customerMsg: string, adminReply: string): QACategory {
  const text = (customerMsg + " " + adminReply).toLowerCase()
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as [QACategory, string[]][]) {
    if (cat === "umum") continue
    if (keywords.some((kw) => text.includes(kw))) return cat
  }
  return "umum"
}

const CATEGORY_QUOTA: Record<QACategory, number> = {
  harga: 3,
  jadwal: 3,
  ketersediaan: 2,
  status: 2,
  pembayaran: 2,
  umum: 2,
}

export function selectBestExamples(pairs: RawQAPair[]): ConversationExample[] {
  const byCategory: Record<QACategory, RawQAPair[]> = {
    harga: [],
    ketersediaan: [],
    jadwal: [],
    status: [],
    pembayaran: [],
    umum: [],
  }

  for (const pair of pairs) {
    const cat = categorizeQAPair(pair.customer, pair.admin)
    byCategory[cat].push(pair)
  }

  const now = new Date().toISOString()
  const selected: ConversationExample[] = []

  for (const [cat, quota] of Object.entries(CATEGORY_QUOTA) as [QACategory, number][]) {
    const candidates = byCategory[cat]
    if (!candidates.length) continue

    // Score: prefer replies with emoji and length 30-200 chars
    const scored = candidates
      .map((p) => {
        const len = p.admin.length
        const hasEmoji = /\p{Emoji}/u.test(p.admin)
        const lengthScore = len >= 30 && len <= 200 ? 2 : 1
        return { pair: p, score: (hasEmoji ? 2 : 0) + lengthScore }
      })
      .sort((a, b) => b.score - a.score)

    const pick = scored.slice(0, quota)
    for (const { pair } of pick) {
      selected.push({
        category: cat,
        customer: pair.customer,
        admin: pair.admin,
        source: "upload",
        used_count: 0,
        created_at: now,
      })
    }
  }

  return selected
}

export function extractBusinessMessages(analysis: ChatAnalysis, selectedSender: string): string[] {
  const messages = analysis.messagesBySender[selectedSender] ?? []
  return messages.filter((m) => m.trim().split(/\s+/).length >= 3).slice(-150)
}
