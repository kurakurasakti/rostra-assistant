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
- `defaultExpanded={!profile?.wa_connected}` — **uses `wa_connected`, not `onboarding_complete`**. Verified via grep across every write path (`/api/whatsapp/connected`, `/api/whatsapp/disconnect`, `/api/whatsapp/status`, `/api/whatsapp/disconnected`): `onboarding_complete` is only reset to `false` in the manual `/api/whatsapp/disconnect` route. Both the poll-detected disconnect (`/api/whatsapp/status`) and the external webhook (`/api/whatsapp/disconnected`) reset `wa_connected` to `false` but leave `onboarding_complete: true`. Keying the card on `onboarding_complete` would show a stale "Terhubung ✓" after a phone-side logout or session expiry. `wa_connected` is the field kept correctly in sync across all four paths.
- `summary={profile?.wa_connected ? 'Terhubung ✓' : 'Belum terhubung'}`
- Children: `<WhatsAppSection onConnected={...} .../>` unchanged otherwise, mounted only when expanded (lazy-mount avoids the component's internal `/api/whatsapp/status` fetch firing until the user opens it).
- `onConnected` (new): `WhatsAppSection` gets one new optional prop `onConnected?: () => void`, called once inside `startPolling`'s interval at the exact point `data.connected` becomes true (`components/settings/WhatsAppSection.tsx`, right where `setWaStep("connected")` currently fires — one line added, nothing else in that file changes). The parent wires this to bump the same `lastSavedAt`-style timestamp state that `InlineEditCard` watches, so the card auto-collapses immediately on successful connect instead of requiring a page reload.

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

Selection state is **local UI state, not purely derived from `value`** — this is a fix from the original draft, which derived selection 100% from `value === preset.template` and made Custom a dead end: once a fixed preset was clicked, there was no click target left to get back to the textarea, since Custom's handler never called `onSelect` and nothing else could change `activeCardId` away from a matched preset.

```tsx
const deriveFromValue = (v: string) =>
  TONE_PRESETS.find((p) => p.template === v)?.id ?? 'custom'

const [activeCardId, setActiveCardId] = useState(() => deriveFromValue(value))
```

- Clicking a fixed preset card: `setActiveCardId(preset.id)` **and** `onSelect(preset.template)` (parent sets `brandVoice`).
- Clicking Custom: `setActiveCardId('custom')` **only** — does not touch `value`. This is what makes Custom reachable again after a preset was selected: the user can always click back into Custom to see/edit whatever text is currently in `brandVoice` (the preset template they just picked, or older AI-analyzed text still sitting in state).
- `customSlot` renders when `activeCardId === 'custom'`.
- Card highlight (`border-primary bg-primary/5`) is driven by `activeCardId`, not by re-deriving from `value` on every render — so the two don't fight each other once the user starts clicking around.

Layout: `grid grid-cols-2 gap-2` (2x2 on desktop, matches existing `max-w-[640px]` column width), each card `rounded-lg border p-3` with selected state `border-primary bg-primary/5`.

### 3. Top banner replacing both alert boxes

Remove the two existing blocks in `page.tsx`:
```tsx
{profile && !profile.onboarding_complete && (...)}
{profile?.onboarding_complete && (...)}
```

Replace with a single conditional banner rendered **above** the `<h1>Pengaturan</h1>` header, sticky to the top of the scroll container:

```tsx
{profile && !profile.wa_connected && (
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

**Regression fix (2026-07-10, second review pass)**: this banner condition was originally spec'd as `!profile.onboarding_complete`, the same field the WhatsApp card originally used before the item-6 fix. That left the banner and the WhatsApp card able to disagree: after a phone-side logout, `wa_connected` goes `false` (correctly) but `onboarding_complete` stays stale `true` (per the item-6 grep findings above) — so the WhatsApp card would correctly flip to "Belum terhubung" while the banner, still reading the stale field, stayed hidden. Fixed by keying the banner on `wa_connected` too, matching the WhatsApp card exactly. Re-grepped `app/(dashboard)/settings/page.tsx` for every remaining `onboarding_complete` reference: only the two blocks being deleted by this change (lines 343 and 353, both shown in the "Remove the two existing blocks" snippet above) — no third read of that field survives in the file for connection-status purposes.

When `profile.wa_connected` is true, nothing renders — the collapsed WhatsApp `InlineEditCard` summary ("Terhubung ✓") already communicates connected status, so the old green success box is redundant and removed outright. The card and the banner now always agree, since both read the same field.

**Verified against `app/(dashboard)/layout.tsx`**: no sticky header exists in the layout (`<main className="flex-1 overflow-y-auto pb-16 md:pb-0">` is a plain scroll container) — `top-0 z-10` on the banner has nothing to conflict with. The `-mx-6 lg:-mx-8` / `px-6 lg:px-8` values are confirmed correct against the actual JSX: they cancel the outer grid div's own `p-6 lg:p-8` (`page.tsx:335`, `className="grid grid-cols-1 lg:grid-cols-[minmax(0,640px)_170px] lg:justify-center gap-8 p-6 lg:p-8 animate-enter"`), and nothing sits between the banner and that padded ancestor to interfere — confirmed by direct read, not assumed.

**Scope caveat**: that same grid uses `lg:justify-center` with a `minmax(0,640px)` content column, so the banner bleeds only to the edge of that 640px column — not full app width past the sidebar like the Intercom reference (which spans a wider shell). True edge-to-edge would require restructuring the page container, out of scope for this pass. Cosmetic reduction, not a bug.

## Verification notes (from spec review, 2026-07-10)

Explicit resolution for every item raised across both review passes — no item left as a bare mention, each has either a code fix or a stated reason none is needed:

1. **`InlineEditCard` mount-timing (Bug 2)** — confirmed no fix needed. `page.tsx:318-332` gates the entire settings UI behind `if (loading) return <Skeleton/>`. Profile is fetched client-side (via `useEffect` + Supabase call, not server-fetched), but that fetch completes and `setLoading(false)` fires before any `InlineEditCard` mounts — the loading skeleton return is what prevents the sections from ever rendering against empty/undefined profile data. So `defaultExpanded` (read once via `useState`) sees real data on its true first render. No skeleton-inside-card or `key`-remount trick needed on top of the existing gate.
2. **WhatsApp auto-collapse on connect** — fix applied: `onConnected` prop, see design section 1 above.
3. **Banner layout conflicts** — confirmed correct, see the two paragraphs directly above this list (verified against actual `layout.tsx` and `page.tsx` JSX, not assumed).
4. **Anchor nav + collapsed cards** — decision, applied uniformly, zero code change to `SettingsAnchorNav` required: clicking any anchor nav item only calls `scrollIntoView`, exactly as it does today; it never auto-expands a collapsed `InlineEditCard`. This applies identically to the Nama Bisnis and WhatsApp targets — neither one is special-cased. Rationale: `SettingsAnchorNav` has no access to page-level expand state and no prop for it in this design; adding a lifted-state bridge just to auto-expand on nav-click is disproportionate to the benefit (one extra "Edit" click), and the Ghost reference this whole redesign is based on doesn't auto-expand on its own left-nav clicks either.
5. **`onboarding_complete` / `wa_connected` divergence** — real bug found via grep across every write path (`/api/whatsapp/connected`, `/api/whatsapp/disconnect`, `/api/whatsapp/status`, `/api/whatsapp/disconnected`): `onboarding_complete` only resets to `false` in the manual disconnect route; the poll-detected disconnect and the external webhook both reset `wa_connected: false` while leaving `onboarding_complete: true`. Fixed by keying **both** the WhatsApp card (design section 1) **and** the top banner (design section 3, regression fix above) on `wa_connected` — they now always agree with each other. Re-grepped `page.tsx` after this fix: zero remaining reads of `onboarding_complete` for connection-status purposes.

## Out of scope

- No changes to `WhatsAppSection` beyond the one-line `onConnected` callback addition, `BusinessKnowledgeSection`, `AIRulesSection`, `TemplatesSection`, `ImportDataSection` internals.
- No new API routes — `handleSaveProfile` still does one PATCH with `business_name` + `brand_voice` + `escalation_keywords`.
- No billing/paywall feature (confirmed out of scope — Glim has no payment tiers, `auto_reply_level` unlocks via `feedback_count` threshold, not payment).
- No e2e test added (none exist for settings page today).
- No fix for the pre-existing `onboarding_complete`/`wa_connected` divergence at its source (the `/api/whatsapp/status` and `/api/whatsapp/disconnected` routes) — worked around at the UI layer per verification note 5 above; the source-level fix is a separate, future concern outside this redesign.

## Testing

- `pnpm build` passes
- Manual, fresh account (not connected): banner visible, CTA scrolls to `#whatsapp`, WhatsApp card default-expanded, Nama Bisnis card default-expanded (empty)
- Manual, existing connected account: banner hidden, WhatsApp card collapsed showing "Terhubung ✓", Nama Bisnis card collapsed showing saved name with Edit button
- **Manual, simulated field divergence** (`wa_connected = false` while `onboarding_complete = true`, set via direct DB edit): confirm the WhatsApp card AND the top banner both show "not connected" state — they must agree with each other; this is the regression-fix check, since before the fix the banner alone stayed hidden in this exact scenario
- Manual: click each tone preset card → textarea preview updates (visible once Custom selected) → selected card highlights correctly; switching between an AI-analyzed brand voice and back to a preset doesn't lose the analyzed text until a preset is explicitly clicked; after selecting a fixed preset, clicking Custom successfully reveals the textarea again with the preset's text still editable (Bug 1 regression check)
- Manual: Simpan Profil still saves correctly, `lastSavedAt` bump collapses Nama Bisnis card back after save
- Manual: successful QR scan auto-collapses the WhatsApp card immediately (no reload needed) via `onConnected`
- **Keyboard navigation**: tab order through the 4 `TonePresetPicker` cards and both `InlineEditCard` "Edit" buttons is logical (follows visual/DOM order); Enter/Space activates a focused preset card or Edit button
- **Mobile viewport** (< 640px): `TonePresetPicker`'s `grid-cols-2` layout doesn't overflow or clip card text at narrow widths
- **`handleSaveProfile` network failure**: force/mock a failed PATCH response — confirm the Nama Bisnis `InlineEditCard` stays expanded (does not fire `onCollapseRequest` on failure, since that only bumps on the success path) and the existing `toast.error("Gagal menyimpan. Coba lagi.")` is visible to the user
