# Property Management Ops

Multi-tenant SaaS for South African residential rentals. Landlords / property managers run a portfolio; tenants self-serve rent, maintenance, invoices, and lease signing from a separate portal.

## Stack

Next.js 16 (App Router) · React 19 · Prisma 7 · Neon Postgres · NextAuth v5 (JWT + credentials) · Vercel Blob · Resend · Tailwind 4 + shadcn/ui · Zod 4

## Setup

```bash
cp .env.example .env.local
# Fill DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, BLOB_READ_WRITE_TOKEN
# Optional: RESEND_API_KEY, EMAIL_FROM, EMAIL_REPLY_TO

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
`/tenants/onboard` creates a tenant, assigns them to a unit with a draft lease, and provisions a portal login — all in one submit. If `RESEND_API_KEY` is set, the tenant receives an invite email with their login details; otherwise the PM sees a one-time temp password in the UI to share manually.

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

### Transactional email (Resend)
Optional outbound email via Resend's free tier (3000/mo). Set `RESEND_API_KEY`, verify a domain, and set `EMAIL_FROM` (e.g. `"PMOps <noreply@yourdomain.co.za>"`). Add `EMAIL_REPLY_TO` to route replies to a real inbox. Email failures degrade gracefully — the PM still sees the temp password in the UI.

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
