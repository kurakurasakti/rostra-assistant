import type { BusinessKnowledgeStructured, CompletenessResult } from '@/types'

export function calculateCompleteness(
  structured: BusinessKnowledgeStructured,
): CompletenessResult {
  const checks: { field: string; label: string; pass: boolean }[] = [
    {
      field: 'services',
      label: 'Produk atau layanan',
      pass: structured.services?.length > 0,
    },
    {
      field: 'operating_hours',
      label: 'Jam operasional',
      pass: !!structured.operating_hours,
    },
    {
      field: 'payment_methods',
      label: 'Metode pembayaran',
      pass: structured.payment_methods?.length > 0,
    },
    {
      field: 'po_status',
      label: 'Status open/close PO',
      pass: structured.po_status !== undefined && structured.po_status !== null,
    },
  ]

  const passed = checks.filter((c) => c.pass).length
  const score = passed / checks.length
  const missing = checks.filter((c) => !c.pass).map((c) => c.label)

  return {
    score,
    missing,
    isComplete: score >= 0.75,
  }
}

export function formatBusinessContextForAI(
  raw: string,
  structured: BusinessKnowledgeStructured,
): string {
  const servicesList =
    structured.services
      ?.map(
        (s) =>
          `- ${s.name}: ${s.price_range}${s.description ? ` (${s.description})` : ''}`,
      )
      .join('\n') ?? '-'

  return `
=== PENGETAHUAN BISNIS ===
${raw}

=== RINGKASAN TERSTRUKTUR ===
Produk/Layanan:
${servicesList}

Jam operasional: ${structured.operating_hours ?? 'tidak disebutkan'}
Lokasi: ${structured.location ?? 'tidak disebutkan'}
Pembayaran: ${structured.payment_methods?.join(', ') ?? 'tidak disebutkan'}
Status PO: ${structured.po_status ? `Buka${structured.po_close_date ? ` sampai ${structured.po_close_date}` : ''}` : 'Tutup'}
${structured.special_notes ? `Catatan: ${structured.special_notes}` : ''}
`.trim()
}
