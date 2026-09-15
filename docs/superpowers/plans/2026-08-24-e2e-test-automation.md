# E2E Test Verification & Automation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify existing test suite passes, fix ordering/flake bugs, close unit + E2E coverage gaps.

**Architecture:** Audit-first. Run existing suite, triage failures via Trace Viewer, then add deterministic unit tests for pure functions and fix E2E ordering via spec file renames. Remote Supabase stays as-is. No CI (user decision). Work happens on branch `test/e2e-verification` — merge to main only on explicit user approval.

**Tech Stack:** Vitest 4, Playwright 1.60 (+ MCP server, test agents, ARIA snapshots), Supabase JS (service role), remote Supabase test project.

**Tooling additions (2026 research):**
- Playwright MCP server in `.mcp.json` — live browser access for selector discovery
- `currents-dev/playwright-best-practices-skill` — role-based locators, API seeding, trace debugging rules
- `--last-failed` flag for fast fix-iterate loops

---

### Task 0: Branch + plan file

- [x] Create branch: `git checkout -b test/e2e-verification`
- [x] Save this plan to `docs/superpowers/plans/2026-08-24-e2e-test-automation.md`

### Task 0.5: Tooling setup

- [ ] Add to `.mcp.json`: `"playwright": { "command": "npx", "args": ["@playwright/mcp@latest"] }`
- [ ] Install skill: `npx skills add https://github.com/currents-dev/playwright-best-practices-skill`

### Task 1: Baseline audit

**Files:** Create `docs/test-audit-2026-08-24.md`

- [ ] Verify `.env.local` has required vars (Supabase URL/keys, WEBHOOK_SECRET, INVITE_CODE)
- [ ] Run `pnpm test` — record pass/fail per file
- [ ] Run `pnpm test:e2e` — capture results, inspect failures via Trace Viewer
- [ ] Record per-test status + failure category in audit doc

Known-predictable failures from ordering analysis: F11 runs before F9 (notifications missing), F15 runs before F8 (messages missing).

### Task 2: Fix unit test failures (audit-driven)

| Failure | Fix |
|---|---|
| Import path break | Fix alias/module path |
| Assertion vs behavior drift | Update expected values after confirming behavior correct |
| Real bug | Report to user, don't mask |

- [ ] Re-run until green
- [ ] Commit: `fix(tests): repair failing unit tests`

### Task 3: Unit tests — `lib/templates.ts`

**Test:** `src/__tests__/lib/templates.test.ts`

- interpolateTemplate: known vars replaced; unknown vars untouched; empty inputs
- formatRupiah: id-ID separators (`1500000` → `1.500.000`); zero
- formatRupiahInput: strips non-digits then formats; no digits → empty string

- [ ] Run → PASS. Commit: `test: add unit tests for lib/templates`

### Task 4: Unit tests — `lib/scheduler.ts`

**Test:** `src/__tests__/lib/scheduler.test.ts` (verify field names against `types/index.ts` first)

Assert:
1. konfirmasi_pesanan scheduled_at ≈ now + 5min
2. payment reminder = due_date − reminder_days_before at 09:00 WIB (+07:00)
3. paid stages skipped
4. past reminders skipped
5. appointment reminder = scheduled_at − reminder_hours_before
6. past appointment reminders skipped
7. custom template preferred over default
8. missing template type → nothing generated

- [ ] Run → PASS. Commit: `test: add unit tests for scheduler message generation`

### Task 5: Unit tests — `lib/chat-parser.ts`

**Test:** `src/__tests__/lib/chat-parser.test.ts` with inline WhatsApp export fixture

- parseWhatsAppExport: count, sender extraction, timestamp parsing
- extractQAPairs / categorizeQAPair / selectBestExamples behaviors

- [ ] Run → PASS. Commit: `test: add unit tests for chat parser`

### Task 6: Seed helper

**File:** `e2e/helpers/seed.ts` — `uniquePhone()`, `seedClientViaImport()`, `seedInboxMessage()` wrapping existing `wa-webhook.ts`.

- [ ] Commit: `test: add e2e seed helpers`

### Task 7: Fix spec ordering

Playwright orders alphabetically; current order breaks data deps (F10 before F8, F11 before F9, F15 before F8).

Rename with run-order prefixes:

```
F1-auth.spec.ts               → S01-auth.spec.ts
F3-brand-voice.spec.ts        → S02-brand-voice.spec.ts
F4-business-knowledge.spec.ts → S03-business-knowledge.spec.ts
F5-escalation.spec.ts         → S04-escalation.spec.ts
F6-clients.spec.ts            → S05-clients.spec.ts
F7-orders.spec.ts             → S06-orders.spec.ts
F8-inbox.spec.ts              → S07-inbox.spec.ts
F9-security.spec.ts           → S08-security.spec.ts
F10-feedback.spec.ts          → S09-feedback.spec.ts
F11-notifications.spec.ts     → S10-notifications.spec.ts
F12-importer.spec.ts          → S11-importer.spec.ts
F13-onboarding.spec.ts        → S12-onboarding.spec.ts
F14-templates.spec.ts         → S13-templates.spec.ts
F15-message-history.spec.ts   → S14-message-history.spec.ts
F16-auth-boundaries.spec.ts   → S15-auth-boundaries.spec.ts
```

Order rationale: auth → settings setup → clients → orders → inbox → security → feedback → notifications → independent flows.

- [ ] Update mapping table in `docs/automated-testing-plan.md`
- [ ] Commit: `fix(e2e): enforce spec run order matching data dependencies`

### Task 8: Add F12.4 — importer UI wizard

Append browser test to `S11-importer.spec.ts`: upload xlsx fixture → mapping auto-suggest → preview rows → import result counts. Selectors discovered live via playwright MCP against `/settings?tab=import`.

- [ ] Generate `e2e/fixtures/sample-import.xlsx`
- [ ] Run → PASS. Commit: `test(e2e): add importer wizard UI flow`

### Task 9: Fix remaining E2E failures (audit-driven)

Rules (per best-practices skill):
- Replace CSS/XPath selectors with `getByRole`/`getByLabel`/`getByText`
- Discover real selectors via playwright MCP live browsing before editing
- Structural assertions via `toMatchAriaSnapshot` where appropriate
- Mock AI provider endpoints via `page.route` where non-deterministic
- App bugs: stop, report to user before touching app code

- [ ] Iterate with `pnpm test:e2e --last-failed` until green
- [ ] Commit fixes individually

### Task 10: Final verification

- [ ] `pnpm lint` clean
- [ ] `pnpm test` all pass
- [ ] `pnpm test:e2e` all pass (manual QR flow excluded)
- [ ] Update checklist in `docs/automated-testing-plan.md`
- [ ] Final commit

---

**Out of scope:** CI workflow, local Supabase, F2 QR automation (manual by design).

**Merge policy:** Branch stays off main until user explicitly approves merge.
