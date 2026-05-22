# Rostra UI Redesign — Design Spec

**Date:** 2026-05-22
**Approach:** Design System First (phased)
**Palette:** Premium Dusty Purple + Gold

## Design Direction

- **Personality:** Bold Vibrant → Premium Bold
- **Primary Color:** #703c8b (dusty purple, Coloro 136-32-33)
- **Accent Color:** #f59e0b (warm gold)
- **Typography:** DM Sans (body) + Outfit (headings) — unchanged
- **Border Radius:** 12px base (larger than current 10px)
- **Surface:** Clean white (light) / #141416 (dark)

## Phase Breakdown

### Phase 1: Design System + Login/Register + Sidebar
- CSS custom properties (colors, radius, typography)
- shadcn component theme update
- Button, Input, Badge, Card, Sidebar components
- Login/Register page refresh
- Sidebar visual update

### Phase 2: Settings + Import
- Split 902-line settings page into sub-pages
- Business Knowledge wizard UI polish
- Import page (currently placeholder) build
- Consistent form styling

### Phase 3: Dashboard + Inbox
- Dashboard with real data, stat cards, charts
- Inbox two-column layout polish
- Micro-interactions (button press, hover states)
- Loading/skeleton states

### Phase 4: Clients + Client Detail
- Refactor monolithic page (759 lines → smaller components)
- Consistent card/table styling
- Order form + payment timeline polish
- Empty states

## Design System Tokens

### Colors (CSS variables in globals.css)

```css
:root {
  --primary-50: #f3e8ff;   /* lightest */
  --primary-100: #e9d5ff;
  --primary-200: #d8b4fe;
  --primary-300: #c084fc;
  --primary-400: #a78bfa;
  --primary-500: #a67cba;
  --primary-600: #8b5aa3;
  --primary-700: #703c8b;  /* main */
  --primary-800: #5e3077;
  --primary-900: #4a2560;  /* darkest */
  --primary: #703c8b;

  --accent: #f59e0b;
  --accent-dark: #d97706;
  --accent-light: #fbbf24;

  --background: oklch(1 0 0);           /* light */
  --foreground: oklch(0.175 0.010 50);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.175 0.010 50);
  --muted: oklch(0.94 0.007 72);
  --muted-foreground: oklch(0.51 0.014 60);
  --border: oklch(0.91 0.008 72);
  --ring: #703c8b;
  --radius: 0.75rem;                    /* 12px base */

  /* Dark overrides via .dark class */
  .dark {
    --background: oklch(0.078 0.008 52);  /* #141416 */
    --foreground: oklch(0.93 0.015 78);
    --card: oklch(0.11 0.008 52);
    --muted: oklch(0.20 0.010 52);
    --border: oklch(0.25 0.012 52);
  }
}
```

### Typography
- Body: DM Sans, 14px base, line-height 1.5
- Headings: Outfit, bold, line-height 1.2
- Scale: 3xl (32px), 2xl (24px), xl (20px), lg (18px), base (14px), sm (13px), xs (12px)

### Component Updates

| Component | Current | After |
|-----------|---------|-------|
| Button (primary) | Amber bg | Purple (#703c8b) bg, gold outline variant |
| Button (:active) | None | transform: scale(0.97), 160ms ease-out |
| Input | Basic border | Purple focus ring, border #333 → #703c8b on focus |
| Badge | Soft amber | Soft purple bg + light purple text; gold/green/red variants |
| Sidebar | Light bg, amber active | Dark surface, purple active bg, gold left border indicator |
| Card | Standard border | Soft shadow, optional purple top accent border |

### Interaction Guidelines
- Button press: scale(0.97) at 160ms ease-out
- Hover: scale(1.02) at 200ms ease-out (mouse devices only: `@media (hover: hover) and (pointer: fine)`)
- Tooltips: 150ms ease-out, scale from 0.95 + opacity
- Dropdowns: 180ms ease-out, origin-aware transform
- Transitions: only transform + opacity (GPU-accelerated)
- No animation on keyboard-initiated actions
