# Property Management Ops

Residential property management POC — Slice 1 (Portfolio + Leases).

Spec: `docs/superpowers/specs/2026-04-15-portfolio-leases-design.md`
Plan: `docs/superpowers/plans/2026-04-15-portfolio-leases.md`

## Stack

Next.js 16 · Prisma 7 · Neon Postgres · NextAuth v5 · Vercel Blob · Tailwind · shadcn/ui

## Setup

```bash
cp .env.example .env.local
# Fill DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, BLOB_READ_WRITE_TOKEN

npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000 and log in with:

| Email | Password | Role |
|---|---|---|
| admin@acme.test | demo1234 | ADMIN |
| pm@acme.test | demo1234 | PROPERTY_MANAGER |
| finance@acme.test | demo1234 | FINANCE |
| tenant@acme.test | demo1234 | TENANT |

## What Slice 1 covers

- Properties → Units → Tenants → Leases (with joint leases)
- Lease lifecycle: draft → activate → terminate / renew
- Derived lease status (ACTIVE / EXPIRING / EXPIRED etc.) and unit occupancy (VACANT / OCCUPIED / UPCOMING / CONFLICT)
- Lease agreement uploads via Vercel Blob
- Direct admin-created staff accounts (no email invite flow)
- Dashboard with counts + expiring-soon list

## What Slice 1 does NOT cover

Stripe, invoices, arrears, tenant self-service, maintenance tickets, reminders/notifications, email invites, automated tests. See the spec for each slice's scope.
