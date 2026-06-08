# Automated Testing Infrastructure Plan

**Goal:** Convert `docs/test-plan.md` (manual E2E spec) into an automated, CI-runnable test suite.

---

## Framework Choice: Playwright + Vitest

| Layer | Framework | Why |
|-------|-----------|-----|
| **E2E + API** | **Playwright** | Browser automation + API testing (`APIRequestContext`) in one tool. Auto-wait, built-in test runner, trace viewer, retries. Cross-browser (Chromium + Firefox + WebKit). |
| **Unit / Integration** | **Vitest** | Fast, Vite-native, co-exists with Next.js. Tests pure logic (injection scanner, prompt builder, validation) in isolation. |

**Why not Puppeteer:** Puppeteer is Chromium-only, lacks a built-in test runner, requires manual `waitForSelector`, and has no API testing support. Playwright eliminates ~70% of common E2E flakes via auto-wait alone.

---

## File Structure

```
rostra-assistant/
├── src/
│   └── __tests__/                   # Vitest unit/integration tests
│       ├── utils/
│       │   ├── scanForInjection.test.ts
│       │   ├── validateAIOutput.test.ts
│       │   └── buildSecurePrompt.test.ts
│       └── api/
│           └── import.test.ts
├── e2e/                              # Playwright E2E tests
│   ├── playwright.config.ts
│   ├── fixtures/
│   │   └── auth.ts                   # Reusable auth session fixture
│   ├── flows/
│   │   ├── F1-auth.spec.ts
│   │   ├── F3-brand-voice.spec.ts
│   │   ├── F4-business-knowledge.spec.ts
│   │   ├── F5-escalation.spec.ts
│   │   ├── F6-clients.spec.ts
│   │   ├── F7-orders.spec.ts
│   │   ├── F8-inbox.spec.ts
│   │   ├── F9-security.spec.ts
│   │   ├── F10-feedback.spec.ts
│   │   ├── F11-notifications.spec.ts
│   │   ├── F12-importer.spec.ts
│   │   ├── F13-onboarding.spec.ts
│   │   ├── F14-templates.spec.ts
│   │   ├── F15-message-history.spec.ts
│   │   └── F16-auth-boundaries.spec.ts
│   ├── helpers/
│   │   ├── db.ts                     # Supabase query helpers (via MCP)
│   │   ├── wa-webhook.ts             # Simulate rostra-wa webhook calls
│   │   └── seed.ts                   # Test data seeding/cleanup
│   └── global-setup.ts              # Create test user, login, store cookies
├── docs/
│   ├── test-plan.md                  # Existing — source of truth
│   └── automated-testing-plan.md     # This document
├── .github/
│   └── workflows/
│       └── test.yml                  # CI pipeline
└── package.json
```

---

## Implementation Checklist

### Phase A — Scaffolding

- [ ] A1  Install Playwright (`@playwright/test`) + Vitest
- [ ] A2  Create `playwright.config.ts`
      - webServer: auto-start `pnpm dev`
      - baseURL: `http://localhost:3000`
      - globalSetup: `e2e/global-setup.ts`
      - storageState: `e2e/.auth/user.json`
      - timeout: 30s, retries: 2
- [ ] A3  Create `vitest.config.ts`
- [ ] A4  Add test scripts to `package.json`
      - `test`: vitest run
      - `test:watch`: vitest
      - `test:e2e`: playwright test
      - `test:e2e:ui`: playwright test --ui
      - `test:all`: vitest run && playwright test
- [ ] A5  Create `.github/workflows/test.yml`
      - Runs on push/PR to main
      - pnpm install → pnpm test → pnpm test:e2e
- [ ] A6  Create `e2e/helpers/db.ts`
      - Supabase query wrappers for post-action DB assertions
      - Uses Supabase MCP for remote test project
- [ ] A7  Create `e2e/helpers/wa-webhook.ts`
      - Helper to simulate rostra-wa webhook POST to `/api/webhook/whatsapp`
- [ ] A8  Create `e2e/fixtures/auth.ts`
      - Playwright fixture that extends base with authenticated page/context
- [ ] A9  Create `e2e/global-setup.ts` + `e2e/global-teardown.ts`
      - Register test user, login, save storage state
      - Teardown: clean up test data

### Phase B — Unit Tests (Vitest)

- [ ] B1  `src/__tests__/utils/scanForInjection.test.ts`
      - Detects prompt injection payloads
      - Clean messages pass through
      - Edge cases: empty, very long, mixed languages
- [ ] B2  `src/__tests__/utils/validateAIOutput.test.ts`
      - Blocks markdown, forbidden topics
      - Valid output passes
- [ ] B3  `src/__tests__/utils/buildSecurePrompt.test.ts`
      - System prompt constructed correctly
      - Context (business info, client notes) injected properly
- [ ] B4  `src/__tests__/api/import.test.ts`
      - Row validation: empty name, invalid phone, valid rows
      - Duplicate detection logic

### Phase C — API Tests (Playwright APIRequestContext)

- [ ] C1  `e2e/flows/F9-security.spec.ts`
      - Webhook blocked without secret (F9.1)
      - Injection attempt classified + logged (F9.2)
      - Escalation keyword triggers sensitif (F9.3)
- [ ] C2  `e2e/flows/F10-feedback.spec.ts`
      - Correction recorded when draft edited (F10.1)
- [ ] C3  `e2e/flows/F12-importer.spec.ts`
      - Valid rows imported (F12.1)
      - Duplicate detection (F12.2)
      - Invalid rows rejected (F12.3)
- [ ] C4  `e2e/flows/F16-auth-boundaries.spec.ts`
      - Cannot send messages without auth (F16.1)
      - Cannot import without auth (F16.2)
      - Import scoped to auth user (F16.3)

### Phase D — E2E Browser Tests (Playwright)

- [ ] D1  `e2e/flows/F1-auth.spec.ts` — Register, login, protected redirect
- [ ] D2  `e2e/flows/F6-clients.spec.ts` — Add, duplicate, AI notes
- [ ] D3  `e2e/flows/F7-orders.spec.ts` — Order + payments + appointments + scheduled msgs
- [ ] D4  `e2e/flows/F14-templates.spec.ts` — View, edit, persist, validation
- [ ] D5  `e2e/flows/F3-brand-voice.spec.ts` — Upload chat export, analyze, save
- [ ] D6  `e2e/flows/F4-business-knowledge.spec.ts` — Text + PDF extraction
- [ ] D7  `e2e/flows/F5-escalation.spec.ts` — Keywords, auto-reply levels
- [ ] D8  `e2e/flows/F8-inbox.spec.ts` — Receive message, AI draft, send, realtime
- [ ] D9  `e2e/flows/F11-notifications.spec.ts` — Bell badge, popover, clear
- [ ] D10 `e2e/flows/F13-onboarding.spec.ts` — Card state, deep links
- [ ] D11 `e2e/flows/F15-message-history.spec.ts` — Tab, styling, badges

---

## Key Technical Decisions

### Auth Session Handling
`global-setup.ts` registers a test user via API + logs in via browser, then saves cookies to `e2e/.auth/user.json`. All browser tests use Playwright's `storageState` to start authenticated.

### OpenRouter Mocking
AI responses are non-deterministic. Playwright route interception makes tests predictable:

```ts
await page.route('**/api/chat/completions', async route => {
  await route.fulfill({ json: mockAIResponse });
});
```

### Supabase via MCP for DB Assertions
Instead of raw SQL queries, use Supabase MCP to run assertions:
- Check `scheduled_messages` after order creation (F7.2)
- Verify `classification` + `status` in `inbox_messages` (F9.2)
- Read `ai_feedback` entries (F10.1)
- Confirm `user_id` scoping (F16.3)

### Flows Requiring Specific Setup
| Flow | Setup Needed |
|------|-------------|
| F2 (QR scan) | Manual — skip in CI |
| F3 (brand voice) | Needs a `.txt` WhatsApp export fixture file |
| F4 (PDF) | Needs a PDF fixture file |
| F8 (inbox realtime) | Needs rostra-wa service running (or mock at API level) |

---

## Mapping: test-plan.md → Test Files

| Plan Flow | Test File | Type | Lines (est.) |
|-----------|-----------|------|-------------|
| F1.1–F1.4 | `F1-auth.spec.ts` | Browser | ~60 |
| F2.1–F2.2 | — Manual — | — | — |
| F3.1–F3.2 | `F3-brand-voice.spec.ts` | Browser | ~70 |
| F4.1–F4.2 | `F4-business-knowledge.spec.ts` | Browser | ~60 |
| F5.1–F5.3 | `F5-escalation.spec.ts` | Browser | ~50 |
| F6.1–F6.3 | `F6-clients.spec.ts` | Browser | ~70 |
| F7.1–F7.3 | `F7-orders.spec.ts` | Browser | ~90 |
| F8.1–F8.4 | `F8-inbox.spec.ts` | Browser | ~80 |
| F9.1–F9.3 | `F9-security.spec.ts` | API | ~60 |
| F10.1 | `F10-feedback.spec.ts` | API + DB | ~50 |
| F11.1–F11.3 | `F11-notifications.spec.ts` | Browser | ~40 |
| F12.1–F12.4 | `F12-importer.spec.ts` | API + Browser | ~80 |
| F13.1–F13.2 | `F13-onboarding.spec.ts` | Browser | ~50 |
| F14.1–F14.2 | `F14-templates.spec.ts` | Browser | ~50 |
| F15.1 | `F15-message-history.spec.ts` | Browser | ~30 |
| F16.1–F16.3 | `F16-auth-boundaries.spec.ts` | API | ~30 |

---

## Effort Estimate

| Phase | Items | Est. Sessions |
|-------|-------|--------------|
| A — Scaffolding | A1–A9 | 1–2 |
| B — Unit Tests | B1–B4 | 1 |
| C — API Tests | C1–C4 | 1 |
| D — E2E Browser | D1–D11 | 3–4 |
| **Total** | **28 checkpoints** | **6–8 sessions** |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| AI responses non-deterministic | Mock OpenRouter at network layer via `page.route` |
| Supabase test DB state pollution | Per-test cleanup, isolated test user, global teardown |
| WhatsApp QR (F2) can't be automated | Mark as manual skip; test inbox via direct webhook |
| rostra-wa not running in CI | Mock webhook endpoint; test inbox at API level only |
| Flaky Playwright tests | Auto-wait, 30s timeout, 2 retries, trace on failure |
