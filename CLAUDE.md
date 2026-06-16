# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: Rostra Assistant

WhatsApp CRM + AI auto-reply for Indonesian SMBs (fashion/tailoring niche). Multi-tenant SaaS. One business owner = one Supabase user = one WA device.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Supabase (auth + DB + realtime) · rostra-wa (WhatsApp via Baileys) · OpenRouter (AI, default model: `google/gemini-flash-1.5`)

**Note:** This repo is the Next.js frontend only. WhatsApp socket layer (Baileys) lives in a separate repo (`rostra-wa`). This service communicates with `rostra-wa` via REST API (`WA_SERVICE_URL`).

---

## Commands

```bash
pnpm dev        # dev server
pnpm build      # production build
pnpm lint       # ESLint
```

Webhook local testing: `ngrok` is a devDependency — run `npx ngrok http 3000` to expose `/api/webhook/whatsapp`.

---

## Architecture

### Supabase

- `lib/supabase/client.ts` — browser client (use in client components)
- `lib/supabase/server.ts` — server client using cookies (use in Route Handlers + Server Components)
- All tables have RLS enabled. Every query must be scoped to `auth.uid()`.
- Multi-tenant: `profiles.wa_device_id` maps incoming webhooks to a user.

### AI Pipeline (`lib/openrouter.ts`)

Message flow: webhook → `scanForInjection` → insert DB → `classifyAndDraft` (fire-and-forget)

`classifyAndDraft` does:
1. `classifyMessage()` → rutin / sensitif / tidak_diketahui
2. Check `profile.escalation_keywords` — override to sensitif if hit
3. If rutin: `buildSecurePrompt()` + `draftReply()` + `validateAIOutput()`
4. Update `inbox_messages` with classification + ai_draft_reply

**Always use `buildSecurePrompt()`** for AI draft generation — never raw brand_voice as system prompt. It injects anti-injection boundaries, business context, client AI notes, and order summary.

Business context priority: if `profile.business_knowledge_raw` + `profile.business_knowledge_structured` exist → use `formatBusinessContextForAI()` (hybrid). Fallback to legacy `product_knowledge` JSON array.

### Security (`lib/security.ts`)

Two functions always run in tandem:
- `scanForInjection(message)` — runs on every inbound webhook message BEFORE DB insert
- `validateAIOutput(response)` — runs on every AI draft BEFORE returning to frontend

Injection attempts are inserted with `classification = 'injection_attempt'` and `status = 'dieskalasi'` — never processed further.

### WhatsApp (`lib/whatsapp.ts`)

Talks to `rostra-wa` REST API (`WA_SERVICE_URL`). `normalizeWANumber()` handles Indonesian format variants (`08x`, `8x`, `62x`) and Excel scientific notation.

Webhook at `POST /api/webhook/whatsapp` receives events from `rostra-wa` — must return 200 immediately, heavy processing is fire-and-forget via `processIncomingMessage()`.

### Scheduler (`lib/scheduler.ts`)

`generateScheduledMessages()` creates 3 types of reminders on order save:
- `konfirmasi_pesanan` — now + 5 min
- `pengingat_pembayaran` — per payment stage, `reminder_days_before` days before due at 09:00 WIB
- `pengingat_janji_temu` — `reminder_hours_before` before appointment

All times calculated in `Asia/Jakarta` (WIB). Scheduler Edge Function (Phase 3) polls `scheduled_messages` every 5 min via pg_cron.

### Business Knowledge (`lib/business-knowledge.ts`)

`extractBusinessKnowledge()` in openrouter.ts calls AI on free-text input, returns `BusinessKnowledgeStructured` JSON. Stored as both `business_knowledge_raw` (text) and `business_knowledge_structured` (jsonb) in profiles.

---

## Route Handlers (app/api)

| Route | Purpose |
|---|---|
| `POST /api/webhook/whatsapp` | rostra-wa webhook — immediate 200, async process |
| `POST /api/messages/draft` | Generate AI draft for existing inbox message |
| `POST /api/messages/send` | Send via rostra-wa + save outgoing + feedback loop |
| `POST /api/classify` | Standalone message classification |
| `POST /api/whatsapp/connect` | Register device on rostra-wa + return QR |
| `GET /api/whatsapp/status` | Poll device connection status from rostra-wa |
| `POST /api/settings/analyze-chat` | Parse WhatsApp .txt export, return senders |
| `POST /api/settings/analyze-voice` | AI analyze chat messages → brand_voice string |
| `POST /api/settings/extract-business` | AI extract business knowledge from free text |
| `POST /api/settings/save-business` | Save raw + structured business knowledge |
| `POST /api/schedules/generate` | Regenerate scheduled_messages for an order |

---

## Key Types (`types/index.ts`)

`Profile` — business owner settings (brand_voice, business_knowledge_*, escalation_keywords, auto_reply_level, feedback_count, wa_device_*)

`MessageClassification` — `'rutin' | 'sensitif' | 'tidak_diketahui' | 'injection_attempt'`

`AutoReplyLevel` — `1 | 2 | 3` (1=Draft Mode, 2=Semi-Auto after 50 corrections, 3=Full Auto after 200)

---

## Build Phase Status

See `PHASES.md` for full checklist. Summary:

- **Phase 0** ✅ Scaffold, auth, Supabase setup
- **Phase 1A** ✅ WhatsApp connect via rostra-wa QR
- **Phase 1B** ✅ Brand voice analysis from chat export
- **Phase 1C** ✅ Business Knowledge settings UI
- **Phase 1D** ✅ Escalation Rules settings UI
- **Phase 1E** ✅ Client AI notes field
- **Phase 1F** ✅ Client + order management
- **Phase 2A** ✅ Inbox + realtime + AI draft panel
- **Phase 2B** ✅ Security layer (security.ts, webhook scan, output validation)
- **Phase 2C** ✅ Feedback loop (ai_feedback table, correction tracking)
- **Phase 3** ✅ Scheduler Edge Function (pg_cron every 5 min)
- **Phase 4** ✅ Excel/CSV importer (heuristic mapping, dedup, bulk insert)
- **Phase 5** ⬜ Dashboard polish, template editor, auto-reply L2, deploy

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENROUTER_API_KEY
OPENROUTER_MODEL          # default: google/gemini-flash-1.5
WA_SERVICE_URL            # rostra-wa service base URL (e.g. https://wa.rostra.app)
WEBHOOK_SECRET
NEXT_PUBLIC_APP_URL
INVITE_CODE               # controls registration
```

### Supabase Email Redirect Configuration

Email verification links need to redirect to `/auth/callback`. Configure in Supabase Dashboard:

1. Go to Authentication → Email Templates
2. In both "Confirm signup" and other email templates, find the redirect URL
3. Ensure it points to: `{{ .ConfirmationURL }}`
4. The system will automatically append `?code=...` to `{NEXT_PUBLIC_APP_URL}/auth/callback`
5. Alternatively, manually set to: `{NEXT_PUBLIC_APP_URL}/auth/callback`

Webhook URL for rostra-wa (production): `https://rostra.vercel.app/api/webhook/whatsapp`
