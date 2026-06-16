import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { normalizeWANumber } from '@/lib/whatsapp'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const WA_SERVICE_URL = process.env.WA_SERVICE_URL?.replace(/\/$/, '')
  if (!WA_SERVICE_URL) {
    return NextResponse.json({ error: 'WA service URL not configured' }, { status: 500 })
  }

  try {
    // 1. Fetch contacts from rostra-wa
    const res = await fetch(`${WA_SERVICE_URL}/session/${user.id}/contacts`)
    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ success: true, count: 0, message: 'No active session' })
      }
      const errText = await res.text()
      return NextResponse.json({ error: `WA service returned ${res.status}: ${errText}` }, { status: 500 })
    }

    const data = await res.json()
    const rawContacts: { jid: string; name: string }[] = Array.isArray(data?.contacts)
      ? data.contacts
      : []

    if (rawContacts.length === 0) {
      return NextResponse.json({ success: true, count: 0 })
    }

    // 2. Normalize and filter
    const validContacts = rawContacts
      .map(c => {
        const jidVal = c.jid || (c as any).id || (c as any).phoneNumber || (c as any).lid
        const nameVal = c.name || (c as any).notify
        const normalized = normalizeWANumber(jidVal ?? '')
        const name = String(nameVal ?? '').trim()
        
        // Ignore names that look like number/jid
        const isInvalidName = !name || name.includes('@') || /^\+?\d+$/.test(name)
        
        if (!normalized || isInvalidName) return null
        return { whatsapp_number: normalized, name }
      })
      .filter(Boolean) as { whatsapp_number: string; name: string }[]

    if (validContacts.length === 0) {
      return NextResponse.json({ success: true, count: 0 })
    }

    // Deduplicate
    const uniqueContactsMap = new Map<string, string>()
    for (const c of validContacts) {
      uniqueContactsMap.set(c.whatsapp_number, c.name)
    }

    const uniqueNumbers = Array.from(uniqueContactsMap.keys())

    // 3. Fetch existing clients
    const { data: existingClients } = await supabase
      .from('clients')
      .select('id, whatsapp_number, name')
      .eq('user_id', user.id)
      .in('whatsapp_number', uniqueNumbers)

    const existingNumbers = new Set<string>()
    const existingClientsToUpdate: { id: string; name: string }[] = []

    if (existingClients) {
      for (const client of existingClients) {
        existingNumbers.add(client.whatsapp_number)
        const newName = uniqueContactsMap.get(client.whatsapp_number)
        if (newName && client.name !== newName) {
          existingClientsToUpdate.push({ id: client.id, name: newName })
        }
      }
    }

    // 4. Update changed client names
    if (existingClientsToUpdate.length > 0) {
      for (const update of existingClientsToUpdate) {
        await supabase
          .from('clients')
          .update({ name: update.name })
          .eq('id', update.id)
      }
    }

    // 5. Update inbox messages sender names and link to existing clients (do not auto-create new clients)
    const { data: allClients } = await supabase
      .from('clients')
      .select('id, whatsapp_number, name')
      .eq('user_id', user.id)
      .in('whatsapp_number', uniqueNumbers)

    const clientMap = new Map<string, { id: string; name: string }>()
    if (allClients) {
      for (const client of allClients) {
        clientMap.set(client.whatsapp_number, client)
      }
    }

    for (const [number, name] of uniqueContactsMap.entries()) {
      const client = clientMap.get(number)
      await supabase
        .from('inbox_messages')
        .update({
          sender_name: client ? client.name : name,
          client_id: client ? client.id : null
        })
        .eq('user_id', user.id)
        .eq('whatsapp_number', number)
    }

    return NextResponse.json({ success: true, count: uniqueNumbers.length })
  } catch (err: any) {
    console.error('[sync-contacts] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
