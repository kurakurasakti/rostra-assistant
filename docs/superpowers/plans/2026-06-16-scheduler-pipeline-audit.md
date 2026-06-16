# Scheduler Pipeline Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify that the `scheduled_messages` pipeline (creation → Edge Function → WA send) is healthy in production before building any calendar UI on top of it.

**Architecture:** Run diagnostic SQL via Supabase MCP, interpret results against defined health thresholds, then apply targeted fixes if the pipeline is broken. Two branches: healthy → calendar UI is safe to build; broken → fix root cause first.

**Tech Stack:** Supabase SQL Editor (or MCP `execute_sql`), Edge Function logs via `get_logs`, `scheduled_messages` table (status enum: `menunggu`/`terkirim`/`gagal`/`dibatalkan`)

---

## File Structure

No files created or modified. This is a read-only audit with conditional SQL fixes applied directly in Supabase.

---

## Task 1: Count scheduled_messages by status (last 30 days)

**Files:**
- No file changes — run directly in Supabase SQL Editor or via MCP `execute_sql`

- [ ] **Step 1: Run status breakdown query**

Run in Supabase SQL Editor (Dashboard → SQL Editor → New Query):

```sql
SELECT
  status,
  COUNT(*)                                         AS count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS pct
FROM scheduled_messages
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY status
ORDER BY count DESC;
```

Expected columns: `status | count | pct`

Record results. A healthy pipeline looks like:
- `terkirim` ≥ 70% of total
- `gagal` ≤ 20% of total
- `menunggu` ≤ 10% of total (older pending = scheduler not firing)

- [ ] **Step 2: Check total volume**

```sql
SELECT COUNT(*) AS total_30d
FROM scheduled_messages
WHERE created_at >= NOW() - INTERVAL '30 days';
```

If `total_30d = 0`: no orders have been saved in 30 days, or `generateScheduledMessages` is never called. This is a creation failure, not a send failure — see Task 3.

- [ ] **Step 3: Check for stale pending messages**

```sql
SELECT COUNT(*) AS overdue_pending
FROM scheduled_messages
WHERE status = 'menunggu'
  AND scheduled_at < NOW() - INTERVAL '30 minutes';
```

`overdue_pending > 0` means Edge Function is not firing or is failing silently. Threshold: > 5 overdue = scheduler broken. Proceed to Task 4.

---

## Task 2: Analyze failure modes

- [ ] **Step 1: Get top error messages**

```sql
SELECT
  error_message,
  COUNT(*) AS occurrences
FROM scheduled_messages
WHERE status = 'gagal'
  AND created_at >= NOW() - INTERVAL '30 days'
  AND error_message IS NOT NULL
GROUP BY error_message
ORDER BY occurrences DESC
LIMIT 10;
```

Map results to root cause:

| error_message pattern | Root cause |
|---|---|
| `WA not connected` | User's WhatsApp session disconnected — not a bug, expected |
| `WA error 4xx: ...` | WA service rejecting send — check rostra-wa logs |
| `WA error 5xx: ...` | rostra-wa crashed or unreachable |
| `fetch failed` / `ECONNREFUSED` | `WA_SERVICE_URL` wrong or rostra-wa is down |
| `WA error 401` | Auth token expired between Edge Function and rostra-wa |

- [ ] **Step 2: Check Edge Function logs**

Via Supabase MCP `get_logs` or Dashboard → Edge Functions → `send-scheduled-messages` → Logs.

Look for:
- `[scheduler] fetch error:` — DB query failing
- `[scheduler] unhandled error:` — uncaught exception
- Absence of any logs → pg_cron not triggering the function

- [ ] **Step 3: Verify pg_cron is scheduled**

```sql
SELECT jobname, schedule, active, jobid
FROM cron.job
WHERE jobname ILIKE '%scheduled%'
   OR command ILIKE '%send-scheduled%';
```

If no rows returned: pg_cron job was never created or was dropped. See Task 5.

---

## Task 3: Fix — scheduled_messages not being created (zero records)

Only run this task if Task 1 Step 2 returned `total_30d = 0` AND orders exist in the last 30 days.

- [ ] **Step 1: Verify orders exist**

```sql
SELECT COUNT(*) AS orders_30d
FROM orders
WHERE created_at >= NOW() - INTERVAL '30 days';
```

If `orders_30d = 0`: no orders exist. Pipeline is fine — just no data. **Stop. Pipeline is healthy. Calendar UI is safe to build.**

If `orders_30d > 0` but `total_30d = 0`: `generateScheduledMessages` is being called but returning empty arrays, or `POST /api/schedules/generate` is never called after order save.

- [ ] **Step 2: Check that order save calls the schedule generate endpoint**

Grep for the schedule generate call in the orders UI:

```bash
grep -r "schedules/generate" /Users/roytjandra/Documents/Rostra/rostra-assistant/app --include="*.tsx" --include="*.ts" -l
```

If no results: the frontend never calls `POST /api/schedules/generate` after saving an order. Wire it in wherever orders are created/updated.

- [ ] **Step 3: Commit if code changed**

```bash
git add <changed files>
git commit -m "fix: call schedules/generate after order save"
```

---

## Task 4: Fix — Edge Function not firing (stale pending messages)

Only run if Task 1 Step 3 returned `overdue_pending > 5`.

- [ ] **Step 1: Check if pg_cron job exists (rerun query from Task 2 Step 3)**

```sql
SELECT jobname, schedule, active, jobid
FROM cron.job
WHERE jobname ILIKE '%scheduled%'
   OR command ILIKE '%send-scheduled%';
```

- [ ] **Step 2a: If no rows — recreate pg_cron job**

```sql
SELECT cron.schedule(
  'send-scheduled-messages',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/send-scheduled-messages',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);
```

Verify it appears in `cron.job` after running.

- [ ] **Step 2b: If job exists but `active = false` — re-enable it**

```sql
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'send-scheduled-messages'),
  active := true
);
```

- [ ] **Step 3: Wait 10 minutes, then recheck overdue count**

```sql
SELECT COUNT(*) AS overdue_pending
FROM scheduled_messages
WHERE status = 'menunggu'
  AND scheduled_at < NOW() - INTERVAL '30 minutes';
```

Expect count to drop. If still high → Edge Function itself is erroring. Check logs again (Task 2 Step 2).

---

## Task 5: Fix — High WA send failure rate (non-"WA not connected" errors)

Only run if Task 2 Step 1 shows `WA error` or `fetch failed` patterns dominating failures.

- [ ] **Step 1: Verify WA_SERVICE_URL is set in Edge Function env**

In Supabase Dashboard → Edge Functions → `send-scheduled-messages` → Settings → Environment Variables.

Confirm `WA_SERVICE_URL` is set and matches the production rostra-wa URL (no trailing slash).

- [ ] **Step 2: Test WA service reachability manually**

```bash
curl -X POST "${WA_SERVICE_URL}/session/<your-user-id>/send" \
  -H "Content-Type: application/json" \
  -d '{"to": "6281234567890", "message": "test"}' \
  -v
```

If connection refused or timeout: rostra-wa is down. Restart the service on Railway/deployment platform.

If 401: check auth token between Edge Function and rostra-wa. The Edge Function at `supabase/functions/send-scheduled-messages/index.ts` does not send an `Authorization` header to rostra-wa — if rostra-wa added auth requirements, add the header.

- [ ] **Step 3: After fix, manually trigger Edge Function once**

Via Supabase Dashboard → Edge Functions → `send-scheduled-messages` → Invoke, or:

```bash
curl -X POST "${SUPABASE_URL}/functions/v1/send-scheduled-messages" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Verify response: `{ "processed": N, "sent": N, "failed": 0, "skipped": M }`

---

## Health Gate Decision

After completing Tasks 1–2 (and any applicable fix tasks), make the final call:

| Condition | Decision |
|---|---|
| `terkirim` ≥ 70%, `overdue_pending` = 0, pg_cron active | **HEALTHY. Safe to build calendar UI.** |
| All failures are `WA not connected` (users just haven't connected WA) | **HEALTHY. Expected behavior. Safe to build calendar UI.** |
| `overdue_pending > 5` OR `fetch failed` errors dominating | **BROKEN. Fix scheduler before touching UI.** |
| `total_30d = 0` AND `orders_30d > 0` | **BROKEN. Schedule generation not wired up.** |
