# Google Calendar Integration — Design Spec

**Date:** 2026-06-08
**Status:** Approved (brainstorm), pending implementation plan

## 1. Overview & Scope

**Goal:** Business owner connects their Google Calendar once (Settings, owner-level — one Google account per Rostra user, mirrors the existing WhatsApp connect pattern). The AI then negotiates meeting/appointment times with clients directly in chat — checks the owner's real availability, drafts natural-sounding confirmations (subject to the existing draft → owner-approve → send flow), and on send creates an `appointments` row plus a Google Calendar event. A standalone calendar page gives the owner a merged view and manual booking.

### In scope
- Google OAuth connect/disconnect (Settings page, owner-level, single Google account)
- Read + write sync with the owner's **primary** Google Calendar (catches personal events too; Rostra-originated events written there as well — single source of truth)
- Conversational booking flow: AI asks the client's preference first, checks availability, confirms or offers the 1-2 closest alternatives — never dumps a list of slots (feels human, not robotic)
- New `booking_intents` state to track multi-turn negotiation across messages
- Standalone `/calendar` page: merged view (Google events read-only + Rostra appointments editable) + manual create/edit/cancel
- Settings additions: default meeting duration, structured booking-hours override (open/close + optional break + active days)
- Standalone appointments — not required to be tied to an order (many meetings happen pre-sale, e.g. consultations)

### Out of scope (future)
- Other calendar providers (Outlook, etc.)
- Per-client calendars — rejected: client-side availability is captured through the conversation itself ("kapan waktu yang pas, kak?"), not via the client connecting their own Google account. Indonesian SMB customers won't go through OAuth via WhatsApp chat — too much friction, and the ask-first design already solves the actual problem (not knowing when the client is free).
- Auto-booking without owner approval — AI only drafts; owner's send is what commits the booking
- Cleanup of synced Google events on disconnect — disconnecting stops syncing but leaves existing Rostra data and calendar events untouched (no surprise deletions)

## 2. Data Model Changes

### `profiles` additions
```sql
alter table profiles
  add column google_calendar_connected boolean not null default false,
  add column google_calendar_email text,
  add column appointment_default_duration_minutes int not null default 60,
  add column booking_hours_start time,
  add column booking_hours_end time,
  add column booking_break_start time,   -- null = no break
  add column booking_break_end time,
  add column booking_active_days int[] not null default '{1,2,3,4,5,6}'; -- 1=Mon..7=Sun
```
The existing free-text `operating_hours` column is untouched — it keeps feeding AI prompt context and Settings display copy. The structured fields above exist *only* for slot-availability math (resolves the "lunch break varies per owner and isn't reliably stated in free text" gap raised during brainstorming).

### New `calendar_connections` table (sensitive — service-role-only RLS, never exposed to the browser)
```sql
create table calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id),
  provider text not null default 'google',
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  calendar_id text not null default 'primary',
  connected_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### New `booking_intents` table (multi-turn negotiation state)
```sql
create table booking_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  client_id uuid references clients(id),       -- nullable: prospects without a client record yet
  whatsapp_number text not null,                -- always present — identifies who we're negotiating with
  status text not null default 'awaiting_preference',
  -- 'awaiting_preference' | 'awaiting_confirmation' | 'confirmed' | 'expired' | 'cancelled'
  requested_window jsonb,   -- AI-extracted { date_range, time_of_day, specific_time }
  proposed_slots jsonb,     -- candidate datetimes offered to the client
  selected_slot timestamptz,
  appointment_id uuid references appointments(id),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```
Enforce **one active intent per `whatsapp_number`** at the application layer — not per `client_id`, since prospects may not have a client record yet (new booking-shaped message while one is open → continue the existing intent or confirm whether to replace it, rather than spawning duplicates). If a client record gets created mid-negotiation (e.g. owner adds them manually), backfill `client_id` onto the open intent.

### `appointments` table changes
```sql
alter table appointments
  alter column order_id drop not null,         -- standalone appointments allowed
  add column google_event_id text;             -- tracks synced event for update/cancel
```

## 3. Google Calendar Connection Flow (OAuth)

- **Settings page**, new "Kalender" section: "Hubungkan Google Calendar" button → Google OAuth consent (scopes: `calendar.events` + `calendar.readonly` on the primary calendar)
- Use **Google Calendar API** (the standard REST API via `googleapis` or direct REST calls) — *not* Google's Calendar MCP server, which is for AI agents connecting directly to a personal calendar via the Model Context Protocol, a different shape entirely than a multi-tenant SaaS backend doing OAuth on behalf of many owners
- Callback route `app/api/calendar/oauth/callback` exchanges the auth code for access + refresh tokens, stores them in `calendar_connections` (service-role write only)
- Status display: connected email + "Putuskan koneksi" button — mirrors the existing WA connect pattern (`app/api/whatsapp/connect`, Settings Section B)
- **Disconnect:** revoke token via Google API, delete the `calendar_connections` row, set `google_calendar_connected = false`. Rostra appointments and already-written Google events are left untouched.
- **Token refresh:** access tokens expire ~1hr; refresh lazily on each calendar API call (check `token_expires_at`, use `refresh_token` if expired, persist the new token). New module `lib/google-calendar.ts` exposes `getValidAccessToken()`, `checkAvailability()`, `createEvent()`, `updateEvent()`, `deleteEvent()`.
- **Token revoked externally** (owner revokes from their Google account, not via Rostra): detected on the next API call returning 401 → mark `google_calendar_connected = false`, surface a reconnect prompt in Settings.

### Setup needed (external, owner-side)
- Google Cloud project with **Google Calendar API** enabled
- OAuth 2.0 Client ID (type: Web application) → `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Registered redirect URI → `GOOGLE_REDIRECT_URI` (exact value finalized once the callback route path is locked during planning)

## 4. Booking Conversation Flow (orchestrator)

New isolated module `lib/calendar-booking.ts` (mirrors how `lib/scheduler.ts` and `lib/business-knowledge.ts` already sit alongside `lib/openrouter.ts` as separate concern modules — chosen over extending `classifyAndDraft` directly, which is already doing a lot, or a full agentic tool-calling rewrite, which would be a much bigger architecture shift for the current plain-completion OpenRouter pipeline).

`classifyAndDraft` delegates to this orchestrator when:
- the message classifies `rutin` with a booking-shaped category (e.g. "mau janji ketemu", "bisa konsultasi kapan"), **or**
- the sender's `whatsapp_number` already has an open `booking_intents` row (continue the negotiation regardless of how this new message classifies — covers prospects without a client record too)

### State machine (`booking_intents.status`)

1. **`awaiting_preference`** — created on first detection. AI drafts something like *"Boleh kak, kapan waktu yang pas buat ketemu?"* — asks rather than suggests, consistent with the existing rule that AI shouldn't proactively propose jadwal/appointment unless the customer brings it up.
2. Client replies with a time → **AI extraction step** (same pattern as `extractBusinessKnowledge`: an AI call that turns fuzzy Indonesian phrasing like "sore-sore aja" / "minggu depan" / "weekday aja" into structured JSON `{ date_range, time_of_day, specific_time }`) → saved as `requested_window`.
3. Orchestrator calls `checkAvailability()` against the owner's primary calendar, cross-referenced with `booking_hours_*` / `booking_break_*` / `booking_active_days` and existing `appointments`:
   - **Match found** → status → `awaiting_confirmation`, draft e.g. *"Selasa jam 14:00 kosong kak, jadi waktunya ya?"*
   - **No match** → search for the 1-2 closest alternatives (same day first, then ±1-2 days — proximity-based, not a fixed top-3 dump), draft e.g. *"Selasa itu udah ada acara, gimana kalau Rabu jam 10:00 atau Kamis jam 14:00?"*; `proposed_slots` saved, status stays `awaiting_confirmation`
   - If the client later changes their mind ("eh ganti hari lain aja") → re-extract and loop back to this step rather than forcing through a stale slot
4. Client confirms → status → `confirmed`, `selected_slot` set, AI drafts the final confirmation message
5. **Owner sends that confirmation draft** → this is the trigger (not a separate manual step) for `finalizeBooking()`: re-checks availability (guards against a race where the slot got booked elsewhere in the meantime — if now conflicted, escalate to the owner instead of double-booking), creates the `appointments` row (`order_id` left null unless an active order context exists), calls `createEvent()` on Google Calendar, persists `google_event_id`, links `booking_intents.appointment_id`
6. **Expiry:** `expires_at` (48h of no reply) → status → `expired`; cleared from active checks but visible to the owner for manual follow-up

### Escalation guardrail
If the AI fails to parse the client's time reply twice, or no slot can be found within roughly ±5 days of the request, escalate to the owner via the existing `dieskalasi` path rather than continuing to guess.

## 5. Calendar Page (`/calendar`) + Settings UI

### Standalone page `/calendar`
- Month/week view, built with shadcn calendar primitives in an agenda/grid layout consistent with the existing dashboard styling
- Merged events: Google Calendar events shown read-only/muted (owner's personal events — informational only), Rostra appointments shown in full color and clickable (opens client/order link, reschedule, cancel)
- "Buat Janji Temu" button opens a form modal reusing the `AppointmentForm` shape (title, datetime, location, reminder, notes, optional client link). On save: creates the `appointments` row, calls `createEvent()` if Google Calendar is connected, persists `google_event_id`
- Reschedule/cancel from this page calls `updateEvent()` / `deleteEvent()` to keep the calendar in sync

### Settings — "Kalender" section (alongside the OAuth connect UI from §3)
- Default meeting duration (minutes) → `appointment_default_duration_minutes`
- Jam booking: open / close time → `booking_hours_start` / `booking_hours_end`
- Jam istirahat (optional, toggle "Tidak ada jam istirahat" to leave null) → `booking_break_start` / `booking_break_end`
- Hari aktif: day-of-week multi-select → `booking_active_days`

These are framed in the UI as "untuk perhitungan jadwal AI" — explicitly distinct from the existing free-text `operating_hours`, which remains the AI's natural-language context/display copy.

## 6. Error Handling, Edge Cases & Testing

### Error handling
- Google API failures (rate limit, token revoked, network): orchestrator falls back gracefully — skip the booking-flow draft, let normal classify→draft handle the message, log the error. Never blocks the inbound webhook's immediate 200 (matches the existing fire-and-forget `processIncomingMessage` pattern)
- Concurrent bookings: handled by the re-check in `finalizeBooking()` (step 5 above)

### Edge cases
- Client goes silent mid-negotiation → 48h `expires_at` auto-expires, no dangling state
- Multiple simultaneous booking attempts per client → one active intent enforced at the application layer
- Standalone appointment later tied to an order → `appointment_id` stays stable; `order_id` can be set after the fact from the order page

### Testing plan
(matches the existing `e2e/flows/F*.spec.ts` pattern and `docs/test-plan.md` conventions)
- **Unit:** slot-finding algorithm (operating hours + breaks + active days + existing appointments → correct free/busy windows); AI extraction step (sample fuzzy Indonesian phrases → expected structured JSON)
- **Integration:** OAuth callback → token storage and refresh; `checkAvailability` / `createEvent` against the Google Calendar API (sandboxed test calendar)
- **E2E:** new `F-calendar.spec.ts` — connect flow → chat negotiation (mocked client messages) → owner approves draft → appointment + event created → visible on `/calendar`
