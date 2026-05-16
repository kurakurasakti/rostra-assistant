export interface ParsedMessage {
  timestamp: string
  sender: string
  content: string
}

export interface ChatAnalysis {
  senders: string[]
  messagesBySender: Record<string, string[]>
  totalMessages: number
}

// Format 1 (Android/iOS bracketed): [DD/MM/YY, HH:MM:SS] Sender: msg
const MSG_REGEX_BRACKETED = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}[.:]\d{2}(?:[.:]\d{2})?)\]\s+([^:]+):\s+([\s\S]*)/
// Format 2 (Indonesian dash): DD/MM/YY HH.MM - Sender: msg
const MSG_REGEX_DASH = /^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d{1,2}[.:]\d{2})\s+-\s+([^:]+):\s+([\s\S]*)/

const SYSTEM_PATTERNS = [
  /end-to-end encrypted/i,
  /changed their phone number/i,
  /\badded\b/i,
  /\bremoved\b/i,
  /\bleft\b/i,
  /<Media omitted>/i,
  /<image omitted>/i,
  /changed the subject/i,
  /changed the group/i,
  /joined using this group/i,
  /Your security code with/i,
  /Messages to this chat and calls/i,
  /security number changed/i,
  /missed voice call/i,
  /missed video call/i,
]

function isSystemMessage(content: string): boolean {
  const trimmed = content.trim()
  if (!trimmed || trimmed === 'null') return true
  return SYSTEM_PATTERNS.some(p => p.test(trimmed))
}

export function parseWhatsAppExport(text: string): ChatAnalysis {
  const lines = text.split('\n')
  const messages: ParsedMessage[] = []
  let current: ParsedMessage | null = null

  for (const line of lines) {
    const match = MSG_REGEX_BRACKETED.exec(line) ?? MSG_REGEX_DASH.exec(line)
    if (match) {
      if (current) messages.push(current)
      const [, date, time, sender, content] = match
      current = {
        timestamp: `${date} ${time}`,
        sender: sender.trim(),
        content: content.trim(),
      }
    } else if (current && line.trim()) {
      current.content += '\n' + line
    }
  }
  if (current) messages.push(current)

  const filtered = messages.filter(m => !isSystemMessage(m.content))

  const messagesBySender: Record<string, string[]> = {}
  for (const msg of filtered) {
    if (!messagesBySender[msg.sender]) messagesBySender[msg.sender] = []
    messagesBySender[msg.sender].push(msg.content)
  }

  return {
    senders: Object.keys(messagesBySender),
    messagesBySender,
    totalMessages: filtered.length,
  }
}

export function extractBusinessMessages(
  analysis: ChatAnalysis,
  selectedSender: string,
): string[] {
  const messages = analysis.messagesBySender[selectedSender] ?? []
  return messages
    .filter(m => m.trim().split(/\s+/).length >= 5)
    .slice(-150)
}
