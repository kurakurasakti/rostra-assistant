# Phase 1: Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply premium dusty purple + gold design system tokens across globals.css, shadcn components, login/register pages, and sidebar.

**Architecture:** CSS custom properties in `globals.css` drive all component styles. Shadcn components reference these variables. Login/Register share a split-panel layout. Sidebar is a dashboard layout wrapper.

**Tech Stack:** Tailwind CSS v4, shadcn/ui base-nova, Base UI React, next-themes

---

### Task 1: Update CSS Tokens (globals.css)

**Files:**
- Modify: `app/globals.css:53-121`

- [ ] **Step 1: Replace light mode color tokens**

Replace `:root` block colors with purple + gold palette, update radius to 12px:

```css
/* Light mode */
:root {
  --background: oklch(0.985 0.004 75);
  --foreground: oklch(0.175 0.010 50);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.175 0.010 50);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.175 0.010 50);
  --primary: oklch(0.42 0.14 305);        /* #703c8b */
  --primary-foreground: oklch(0.95 0 0);
  --secondary: oklch(0.94 0.007 72);
  --secondary-foreground: oklch(0.175 0.010 50);
  --muted: oklch(0.94 0.007 72);
  --muted-foreground: oklch(0.51 0.014 60);
  --accent: oklch(0.74 0.16 70);          /* gold #f59e0b */
  --accent-foreground: oklch(0.175 0.010 50);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.91 0.008 72);
  --input: oklch(0.91 0.008 72);
  --ring: oklch(0.42 0.14 305);           /* matches primary */
  --chart-1: oklch(0.42 0.14 305);
  --chart-2: oklch(0.52 0.14 155);
  --chart-3: oklch(0.60 0.12 215);
  --chart-4: oklch(0.65 0.10 280);
  --chart-5: oklch(0.70 0.08 340);
  --radius: 0.75rem;                      /* 12px base */
  --sidebar: oklch(0.99 0.004 75);
  --sidebar-foreground: oklch(0.175 0.010 50);
  --sidebar-primary: oklch(0.42 0.14 305);
  --sidebar-primary-foreground: oklch(0.95 0 0);
  --sidebar-accent: oklch(0.92 0.010 72);
  --sidebar-accent-foreground: oklch(0.175 0.010 50);
  --sidebar-border: oklch(0.91 0.008 72);
  --sidebar-ring: oklch(0.42 0.14 305);
}
```

- [ ] **Step 2: Replace dark mode color tokens**

Replace `.dark` block colors:

```css
/* Dark mode */
.dark {
  --background: oklch(0.078 0.008 52);     /* #141416 */
  --foreground: oklch(0.93 0.015 78);
  --card: oklch(0.11 0.008 52);
  --card-foreground: oklch(0.93 0.015 78);
  --popover: oklch(0.11 0.008 52);
  --popover-foreground: oklch(0.93 0.015 78);
  --primary: oklch(0.52 0.14 305);          /* lighter purple for dark mode */
  --primary-foreground: oklch(0.95 0 0);
  --secondary: oklch(0.20 0.010 52);
  --secondary-foreground: oklch(0.93 0.015 78);
  --muted: oklch(0.20 0.010 52);
  --muted-foreground: oklch(0.56 0.018 65);
  --accent: oklch(0.74 0.16 70);            /* gold #f59e0b */
  --accent-foreground: oklch(0.175 0.010 50);
  --destructive: oklch(0.65 0.22 20);
  --border: oklch(0.25 0.012 52);
  --input: oklch(0.21 0.011 52);
  --ring: oklch(0.52 0.14 305);
  --chart-1: oklch(0.52 0.14 305);
  --chart-2: oklch(0.55 0.14 155);
  --chart-3: oklch(0.65 0.11 215);
  --chart-4: oklch(0.70 0.09 280);
  --chart-5: oklch(0.75 0.07 340);
  --sidebar: oklch(0.11 0.008 52);
  --sidebar-foreground: oklch(0.93 0.015 78);
  --sidebar-primary: oklch(0.52 0.14 305);
  --sidebar-primary-foreground: oklch(0.95 0 0);
  --sidebar-accent: oklch(0.20 0.010 52);
  --sidebar-accent-foreground: oklch(0.93 0.015 78);
  --sidebar-border: oklch(0.23 0.010 52);
  --sidebar-ring: oklch(0.52 0.14 305);
}
```

- [ ] **Step 3: Verify CSS compiles**

Run: `npm run dev` and check no console errors. Dark/light toggle works on any page.

---

### Task 2: Add Button Press Animation

**Files:**
- Modify: `components/ui/button.tsx:7`

- [ ] **Step 1: Add active:scale to button variants**

Replace the `transition-all` in the base class to add scale(0.97) on active, and add transition for transform:

```css
// Old base class line
"group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",

// New base class line
"group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
```

Key change: `active:not-aria-[haspopup]:translate-y-px` → `active:not-aria-[haspopup]:scale-[0.97]`

- [ ] **Step 2: Verify visually**

Open any page with buttons, click and hold — button should scale to 97%. Release — return to 100%.

---

### Task 3: Add Gold Outline Button Variant

**Files:**
- Modify: `components/ui/button.tsx:11-21`

- [ ] **Step 1: Add gold outline variant**

Add a new `accent-outline` variant to `buttonVariants`:

```css
variants: {
  variant: {
    default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
    outline:
      "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
    "accent-outline":
      "border-accent/40 text-accent hover:bg-accent/10 aria-expanded:bg-accent/10 dark:border-accent/30 dark:hover:bg-accent/15",
    secondary:
      "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
    ghost:
      "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
    destructive:
      "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
    link: "text-primary underline-offset-4 hover:underline",
  },
```

- [ ] **Step 2: Verify**

Use `<Button variant="accent-outline">Test</Button>` on a test page — gold border + gold text.

---

### Task 4: Refresh Login Page

**Files:**
- Modify: `app/login/page.tsx`

- [ ] **Step 1: Update left panel to purple gradient**

Replace `bg-primary` with gradient purple + add gold accent elements:

```tsx
{/* Left panel — brand */}
<div className="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col justify-between p-12 relative overflow-hidden"
  style={{
    background: 'linear-gradient(135deg, #4a2560 0%, #703c8b 40%, #8b5aa3 100%)'
  }}>
  <div className="absolute inset-0 overflow-hidden">
    <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-white/5" />
    <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.03]" />
  </div>

  <div className="relative">
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center">
        <MessageSquare className="w-4 h-4 text-accent" />
      </div>
      <span className="text-white font-display font-semibold text-lg tracking-tight">Rostra</span>
    </div>
  </div>

  <div className="relative space-y-6">
    <div>
      <h1 className="text-white font-display font-bold text-4xl xl:text-5xl leading-tight tracking-tight">
        Bisnis lebih rapi,<br />
        pelanggan lebih<br />
        senang.
      </h1>
      <p className="text-white/70 mt-4 text-base leading-relaxed max-w-xs">
        Kelola klien, pesanan, dan pesan WhatsApp dalam satu tempat yang terorganisir.
      </p>
    </div>

    <ul className="space-y-3">
      {[
        'Manajemen klien & pesanan otomatis',
        'Pengingat pembayaran via WhatsApp',
        'Inbox terpusat dengan balasan AI',
      ].map((feat) => (
        <li key={feat} className="flex items-start gap-3 text-sm text-white/80">
          <div className="mt-0.5 w-4 h-4 rounded-full bg-accent/30 flex items-center justify-center flex-shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
          </div>
          {feat}
        </li>
      ))}
    </ul>
  </div>

  <div className="relative">
    <p className="text-white/40 text-xs">© 2025 Rostra. Dibuat dengan ♥ untuk bisnis Indonesia.</p>
  </div>
</div>
```

- [ ] **Step 2: Add subtle fade-up animation to right panel form**

The form already has `animate-fade-up`. Ensure the animation timing feels right — current is 0.55s cubic-bezier(0.22, 1, 0.36, 1).

Keep everything else on the right panel unchanged (form content is same).

- [ ] **Step 3: Verify login page**

Open `/login`. Dark purple gradient left panel, gold accent dots on features list. Right panel form centered, subtle fade-up entrance.

---

### Task 5: Refresh Register Page

**Files:**
- Modify: `app/register/page.tsx`

- [ ] **Step 1: Match login left panel styling**

Replace `bg-primary` with same gradient as login page:

```tsx
{/* Left panel */}
<div className="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col justify-between p-12 relative overflow-hidden"
  style={{
    background: 'linear-gradient(135deg, #4a2560 0%, #703c8b 40%, #8b5aa3 100%)'
  }}>
  // ... same decorative circles and structure as login
</div>
```

Replace gold accent in feature bullets (same pattern as login change).

- [ ] **Step 2: Verify**

Open `/register`. Left panel matches login styling (purple gradient, gold accents).

---

### Task 6: Update Sidebar with Premium Style

**Files:**
- Modify: `components/dashboard/sidebar.tsx`

- [ ] **Step 1: Add gold active indicator and purple hover**

Replace the nav link styling:

```tsx
<Link
  key={href}
  href={href}
  className={cn(
    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
    isActive
      ? 'bg-primary/10 text-primary border-l-2 border-accent pl-[10px]'
      : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground'
  )}
>
  <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-accent' : '')} />
  {label}
</Link>
```

Key changes:
- Active: `border-l-2 border-accent` (gold left border), reduced left padding to `pl-[10px]` (from `pl-3`/`px-3`) to account for border
- Active icon: `text-accent` (gold) instead of `text-primary`
- Hover on inactive: `hover:bg-primary/5` (subtle purple tint)

- [ ] **Step 2: Verify sidebar**

Open dashboard. Active nav item has gold left border + gold icon. Hover inactive item shows subtle purple bg.

---

### Task 7: Polish Dashboard Placeholder

**Files:**
- Modify: `app/(dashboard)/page.tsx`

- [ ] **Step 1: Read current dashboard**

```bash
cat app/(dashboard)/page.tsx
```

- [ ] **Step 2: Apply Phase 1 tokens to existing structure**

Replace hardcoded amber colors with purple/gold. Add gold accent to "Mulai dengan Rostra" step circles. Keep placeholder data (real data comes in Phase 3).

```tsx
// Example: stat card accent
<div className="rounded-xl border border-border bg-card p-5">
  <div className="flex items-center justify-between mb-3">
    <p className="text-sm text-muted-foreground">Total Klien</p>
    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
      <Users className="w-4 h-4 text-primary" />
    </div>
  </div>
  <p className="text-3xl font-bold font-display tracking-tight">0</p>
</div>
```

- [ ] **Step 3: Verify**

Dashboard shows purple/gold themed stat cards and guide section.

---

### Task 8: Self-Review & Commit

- [ ] **Step 1: Quick visual audit**

Navigate through all Phase 1 pages:
- `/login` — purple gradient, gold accents
- `/register` — matches login
- `/` (dashboard) — purple/gold themed cards
- Inbox, Clients — basic token application visible
- Sidebar active state — gold left border + gold icon
- Dark mode toggle — verify all colors work in dark mode

- [ ] **Step 2: Fix any contrast issues**

If dark mode purple text on dark bg is hard to read, adjust `--primary` in `.dark` to lighter value.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: apply premium purple + gold design system

- Update CSS tokens to #703c8b dusty purple + gold accent
- Add button press animation (scale 0.97)
- Add gold outline button variant
- Refresh login/register with purple gradient + gold accents
- Update sidebar with gold active indicator
- Apply tokens across dashboard placeholder
"
```
