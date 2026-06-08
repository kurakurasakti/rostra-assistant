# Rostra UI Redesign — Phase 3: Dashboard + Inbox

**Status:** Planned (after Phase 2)
**Dependencies:** Phase 1 (design system tokens in place)

## What to do

### 1. Dashboard (`app/(dashboard)/page.tsx`)

Current: placeholder with hardcoded zero stats.
- Replace with real data queries from Supabase
- Stat cards: Total Klien, Pesanan Aktif, Menunggu Bayar, Pesan Masuk
- Add mini trend indicators (up/down arrows)
- "Mulai dengan Rostra" guide section — restyle with purple/gold
- "Perlu Perhatian" — show actual pending items
- Skeleton loading states

### 2. Inbox (`app/(dashboard)/inbox/page.tsx`)

Current: functional but visually plain two-column layout.
- Left panel: conversation list with purple active state
- Right panel: message thread with polished bubble styling
- AI draft panel: better visual hierarchy
- Micro-interactions:
  - Conversation hover: subtle bg change
  - Active item: purple left border
  - Send button: purple/gold hover

### 3. Shared
- Loading skeletons
- Empty states with illustrations
- Button press feedback

## Token Limit Recovery

Read: `app/(dashboard)/page.tsx`, `app/(dashboard)/inbox/page.tsx`, `lib/supabase.ts`
