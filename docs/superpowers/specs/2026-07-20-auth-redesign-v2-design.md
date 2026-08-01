# Auth Pages Redesign v2 — Drop Split-Screen

**Date:** 2026-07-20
**Branch:** feat/landing-page
**Supersedes:** `2026-07-10-auth-redesign-design.md` (split-screen dark-panel + WA mockup version)
**Goal:** Replace the split-screen layout on `/login` and `/register` with a single centered card over an ambient gradient background, matching the hero section's visual signature. Auth logic, field ids, and copy unchanged.

## Background

The v1 auth redesign (2026-07-10) shipped a split-screen layout: dark aubergine panel with a `WaMockup` chat preview on the left, white form card on the right. Two problems surfaced on review:

1. The `WaMockup` panel has visible buttons ("Ubah"), a textarea, and send affordances — it reads as a second functional UI panel next to the real form, not as ambient brand texture. Users can't tell at a glance which panel to interact with.
2. Split-screen dark-panel + white-form is the single most generic SaaS auth pattern in existence — it contradicts the distinctive, non-template direction taken in the hero redesign.

Mobbin references for the new direction: [Disney+](https://mobbin.com/screens/9ddbf1b8-a42f-4b04-a50c-b2383ee3eaef) (centered card over dark ambient gradient, no split), [beehiiv](https://mobbin.com/screens/1cb1fbaa-dd67-47f9-ab78-4a572f4b5775) (wavy non-photo gradient bg, centered card), [Workable](https://mobbin.com/screens/e25e14a3-e2ae-42c1-89b2-46322a23f31e) (warm cream card floating on blurred non-photo color field).

Explicitly rejected: any full-bleed human/dramatic photography background (e.g. Superlist) — same reasoning as the hero redesign: no authentic photo source available, risk of generic/AI-moodboard look.

## Design

### 1. Background — reuse hero's exact recipe

Both pages get the identical ambient-glow treatment already shipped in `app/page.tsx`'s hero section (~line 90-125), not just a similar one:

- Base: `#F8F6F2`
- Faint batik parang SVG texture, `opacity: 0.28` (copy inline SVG from hero)
- Two `animate-hero-glow` blurred (`blur-3xl`) radial blobs using the existing `hero-glow-drift` keyframe:
  - Gold: `radial-gradient(circle, rgba(232,163,61,0.30) 0%, rgba(232,163,61,0) 70%)`
  - Aubergine: `radial-gradient(circle, rgba(112,60,139,0.22) 0%, rgba(112,60,139,0) 70%)`

**Differentiation between pages** (replaces the old mockup-content differentiation): adjust glow blob opacity balance, not position or new elements.
- Login: aubergine glow slightly stronger (`0.26` vs gold `0.22`) — calmer, "coming back"
- Register: gold glow slightly stronger (`0.34` vs aubergine `0.18`) — warmer, "something new"

### 2. Layout — single centered card, no split

- Remove `AuthBrandPanel` and its `lg:flex` split entirely. Delete `components/auth/auth-brand-panel.tsx` (only consumer).
- `WaMockup` stays in `components/landing/wa-mockup.tsx`, still used by the landing page — not deleted, just no longer imported by auth pages.
- Page structure: full-viewport relative container (glow layers absolutely positioned, `pointer-events-none`) → centered flex column → logo (`Logo variant="lockup"`) above the card → white card (`rounded-2xl`, `border-[#E8E4DC]`, `shadow-sm`, `p-8`, `max-w-md`) → footer link below card.
- This is effectively what already renders below the `lg` breakpoint today — the new layout is that mobile view, applied at all breakpoints.

### 3. Form inputs

- `components/ui/input.tsx` focus ring already resolves to `oklch(0.42 0.14 305)` (aubergine) via `--ring` — matches `--primary`, no change needed.
- Per-instance className changes only (no shared component edit): fill background warm off-white instead of transparent/white, radius bumped `rounded-lg` → `rounded-xl` to match the card's larger radius scale.
- Label-above-input pattern already in place on both pages — unchanged.

### 4. Content — unchanged

- Headlines/taglines/copy on both pages stay exactly as they are today (this is a visual-only redesign, per original constraint).
- Login: "Selamat datang kembali 👋" / "Masuk untuk melanjutkan ke Glim"
- Register: "Buat akun Glim ✨" / "Gratis 14 hari, nggak perlu kartu kredit"
- Email-confirmation success screen on register: same content, same card treatment.

### 5. Constraints (e2e compatibility — carried over from v1 spec)

`e2e/flows/F1-auth.spec.ts` relies on:
- Field ids: `#businessName`, `#email`, `#password`, `#inviteCode` — must keep
- `button[type="submit"]` — must keep
- Error box class `bg-destructive/10` — must keep
- Terms checkbox `id="terms"`, submit `disabled={!termsAccepted}` — already in place, keep as-is

### 6. Out of scope

- Forgot-password flow, social login, translating Supabase error messages (same exclusions as v1)
- Any change to `WaMockup` itself or its use on the landing page
- Changing auth logic (Supabase calls, redirects)

## Testing

- `pnpm build` passes
- E2E F1.1–F1.3 pass unchanged (no field/copy changes)
- Manual: login and register render centered card over glow background at mobile and desktop widths; glow balance visibly differs between the two pages; no visible split-panel remnant; focus states show aubergine ring
