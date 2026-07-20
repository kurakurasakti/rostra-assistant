const INJECTION_PATTERNS = [
  // Bahasa Indonesia
  /lupakan.*instruksi/i,
  /abaikan.*perintah/i,
  /kamu sekarang adalah/i,
  /instruksi baru/i,
  /sebagai (asisten|ai|bot) yang/i,
  /peran baru/i,
  /ubah (peran|instruksi|tugas)/i,
  /mulai (sekarang|saat ini) kamu/i,
  /tidak perlu (ikut|patuhi)/i,
  /ceritakan (sistem|instruksi) (prompt|kamu)/i,
  // English
  /ignore (previous|all|prior)/i,
  /forget (your|all|previous)/i,
  /you are now/i,
  /new (instructions|rules|system prompt)/i,
  /pretend (you are|to be)/i,
  /act as\b/i,
  /disregard/i,
  /override (your|all|previous)/i,
  /jailbreak/i,
  /do anything now/i,
  /dan\s*is\s*jailbroken/i,
  /reveal (your|the) (system|instructions|prompt)/i,
  /what (are|were) your instructions/i,
  /repeat (everything|the text|your system)/i,
  // Structural / prompt format markers
  /\[SYSTEM\]/i,
  /\[INST\]/i,
  /<\/?system>/i,
  /###\s*instruction/i,
  /^---\s*\n.*system\s*:/im,
  /system\s*prompt\s*:/i,
  /<\|im_start\|>/i,
  /\[\/INST\]/i,
]

export function scanForInjection(message: string): {
  isSuspicious: boolean
  reason?: string
} {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      return { isSuspicious: true, reason: "pattern_match" }
    }
  }
  // Pesan sangat panjang tanpa newline = suspicious
  if (message.length > 500 && !message.includes("\n")) {
    return { isSuspicious: true, reason: "unusual_length" }
  }
  return { isSuspicious: false }
}

export function validateAIOutput(response: string): {
  safe: boolean
  reason?: string
} {
  if (response.length > 600) return { safe: false, reason: "too_long" }
  if (/\b\d{10,16}\b/.test(response)) return { safe: false, reason: "contains_number_sequence" }
  if (/https?:\/\/(?!wa\.me)/i.test(response)) return { safe: false, reason: "contains_url" }
  const jailbreakConfirm = [
    /saya (sekarang|kini) adalah/i,
    /instruksi (baru|telah) diterima/i,
    /mode .* (aktif|diaktifkan)/i,
  ]
  for (const pattern of jailbreakConfirm) {
    if (pattern.test(response)) return { safe: false, reason: "possible_jailbreak" }
  }
  return { safe: true }
}
