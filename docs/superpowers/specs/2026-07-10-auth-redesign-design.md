# Auth Pages Redesign — Login & Register

**Date:** 2026-07-10
**Branch:** feat/landing-page
**Goal:** Redesign `/login` and `/register` to match the new landing page's warm, friendly visual language, fix copy inconsistencies, and add small UX improvements. Auth logic unchanged.

## Background

The landing page (Phase 6) established a new visual language: warm cream background (`#F8F6F2`), purple primary (`#703c8b`), friendly Indonesian copy, and an animated WhatsApp chat mockup in the hero. The auth pages still use the older design with mixed English/Indonesian copy and don't link login → register even though the landing page CTA sends visitors to `/register`.

Mobbin references that informed the direction: Brilliant (split panel with playful brand side), Lovable (split with product teaser), Kit (split with human warmth).

## Design

### 1. Shared components

**`components/landing/wa-mockup.tsx`** — extract the `WaMockup` function from `app/page.tsx` (currently inline at ~line 459) into its own file. `app/page.tsx` imports it. No visual changes to the landing page.

**`components/auth/auth-brand-panel.tsx`** — new shared left panel used by both auth pages:

- Purple gradient background: `linear-gradient(135deg, #4a2560 0%, #703c8b 40%, #8b5aa3 100%)` (same as current pages)
- Decorative soft circles retained
- Layout top-to-bottom: Glim logo (lockup, dark tone) → centered `WaMockup` scaled to ~340px wide → headline + tagline
- Props: `headline: ReactNode`, `tagline: string`
- Hidden below `lg` breakpoint (same as now)
- Chat mockup uses existing `chat-bubble-in` / `ai-draft-in` keyframes from `globals.css`

### 2. Right panel (both pages)

- Background: cream `#F8F6F2` instead of default `bg-background`
- Form card area: white card (`bg-white`, `rounded-2xl`, `border #E8E4DC`, soft shadow) containing the form — ties to the landing page's card style
- Mobile (< lg): logo at top, card centered on cream background

### 3. Login page (`app/login/page.tsx`)

- Panel headline: "Bisnis lebih rapi, pelanggan lebih senang." / tagline: current subtext retained
- Form heading: "Selamat datang kembali 👋" / sub: "Masuk untuk melanjutkan ke Glim"
- Fields: email, password (with visibility eye toggle)
- Button text: "Masuk", loading state: "Sebentar ya..."
- Footer: "Belum punya akun? Daftar di sini" → links to `/register` (replaces "Hubungi kami untuk mendapat kode undangan")
- Error message: all Indonesian (remove `error.message` English leakage is out of scope — keep current format)
- Auth logic (Supabase `signInWithPassword`, onboarding redirect to `/settings` or `/dashboard`) unchanged

### 4. Register page (`app/register/page.tsx`)

- Panel headline: "Mulai kelola bisnis kamu hari ini." / tagline: current subtext retained
- Form heading: "Buat akun Glim ✨" / sub: "Gratis 14 hari, nggak perlu kartu kredit"
- Fields unchanged: businessName, email, password (with eye toggle), inviteCode, terms checkbox
- Terms checkbox gets `id="terms"`; submit button `disabled={!termsAccepted}` restored (currently commented out)
- Button text: "Daftar", loading: "Mendaftar..."
- Email-confirmation success screen: same content, restyled inside the white card
- Registration logic (invite check → signUp → terms consent save) unchanged

### 5. Constraints (e2e compatibility)

`e2e/flows/F1-auth.spec.ts` relies on:

- Field ids: `#businessName`, `#email`, `#password`, `#inviteCode` — must keep
- `button[type="submit"]` — must keep
- Error box class `bg-destructive/10` — must keep
- **F1.1 must be updated**: it submits without checking the terms checkbox; with the disabled button restored it must first `page.check('#terms')`

### 6. Out of scope

- Forgot-password flow (no backend route exists — separate task)
- Social login (Google/Apple)
- Translating Supabase error messages
- F1.4 landing-page redirect assertion (pre-existing, unrelated)

## Testing

- `pnpm build` passes
- E2E F1.1–F1.3 pass with the updated F1.1 (terms check added)
- Manual: login redirects per onboarding state; register with valid invite reaches `/settings`; invalid invite shows error; terms unchecked → button disabled; mobile layout renders card on cream background
