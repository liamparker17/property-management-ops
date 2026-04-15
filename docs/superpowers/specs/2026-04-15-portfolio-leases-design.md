# Property Management Ops — Slice 1: Portfolio + Leases

**Status:** Draft (awaiting user review)
**Date:** 2026-04-15
**Author:** Liam Parker (w/ Claude)
**Scope:** Slice 1 of 4 in the POC roadmap

---

## 0. Project Context

A residential property management web app for a South African property manager. POC covers the full day-to-day workflow in four sequential slices, each shippable on its own:

1. **Slice 1 — Portfolio + Leases** *(this spec)*
2. **Slice 2 — Billing + Stripe**
3. **Slice 3 — Tenant portal**
4. **Slice 4 — Maintenance + Dashboard + Reminders + Test infrastructure**

Slice 1 proves the core data model by letting staff manage properties, units, tenants, and leases end-to-end. No money, no tickets, no tenant self-service.

This project is independent of `liamparker17/flipmodel`. Flipmodel is a donor: we may copy code directly when it fits, but the product, repo, branding, roadmap, and domain model are independent.

---

## 1. Stack & Layout

Fresh Next.js 16 project. No fork, no monorepo, no parent dependency.

**Stack**

- Next.js 16 (App Router)
- Prisma 7 + `@prisma/adapter-pg`
- Neon Postgres (free tier, with branching for future test DBs)
- NextAuth v5 (credentials provider, bcryptjs, Prisma adapter, JWT sessions)
- Vercel Blob (file storage for lease agreements)
- Zod (boundary validation)
- Sentry (optional in dev, required in prod)
- Tailwind CSS + shadcn/ui (consistent with flipmodel patterns)

**Route groups**

- `app/(marketing)/` — public landing + login
- `app/(staff)/` — authenticated staff area (dashboard, portfolio, leases, settings)
- `app/(tenant)/` — empty shell with middleware guard; populated in Slice 3
- `app/api/` — REST endpoints

**Implicit multi-org.** Every domain model carries `orgId` from day one. No org switcher UI in the POC; `getOrgId(session)` is a single helper so enabling multi-org later is a data migration, not a schema rewrite.

**Donor patterns from flipmodel** (copy freely, adapt to this project):

- NextAuth v5 + Prisma adapter + bcryptjs credentials wiring
- `prisma.config.ts` + `@prisma/adapter-pg` for edge-compatible Prisma
- `proxy.ts` middleware shape
- Sentry `client|edge|server` config layout
- ESLint / Prettier / TS config
- GitHub Actions workflow structure

---

## 2. Data Model

Money stored as `Int` cents (ZAR minor units) to avoid float drift.

### Enums

```prisma
enum Role {
  ADMIN
  PROPERTY_MANAGER
  FINANCE
  TENANT
}

enum LeaseState {
  DRAFT
  ACTIVE
  TERMINATED
  RENEWED
}

enum DocumentKind {
  LEASE_AGREEMENT
  // Grows per slice: PROOF_OF_PAYMENT (S2), MAINTENANCE_PHOTO (S3), etc.
}

enum SAProvince {
  GP WC KZN EC FS LP MP NW NC
}
```

### Models

**`Org`** — `id, name, slug, createdAt`

**`User`** — NextAuth-compatible + `role`, `orgId`, `passwordHash`. Standard NextAuth `Account`, `Session`, `VerificationToken` tables alongside.

**`Property`** — `id, orgId, name, addressLine1, addressLine2?, suburb, city, province (SAProvince), postalCode, notes?, createdAt, updatedAt`

**`Unit`** (canonical lettable entity) — `id, orgId, propertyId, label, bedrooms, bathrooms, sizeSqm?, notes?, createdAt, updatedAt`. `UNIQUE(propertyId, label)`.

- A standalone house is a `Property` with one auto-created `Unit` labeled `"Main"`. Auto-creation happens in the `createProperty` service when the caller sets `autoCreateMainUnit: true` (the default from the UI).

**`Tenant`** — `id, orgId, firstName, lastName, email, phone, idNumber, notes?, userId?, createdAt, updatedAt`. `UNIQUE(orgId, email)`. `userId` is nullable — filled in Slice 3 when tenants get logins.

**`Lease`** — `id, orgId, unitId, startDate, endDate, rentAmountCents, depositAmountCents, heldInTrustAccount (Bool), paymentDueDay (Int 1..31), state (LeaseState), renewedFromId?, terminatedAt?, terminatedReason?, notes?, createdAt, updatedAt`

- `renewedFromId` is a self-FK; walking the chain gives full history.
- Derived status (not stored): `ACTIVE` + `endDate` within `EXPIRING_WINDOW_DAYS` → `EXPIRING`; `ACTIVE` + `endDate < today` → `EXPIRED`. Computation lives in `lib/services/leases.ts` and every API response exposes `status` so the UI never re-derives.

**`LeaseTenant`** (joint leases) — PK`(leaseId, tenantId)`, `isPrimary Bool`. Partial unique index enforces exactly one `isPrimary = true` per lease.

**`Document`** — `id, orgId, kind (DocumentKind), leaseId?, propertyId?, unitId?, tenantId?, filename, mimeType, sizeBytes, storageKey, uploadedById, createdAt`. CHECK constraint: exactly one of the four parent FKs is set.

### Indexes

- `Property(orgId, name)`
- `Unit(orgId, propertyId)`
- `Tenant(orgId, email)` — unique
- `Lease(orgId, unitId, state)`
- `Lease(orgId, endDate)` — drives the expiring-soon query
- `Document(orgId, leaseId)`

### Renewal semantics

"Renew" creates a **new** lease record (new `id`, new dates/rent/deposit) with `renewedFromId` pointing at its predecessor, and transitions the predecessor from `ACTIVE` to `RENEWED` atomically. The UI's "Renew" button pre-fills the new lease form from the old one.

### Delete rules

- `DELETE /api/properties/:id` → soft-delete only if no active leases anywhere under it; otherwise `409 CONFLICT`.
- `DELETE /api/units/:id` → blocked if the unit has any non-terminated lease; otherwise hard-delete.
- Tenants and leases are never hard-deleted via the UI; termination is a state change.

---

## 3. Routes & API

### Pages (`app/(staff)/`)

| Route | Purpose |
|---|---|
| `/dashboard` | Counts + expiring-soon list (Slice 1 stub; real KPIs in Slice 4) |
| `/properties` | List + create |
| `/properties/[id]` | Detail + units tab |
| `/properties/[id]/units/new` | Create unit |
| `/units/[id]` | Detail + current/past leases |
| `/tenants` | List + create |
| `/tenants/[id]` | Detail + lease history |
| `/leases` | List with filters (status, property, expiring within N days) |
| `/leases/new` | Create lease form (unit, tenants, dates, rent, deposit, due day) |
| `/leases/[id]` | Detail + actions: Terminate, Renew, Upload agreement |
| `/leases/[id]/renew` | Pre-filled new-lease form; on save sets `renewedFromId` |
| `/settings/team` | ADMIN — invite/list users, set role |
| `/settings/org` | ADMIN — org name, `EXPIRING_WINDOW_DAYS` |

### REST API (`app/api/`)

Thin route handlers over a service layer. Zod at the boundary.

```
GET    /api/properties            list (orgId auto from session)
POST   /api/properties            create (auto-creates "Main" unit if flagged)
GET    /api/properties/:id
PATCH  /api/properties/:id
DELETE /api/properties/:id        soft delete; blocked if active leases exist

GET    /api/units?propertyId=
POST   /api/units
GET    /api/units/:id
PATCH  /api/units/:id
DELETE /api/units/:id              blocked if has non-terminated lease

GET    /api/tenants
POST   /api/tenants
GET    /api/tenants/:id
PATCH  /api/tenants/:id

GET    /api/leases?status=&unitId=&propertyId=&expiringWithinDays=
POST   /api/leases                 creates lease + LeaseTenant rows in one tx
GET    /api/leases/:id
PATCH  /api/leases/:id              only DRAFT leases are freely editable
POST   /api/leases/:id/activate     DRAFT → ACTIVE
POST   /api/leases/:id/terminate    ACTIVE → TERMINATED, requires reason + date
POST   /api/leases/:id/renew        creates new DRAFT lease with renewedFromId
POST   /api/leases/:id/documents    multipart upload → Vercel Blob → Document row

GET    /api/documents/:id/download  signed URL redirect
```

### Service layer

`lib/services/{properties,units,tenants,leases,documents}.ts`. Routes handle auth + Zod parsing; services own business rules + Prisma. Services are pure functions of `(input, ctx)` where `ctx = { orgId, userId, role }`.

### Middleware (`proxy.ts`)

1. Unauthenticated → redirect to `/login` unless on `(marketing)` or `/api/auth/*`
2. `/(staff)/*` requires role ∈ `{ADMIN, PROPERTY_MANAGER, FINANCE}`
3. `/(tenant)/*` requires role = `TENANT`
4. `/settings/*` requires `ADMIN`
5. All API routes use `withOrg(handler, { requireRole? })` — injects `orgId` from session and returns `404` (not `403`) on cross-org access to avoid existence leaks.

### Error contract

Every API error returns:

```json
{ "error": { "code": "CODE", "message": "Human readable", "details": {} } }
```

Codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `INTERNAL`. A shared `<ApiError>` UI component reads `code` and renders appropriate messaging.

---

## 4. Auth, Roles, Seeding

**Auth.** NextAuth v5 credentials provider, bcryptjs, Prisma adapter, JWT sessions. Session payload: `{ userId, orgId, role }`.

**Role enforcement.** Two layers, both required:
1. `proxy.ts` middleware gates route groups (coarse)
2. `withOrg(handler, { requireRole })` API wrapper checks role per endpoint (fine)

Admin-only endpoints: all `/api/settings/*`, `DELETE /api/properties/:id`, user invites.

**Seed script** (`prisma/seed.ts`) — idempotent for the demo org; never touches other orgs.

- 1 Org (`Acme Property Co`)
- 4 users, password `demo1234`:
  - `admin@acme.test` — ADMIN
  - `pm@acme.test` — PROPERTY_MANAGER
  - `finance@acme.test` — FINANCE
  - `tenant@acme.test` — TENANT (no UI in Slice 1 but role enforcement works)
- 3 Properties: a block of flats (8 units), a townhouse complex (4 units), a standalone house (1 auto "Main" unit)
- 8 Tenants
- 10 Leases spanning all states: 6 ACTIVE (2 within the 60-day expiring window), 1 DRAFT, 1 TERMINATED, 1 RENEWED + its successor ACTIVE lease, 1 ACTIVE joint lease (2 tenants, one primary)
- 2 `LEASE_AGREEMENT` Documents attached to active leases, uploaded to Vercel Blob via the same code path as production.

**Env vars** (`.env.example`):

```
DATABASE_URL=                    # Neon pooled
DIRECT_URL=                      # Neon direct (migrations)
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
BLOB_READ_WRITE_TOKEN=           # Vercel Blob
SENTRY_DSN=                      # optional in dev
EXPIRING_WINDOW_DAYS=60
```

---

## 5. Testing & Acceptance

**Placeholder — deferred to Slice 4.**

Slice 1 acceptance is manual only: log in as each role, click through the golden path (create property → unit → tenant → joint lease → upload PDF → terminate → renew → activate the new draft), confirm the dashboard reflects the expected counts and expiring-soon list.

**Tradeoffs recorded so Slice 4 doesn't forget:**

- Regressions from Slice 2 (Stripe) and Slice 3 (tenant portal) will hit an untested Slice 1 surface. Slice 4 must backfill Vitest unit tests for `lib/services/leases.ts` state transitions and the derived-status window boundary, plus Playwright golden-path coverage for each role.
- Role enforcement is the security boundary; it has no automated verification until Slice 4. Any auth change between now and then warrants a manual multi-role walkthrough.
- Cross-org isolation (`404` not `403` on foreign-org access) is untested until Slice 4; do not introduce real customer data before then.

Slice 4 will stand up: Vitest with a disposable Neon branch DB, Playwright against the same, GitHub Actions pipeline (`install → typecheck → lint → vitest → playwright`), and the full acceptance checklist rewritten as executable specs.

---

## 6. Explicitly Out of Scope (for Slice 1)

- Stripe, monthly charge generation, invoices, arrears, payment recording — Slice 2
- Tenant portal pages, tenant login, tenant-initiated maintenance tickets — Slice 3
- Maintenance ticket model, staff ticket queue, photos — Slice 4
- Dashboard KPIs beyond basic counts, reports, reminders/notifications — Slice 4
- Document kinds beyond `LEASE_AGREEMENT` — added per slice
- Org switcher UI — post-POC
- Deposit interest tracking / Rental Housing Act compliance — post-POC
- Automated test infrastructure and CI test gates — Slice 4

---

## 7. Open Questions

None at time of writing. Update this section if anything surfaces during implementation planning.
