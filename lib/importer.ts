export type ImportField = "name" | "phone" | "email" | "notes"

export type ColMapping = Record<ImportField, string>

export interface ImportRowInput {
  name: string
  phone: string
  email?: string
  notes?: string
}

export interface ImportResult {
  imported: number
  skipped: number
  duplicates: number
  errors: { row: number; reason: string }[]
}

const FIELD_PATTERNS: Record<ImportField, string[]> = {
  name: ["nama", "name", "nama klien", "client", "pelanggan", "customer", "nama lengkap"],
  phone: [
    "wa",
    "whatsapp",
    "hp",
    "handphone",
    "phone",
    "telepon",
    "telp",
    "no wa",
    "no hp",
    "nomor",
    "number",
    "no. wa",
    "no. hp",
    "nomer",
    "kontak",
    "contact",
  ],
  email: ["email", "e-mail", "mail", "surel"],
  notes: ["catatan", "notes", "note", "keterangan", "info", "remarks", "deskripsi"],
}

export function suggestMapping(headers: string[]): Partial<ColMapping> {
  const result: Partial<ColMapping> = {}
  for (const header of headers) {
    const lower = header.toLowerCase().trim()
    for (const [field, patterns] of Object.entries(FIELD_PATTERNS) as [ImportField, string[]][]) {
      if (!result[field] && patterns.some((p) => lower.includes(p))) {
        result[field] = header
      }
    }
  }
  return result
}

export function extractMappedRows(
  rawRows: Record<string, string>[],
  mapping: ColMapping,
): ImportRowInput[] {
  return rawRows.map((row) => ({
    name: (row[mapping.name] ?? "").trim(),
    phone: (row[mapping.phone] ?? "").trim(),
    email: mapping.email ? (row[mapping.email] ?? "").trim() || undefined : undefined,
    notes: mapping.notes ? (row[mapping.notes] ?? "").trim() || undefined : undefined,
  }))
}
