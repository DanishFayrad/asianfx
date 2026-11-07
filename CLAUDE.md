# AsianFX — instructions for Claude

AsianFX is a trading-signals site (asianfxsignals.com). Members deposit USDT, pay $1 per signal to
unlock Entry / TP / SL, and admins broadcast signals and approve deposits.

## How to work with the owner
- Reply in **Roman Urdu** (simple words), with short steps and tables. The owner is not a developer:
  say exactly which button / page / field to use.
- **Only make the change that was asked.** No extra features, refactors or redesigns (never redesign
  the navbar unprompted). Ask before anything beyond the request.
- **Commit / push only when the owner asks.** Branch is `master`; pushing deploys to Vercel.
- **Never print secrets** from `.env` (keys, passwords, tokens). Check them by name/length only.
- After code changes run `npx tsc --noEmit -p .` (and `npx eslint <file>` for touched files).
- Be honest about what was and was not tested (browser, live DB, real emails).

## Two Supabase projects — keep them apart
| | Project | Used by |
|---|---|---|
| Live | `asianfx-signal-provide-site` (ref `bnxzxlhmzenyotsbmevc`) | asianfxsignals.com / Vercel |
| Local | `asianfx-local-site` (ref `igyfytgheuklxwfalwmk`) | `localhost:3000` / `.env` |

- `.env` must point to the **local** project. Never copy Vercel's Supabase vars into `.env`
  (local testing would then reach real members).
- Claude has **no access to the live database**. Give the owner SQL to run in the Supabase SQL Editor.
- Every auth/email setting (SMTP, Confirm email, OTP length = 6, expiry = 120s) must be set in **both** projects.

## Database changes (very sensitive — real members' data)
- `supabase/schema.sql` is the full blueprint. **Never run it on live**: its last line sets every
  influencer's commission to 10%.
- Every DB change goes in a new `supabase/migrate_<name>.sql` (safe to re-run) **and** in `schema.sql`.
  The owner runs the migrate file on live and local.
- **Never put DELETE / destructive SQL in a migration** without telling the owner first. Give a
  read-only preview query (counts + sample rows) and wait for a yes before anything that deletes or
  overwrites data. (A clean-up step once removed 84 live member profiles — they were restored with
  `restore_missing_members.sql`.)
- Before code that needs a new column/function is pushed, the matching migration must already be run
  on live, or the live site breaks.

## Key facts
- Stack: Next.js 16 (App Router), React, TanStack Query/Table, Supabase (auth, RPCs, RLS, realtime,
  pg_cron), deployed on Vercel.
- Members are created by the `handle_new_user` trigger **only after email verification**
  (`email_confirmed_at` set). With "Confirm email" OFF they are created at sign-up.
- Register → OTP page (6 digits) when Confirm email is ON; straight to dashboard when OFF.
- Member delete is a **soft delete** (`profiles.deleted_at`, login banned) → "Deleted" tab with
  Restore and "Delete permanently" (only for already-deleted members).
- Signal audience: deposited / not_deposited / all. Stop Loss refunds the $1 fee. "Early TP Hit"
  counts as a win (any status containing "hit").
- Deposits need a 12-digit `tx_id`; admin can reject with a reason (pushed to the member).
- Emails: Supabase auth emails use the SMTP set in the Supabase dashboard; app emails
  (signal, coming soon, contact) use `src/lib/mailer.ts` (nodemailer SMTP, env `SMTP_*`, `MAIL_*`).
  Current provider: **Resend** (`smtp.resend.com`, port 465, user `resend`, sender
  `noreply@send.asianfxsignals.com`). Domain DNS is on Hostinger.
- Web push: `public/sw.js`, `/api/notify-push`, `/api/push-member`, VAPID env vars.
- Admin API routes act as the calling admin (anon key + bearer token); `/api/admin-users` uses the
  service-role key.
