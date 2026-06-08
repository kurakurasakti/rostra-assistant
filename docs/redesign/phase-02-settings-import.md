# Rostra UI Redesign — Phase 2: Settings + Import

**Status:** Planned (after Phase 1)
**Dependencies:** Phase 1 (design system tokens in place)
**Why here:** Settings + Import paling krusial — settings dipake tiap hari, import masih placeholder.

## What to do

### 1. Settings (`app/(dashboard)/settings/page.tsx`)

Current: monolithic 902 lines. Split into sub-pages with tab navigation.
- **Sub-pages:**
  - `/settings/profile` — Profil Bisnis + Brand Voice Analyzer
  - `/settings/whatsapp` — Koneksi WhatsApp QR flow
  - `/settings/business` — Business Knowledge (726-line multi-step wizard)
  - `/settings/ai` — Aturan AI & Eskalasi + Auto-Reply Levels
- Tab navigation with purple active indicator
- Each sub-page: consistent card layout (Phase 1 tokens)
- BusinessKnowledgeSection: simplify wizard flow visually

### 2. Import (`app/(dashboard)/import/page.tsx`)

Current: 8-line placeholder "Coming soon".
- Build Excel/CSV import wizard:
  - Step 1: Upload file (drag & drop zone, purple dashed border)
  - Step 2: Map columns to fields
  - Step 3: Preview parsed data
  - Step 4: Confirm & import
- Progress stepper with gold active step
- Error states for invalid files
- Success state with summary

### 3. Shared
- Apply Phase 1 tokens throughout
- Button press feedback on all actions
- Loading/empty/error states

## Token Limit Recovery

Read: `app/(dashboard)/settings/page.tsx`, `app/(dashboard)/import/page.tsx`
Settings sub-pages: `app/(dashboard)/settings/settings-profile.tsx`, etc.
