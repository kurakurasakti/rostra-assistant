import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizeWANumber } from '@/lib/whatsapp'
import type { ImportRowInput, ImportResult } from '@/lib/importer'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { rows: ImportRowInput[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { rows } = body
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }

  // Validate + normalize each row
  const valid: (ImportRowInput & { normalizedPhone: string })[] = []
  const errors: ImportResult['errors'] = []

  rows.forEach((row, i) => {
    const rowNum = i + 2 // 1-indexed + skip header row
    if (!row.name?.trim()) {
      errors.push({ row: rowNum, reason: 'Nama kosong' })
      return
    }
    const normalized = normalizeWANumber(row.phone ?? '')
    if (!normalized) {
      errors.push({ row: rowNum, reason: `Nomor WA tidak valid: "${row.phone}"` })
      return
    }
    valid.push({ ...row, name: row.name.trim(), normalizedPhone: normalized })
  })

  if (valid.length === 0) {
    return NextResponse.json<ImportResult>({
      imported: 0,
      skipped: errors.length,
      duplicates: 0,
      errors,
    })
  }

  // Batch check for existing WA numbers (dedup)
  const phones = valid.map(r => r.normalizedPhone)
  const { data: existing } = await supabase
    .from('clients')
    .select('whatsapp_number')
    .eq('user_id', user.id)
    .in('whatsapp_number', phones)

  const existingSet = new Set((existing ?? []).map(e => e.whatsapp_number))
  const toInsert = valid.filter(r => !existingSet.has(r.normalizedPhone))
  const duplicates = valid.length - toInsert.length

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from('clients').insert(
      toInsert.map(r => ({
        user_id: user.id,
        name: r.name,
        whatsapp_number: r.normalizedPhone,
        email: r.email || null,
        notes: r.notes || null,
      }))
    )
    if (insertError) {
      return NextResponse.json(
        { error: `Gagal menyimpan: ${insertError.message}` },
        { status: 500 }
      )
    }
  }

  return NextResponse.json<ImportResult>({
    imported: toInsert.length,
    skipped: errors.length,
    duplicates,
    errors,
  })
}
