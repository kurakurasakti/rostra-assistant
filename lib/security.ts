const INJECTION_PATTERNS = [
  // Bahasa Indonesia
  /lupakan.*instruksi/i,
  /abaikan.*perintah/i,
  /kamu sekarang adalah/i,
  /instruksi baru/i,
  /sebagai (asisten|ai|bot|model) yang/i,
  /peran baru/i,
  /ubah (peran|instruksi|tugas|sistem)/i,
  /mulai (sekarang|saat ini) kamu/i,
  /tidak perlu (ikut|patuhi|taat)/i,
  /ceritakan (sistem|instruksi) (prompt|kamu)/i,
  /bocorkan (prompt|instruksi|sistem)/i,
  /tampilkan (prompt|instruksi|aturan) (kamu|awal|asli|sistem)/i,
  /apa instruksi (kamu|awal|sistem)/i,
  /berpura-pura (menjadi|sebagai)/i,
  /jadilah (hacker|ai tanpa batas|dan)/i,

  // English
  /ignore (previous|all|prior|above|existing)/i,
  /forget (your|all|previous|prior)/i,
  /you are now/i,
  /new (instructions|rules|system prompt)/i,
  /pretend (you are|to be)/i,
  /act as\b/i,
  /disregard/i,
  /override (your|all|previous|prior|system)/i,
  /jailbreak/i,
  /do anything now/i,
  /dan\s*is\s*jailbroken/i,
  /reveal (your|the) (system|instructions|prompt)/i,
  /what (are|were) your instructions/i,
  /repeat (everything|the text|your system|all lines)/i,
  /developer mode/i,
  /system override/i,
  /bypass (filter|safety|rules)/i,

  // Structural / prompt format markers & Delimiters
  /\[SYSTEM\]/i,
  /\[INST\]/i,
  /<\/?system>/i,
  /###\s*instruction/i,
  /^---\s*\n.*system\s*:/im,
  /system\s*prompt\s*:/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /\[\/INST\]/i,
  /```markdown.*!\[.*\]\(http/i, // Markdown image exfiltration
]

export function scanForInjection(message: string): {
  isSuspicious: boolean
  reason?: string
} {
  if (!message || typeof message !== "string") {
    return { isSuspicious: false }
  }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      return { isSuspicious: true, reason: "pattern_match" }
    }
  }

  // Pesan sangat panjang tanpa newline = suspicious (buffer stuffing attempt)
  if (message.length > 500 && !message.includes("\n")) {
    return { isSuspicious: true, reason: "unusual_length" }
  }

  return { isSuspicious: false }
}

export function validateAIOutput(response: string): {
  safe: boolean
  reason?: string
} {
  if (!response || typeof response !== "string") {
    return { safe: false, reason: "empty_output" }
  }

  if (response.length > 600) return { safe: false, reason: "too_long" }

  // Check for unauthorized URLs (only allow wa.me links)
  if (/https?:\/\/(?!wa\.me)/i.test(response)) return { safe: false, reason: "contains_url" }

  // Strip allowed wa.me links before checking for sensitive credit card / account sequences
  const textWithoutWaLinks = response.replace(/https?:\/\/wa\.me\/\d+/gi, "")
  if (/\b\d{16}\b|\b(?:\d{4}[ -]){3}\d{4}\b/.test(textWithoutWaLinks)) {
    return { safe: false, reason: "contains_number_sequence" }
  }

  const jailbreakConfirm = [
    /saya (sekarang|kini) adalah/i,
    /instruksi.*diterima/i,
    /mode .* (aktif|diaktifkan)/i,
    /as an unrestricted ai/i,
    /i have been jailbroken/i,
  ]

  for (const pattern of jailbreakConfirm) {
    if (pattern.test(response)) return { safe: false, reason: "possible_jailbreak" }
  }

  return { safe: true }
}
