# Rostra UI Redesign — Phase 1: Design System

**Status:** Ready to implement
**Dependencies:** None
**Files affected:** `app/globals.css`, `components.json`, shadcn components, `app/login/`, `app/register/`, `components/dashboard/sidebar.tsx`

## What to do

### 1. Update CSS Tokens (globals.css)

Edit `app/globals.css`:

- Set `--primary` and family to purple scale (#703c8b main)
- Set `--radius` to `0.75rem` (12px)
- Add gold accent variables (`--accent`, `--accent-dark`, `--accent-light`)
- Update dark mode surface colors (#141416 background)
- Ensure all OKLCH values match new palette
- Typography scale stays same (DM Sans + Outfit)

### 2. Update shadcn Component Theme

Edit `components.json` to reflect new theme base.

Run or manually update shadcn base styles:
- Buttons: purple primary, gold outline
- Inputs: purple focus ring
- Badges: purple soft variant

### 3. Refresh Login/Register

**Login page** (`app/login/page.tsx`):
- Left panel: purple gradient bg (#4a2560 → #703c8b) with gold accent text
- Right panel: clean white form, purple button
- Add subtle animation (fade-up on form, 200ms ease-out)

**Register page** (`app/register/page.tsx`):
- Match login aesthetic

### 4. Update Sidebar

**File:** `components/dashboard/sidebar.tsx`
- Dark surface background (light: white, dark: #1a1a1e)
- Active item: purple bg tint + gold left border (3px)
- Active icon: gold color
- Inactive: muted text
- Hover: subtle bg change

### 5. Button Component Polish

Add to all pressable elements:
```css
transition: transform 160ms ease-out;
&:active { transform: scale(0.97); }
```

Gate hover effects behind `@media (hover: hover) and (pointer: fine)`.

### 6. Verify

- `npm run dev` — visual check all pages
- Dark/light mode toggle works
- Contrast ratios pass (especially dark mode purple on dark bg)
- Login/register flow works
- Sidebar navigation works

## Token Limit Recovery

If implementing in a new session:
1. Read this file and `globals.css`
2. Read `components/` directory for shadcn components
3. Read `app/login/page.tsx`, `app/register/page.tsx`, `components/dashboard/sidebar.tsx`
4. Follow steps 1-6 above
