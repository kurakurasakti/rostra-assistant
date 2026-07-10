# Settings Page Redesign — Inline-Edit Cards, Tone Presets, Top Banner

**Date:** 2026-07-10
**Branch:** feat/landing-page
**Goal:** Polish `app/(dashboard)/settings/page.tsx` by combining three Mobbin-researched patterns — Ghost's inline-edit cards, Gorgias's selectable tone-preset cards, and Intercom's thin top banner — without touching the underlying data model, save logic, or the 5 sub-components that already work (`WhatsAppSection`, `BusinessKnowledgeSection`, `AIRulesSection`, `TemplatesSection`, `ImportDataSection`).

## Background

The current settings page (`app/(dashboard)/settings/page.tsx`) is a single-scroll page with 6 stacked card sections (Profil Bisnis, WhatsApp, Business Knowledge, AI & Eskalasi, Impor Data, Zona Berbahaya) and a sticky right-side "Di halaman ini" anchor nav (`SettingsAnchorNav`). Two problems targeted by this redesign:

1. Settled facts (business name once set, WhatsApp once connected) are shown as always-open forms — no visual distinction between "needs attention" and "already configured."
2. Brand voice input is a single freeform textarea with no quick-start options — every new user starts from a blank box or must use the "Analisa dari Chat WA" flow.
3. Onboarding status uses two separate boxed alerts (amber incomplete / green complete) that duplicate information the redesigned WhatsApp card will already convey.

Mobbin references: Ghost Settings (inline-edit card with Edit link), Gorgias AI Agent Settings (tone-of-voice picker as 4 selectable cards), Intercom Fin AI Agent (thin top banner with trial/setup CTA).

## Design

### 1. `components/settings/InlineEditCard.tsx` (new)

Generic collapse/expand wrapper for "settled fact" fields.

```tsx
interface InlineEditCardProps {
  title: string
  subtitle?: string
  summary: ReactNode          // shown when collapsed
  defaultExpanded: boolean
  onCollapseRequest?: number   // bump this number to force-collapse after save (e.g. Date.now())
  children: ReactNode          // the real form/content, rendered only when expanded
}
```

- Collapsed view: `title` + `subtitle` (small gray text) on the left, `summary` + an "Edit" button on the right, single row, card border matching existing `rounded-xl border border-border bg-card p-5`.
- Expanded view: `title` + `subtitle` header, then `children` below. No explicit "collapse" button — the parent triggers re-collapse by changing `onCollapseRequest` (a changing number, e.g. timestamp) after a successful save, which the component watches via `useEffect` to reset `expanded` to `false`.
- Internal state: `const [expanded, setExpanded] = useState(defaultExpanded)`.

**Usage — Nama Bisnis** (inside existing Profil Bisnis `<form>`):
- `defaultExpanded={!businessName}` (collapsed if a name is already saved)
- `summary={businessName || 'Belum diisi'}`
- Children: the existing `<Input id="businessName" .../>` moved inside — no separate save action, still submits via the form's existing "Simpan Profil" button at the bottom. Pass `onCollapseRequest={lastSavedAt}` where `lastSavedAt` is a timestamp state set inside `handleSaveProfile` on success.

**Usage — WhatsApp**:
- `defaultExpanded={!profile?.onboarding_complete}`
- `summary={profile?.onboarding_complete ? 'Terhubung ✓' : 'Belum terhubung'}`
- Children: `<WhatsAppSection .../>` unchanged, mounted only when expanded (lazy-mount avoids the component's internal `/api/whatsapp/status` fetch firing until the user opens it).
- No `onCollapseRequest` — WhatsAppSection manages its own internal state; user manually re-collapses by navigating away or the card simply stays expanded until page reload. (No auto-collapse needed here since there's no single "save" moment — connecting is multi-step with QR scanning.)

### 2. `components/settings/TonePresetPicker.tsx` (new)

Replaces the always-visible textarea-first UI in the "Gaya Komunikasi AI" subsection with a 4-card picker.

```tsx
interface TonePresetPickerProps {
  value: string              // current brandVoice
  onSelect: (template: string) => void   // called when a fixed preset is clicked
  customSlot: ReactNode       // rendered only when "Custom" is the active card — the existing textarea + Analisa dari Chat WA block
}
```

Presets (exported as a const array, so the "which card is selected" check can compare against them):

```tsx
const TONE_PRESETS = [
  {
    id: 'ramah',
    label: 'Ramah',
    description: 'Sapaan hangat, santai, pakai emoji',
    icon: Smile, // lucide-react
    template: "Ramah, hangat, dan santai. Sapa pelanggan dengan 'Kak'. Boleh pakai emoji secukupnya 😊. Jawaban singkat dan jelas.",
  },
  {
    id: 'profesional',
    label: 'Profesional',
    description: 'Formal, sopan, tanpa emoji',
    icon: Briefcase,
    template: 'Profesional dan sopan. Gunakan bahasa baku, hindari singkatan dan emoji. Jawaban to the point dan informatif.',
  },
  {
    id: 'santai',
    label: 'Santai',
    description: 'Kasual seperti chat teman',
    icon: Coffee,
    template: 'Santai dan akrab, seperti mengobrol dengan teman dekat. Boleh pakai bahasa gaul ringan dan emoji. Tetap jelas dan membantu.',
  },
] as const
```

Selection logic: a preset card is visually "selected" (highlighted border) if `value === preset.template`. The **Custom** card (always rendered 4th, not in the array above since it has no template) is selected whenever `value` doesn't exactly match any preset template — this covers empty string, manually-typed text, and AI-analyzed brand voice from the "Analisa dari Chat WA" flow.

Clicking a fixed preset card calls `onSelect(preset.template)`, which the parent wires to `setBrandVoice(template)`. Clicking Custom does nothing itself (it's already "selected" by not matching) — it just controls whether `customSlot` renders below the card grid.

Layout: `grid grid-cols-2 gap-2` (2x2 on desktop, matches existing `max-w-[640px]` column width), each card `rounded-lg border p-3` with selected state `border-primary bg-primary/5`.

### 3. Top banner replacing both alert boxes

Remove the two existing blocks in `page.tsx`:
```tsx
{profile && !profile.onboarding_complete && (...)}
{profile?.onboarding_complete && (...)}
```

Replace with a single conditional banner rendered **above** the `<h1>Pengaturan</h1>` header, sticky to the top of the scroll container:

```tsx
{profile && !profile.onboarding_complete && (
  <div className="sticky top-0 z-10 -mx-6 lg:-mx-8 mb-2 flex items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-6 lg:px-8 py-2.5">
    <p className="text-sm text-amber-700 dark:text-amber-400">
      <span className="font-medium">Lengkapi koneksi WhatsApp</span> untuk mulai pakai Glim.
    </p>
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-7 text-xs shrink-0 border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
      onClick={() => document.getElementById('whatsapp')?.scrollIntoView({ behavior: 'smooth' })}
    >
      Selesaikan Setup →
    </Button>
  </div>
)}
```

When `profile.onboarding_complete` is true, nothing renders — the collapsed WhatsApp `InlineEditCard` summary ("Terhubung ✓") already communicates connected status, so the old green success box is redundant and removed outright.

## Out of scope

- No changes to `WhatsAppSection`, `BusinessKnowledgeSection`, `AIRulesSection`, `TemplatesSection`, `ImportDataSection` internals.
- No new API routes — `handleSaveProfile` still does one PATCH with `business_name` + `brand_voice` + `escalation_keywords`.
- No billing/paywall feature (confirmed out of scope — Glim has no payment tiers, `auto_reply_level` unlocks via `feedback_count` threshold, not payment).
- No e2e test added (none exist for settings page today).

## Testing

- `pnpm build` passes
- Manual, fresh account (onboarding incomplete): banner visible, CTA scrolls to `#whatsapp`, WhatsApp card default-expanded, Nama Bisnis card default-expanded (empty)
- Manual, existing connected account: banner hidden, WhatsApp card collapsed showing "Terhubung ✓", Nama Bisnis card collapsed showing saved name with Edit button
- Manual: click each tone preset card → textarea preview updates (visible once Custom selected) → selected card highlights correctly; switching between an AI-analyzed brand voice and back to a preset doesn't lose the analyzed text until a preset is explicitly clicked
- Manual: Simpan Profil still saves correctly, `lastSavedAt` bump collapses Nama Bisnis card back after save
