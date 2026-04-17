# Property Management Ops

Multi-tenant SaaS for South African residential rentals. Landlords / property managers run a portfolio; tenants self-serve rent, maintenance, invoices, and lease signing from a separate portal.

## Stack

Next.js 16 (App Router) · React 19 · Prisma 7 · Neon Postgres · NextAuth v5 (JWT + credentials) · Vercel Blob · Nodemailer (Gmail SMTP) · Tailwind 4 + shadcn/ui · Zod 4

## Setup

```bash
cp .env.example .env.local
# Fill DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, BLOB_READ_WRITE_TOKEN
# Optional: GMAIL_USER, GMAIL_APP_PASSWORD, EMAIL_FROM_NAME, EMAIL_REPLY_TO

npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000 and log in:

| Email | Password | Role |
|---|---|---|
| admin@acme.test | demo1234 | ADMIN |
| pm@acme.test | demo1234 | PROPERTY_MANAGER |
| finance@acme.test | demo1234 | FINANCE |
| tenant@acme.test | demo1234 | TENANT (active lease) |
| tenant2@acme.test | demo1234 | TENANT (pending signature demo) |

## Features

### Portfolio management (staff)
- Properties → Units → Tenants → Leases (including joint leases)
- Lease lifecycle: draft → activate → terminate / renew
- Derived status (ACTIVE / EXPIRING / EXPIRED / TERMINATED / RENEWED / DRAFT) and unit occupancy (VACANT / OCCUPIED / UPCOMING / CONFLICT)
- Dashboard with counts, expiring-soon list, and one-click renew
- Lease document uploads via Vercel Blob (PDF/PNG/JPEG/WebP, 20 MB max)
- Team management and org settings for admins

### Tenant onboarding wizard
`/tenants/onboard` creates a tenant, assigns them to a unit with a draft lease, and provisions a portal login — all in one submit. If Gmail SMTP is configured (`GMAIL_USER` + `GMAIL_APP_PASSWORD`), the tenant receives an invite email with their login details; otherwise the PM sees a one-time temp password in the UI to share manually.

### Generated lease agreement
`lib/lease-template.ts` renders a 15-section generic South African residential lease from stored data (rent, deposit, address, pets clause, governing law, etc.). Tenants read the full agreement inline in their portal — no PDF required. Uploaded lease PDFs still display for backwards compatibility.

### DocuSign-style signing (tenant portal)
Tenants review the agreement, capture their location (optional, for the audit trail), type their full legal name as a signature, and confirm agreement. The system records IP, user agent, geolocation, signed name, and timestamp against the lease.

### Clause review requests
If a tenant disagrees with a clause (e.g. pets), they can submit a review request with the exact clause excerpt and their note. The PM sees it on the lease detail page and can respond with accept / reject / resolve and a written response. Threaded discussion visible to both sides.

### Rent invoices
`ensureInvoicesForLease()` idempotently generates monthly invoices from lease start to current+1 month. Past months seed as PAID, current/future as DUE. Tenants see next-due, upcoming, paid history, and total paid-to-date. Staff can mark invoices paid / unpay with optional notes.

### Maintenance tickets
Tenants submit repair requests with priority and description. Staff triage on `/maintenance`: update status (OPEN → IN_PROGRESS → RESOLVED → CLOSED), change priority, add internal notes. Auto-stamps `resolvedAt` when resolved.

### Transactional email (Gmail SMTP)
Optional outbound email via Gmail SMTP using [nodemailer](https://nodemailer.com/). No domain required — sends to any recipient from your Gmail address, roughly 500 msgs/day on free personal accounts.

**Setup (~2 minutes):**
1. Enable [2-Step Verification](https://myaccount.google.com/security) on the Gmail account you want to send from.
2. Generate an [App Password](https://myaccount.google.com/apppasswords) (select "Mail" → "Other" → name it "PMOps"). Google shows a 16-character password once.
3. Set in `.env.local`:
   ```
   GMAIL_USER="you@gmail.com"
   GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"
   EMAIL_FROM_NAME="PMOps"              # display name in From header
   EMAIL_REPLY_TO=""                     # leave blank for no-reply; else e.g. "Support <support@yourdomain.co.za>"
   ```
4. Restart `npm run dev`.

From header renders as `"PMOps" <you@gmail.com>`. Override with `EMAIL_FROM` if you need a fully custom value. Email failures degrade gracefully — the PM still sees the temp password in the UI.

### SMS invites (Android phone as gateway)
Optional SMS invites use an Android phone as a zero-cost gateway via [SMS Gateway for Android](https://sms-gate.app) (Apache-2.0). Your Gmail SMTP already sends emails — SMS is additive for tenants who prefer text.

**Setup (~3 minutes):**
1. Install the [SMS Gateway APK](https://github.com/capcom6/android-sms-gateway/releases/latest/download/app-release.apk) on an Android phone (v5+). It's not on the Play Store — sideload the APK from [github.com/capcom6/android-sms-gateway](https://github.com/capcom6/android-sms-gateway) (enable "Install unknown apps" for your browser). Grant SMS send permissions on first launch.
2. In the app, toggle **Cloud Server** on, tap **Online**.
3. Copy the displayed username/password into `.env.local`:
   ```
   SMS_GATEWAY_USER="..."
   SMS_GATEWAY_PASSWORD="..."
   ```
4. Keep the phone on a charger, WiFi on, app running.
5. On the onboarding form, tick "Also send SMS invite" (only fires if the phone number field is filled).

SA local numbers (`0821234567`) are normalized to E.164 (`+27821234567`) automatically.

**SMS notifications sent automatically** (when `OPS_SMS_RECIPIENTS` and/or tenant phone present):

| Event | Recipient | Contents |
|---|---|---|
| Tenant onboarded | Tenant | Login URL + temp password |
| Maintenance ticket created | Tenant | Confirmation |
| Maintenance ticket created | Ops (OPS_SMS_RECIPIENTS) | New ticket alert with priority, tenant, unit |
| Maintenance status changed | Tenant | New status (IN_PROGRESS / RESOLVED / etc) |
| Lease signed | Ops | Alert to activate the lease |
| Clause review flagged | Ops | Alert with clause excerpt |
| Clause review responded | Tenant | Status (accepted / rejected / resolved) |
| Invoice marked paid | Tenant | Payment confirmation with amount + period |

To enable PM-side alerts, set `OPS_SMS_RECIPIENTS="+27821234567,+27839876543"` in Vercel env (or `.env.local`).

> **POPIA note:** cloud mode routes recipient numbers through sms-gate.app's server. For production, either (a) disclose in the privacy policy and obtain consent, or (b) run the app in Local Server mode behind a tunnel (Cloudflare Tunnel) and point `SMS_GATEWAY_URL` at it. End-to-end encryption is available in the app settings.

> **Carrier note:** SMSes bill to your phone's plan at standard rates. SA consumer SIMs may be throttled or flagged for bulk sending — this is suitable for low-volume demo/transactional use, not marketing.

## Project conventions

- **Currency:** integer cents, formatted via `formatZar()` from `lib/format.ts`
- **Soft deletes:** Properties use `deletedAt`, Tenants use `archivedAt`
- **Auth:** JWT strategy (no DB sessions); custom fields (role, orgId) added via NextAuth callbacks. All API routes use `withOrg()` from `lib/auth/with-org.ts`
- **Errors:** `ApiError` class → `toErrorResponse()`
- **Region:** South Africa (ZAR, SA provinces, Rental Housing Act references in lease template)

## Documentation

- `CODEBASE.md` — source-of-truth manifest of every file, export, env var, API endpoint, and model. Read this before editing anything.
- `CLAUDE.md` — LLM instructions for working in this repo (manifest-first rule, conventions).

## Deployment

Pushes to `master` auto-deploy to Vercel. Environment variables live in the Vercel project settings — the shared Neon database is used for both preview and production. Migrations are applied via `prisma migrate deploy` during build (run manually for prod schema changes against the live DB).
