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

**`Property`** — `id, orgId, name, addressLine1, addressLine2?, suburb, city, province (SAProvince), postalCode, notes?, deletedAt?, createdAt, updatedAt`. `deletedAt` nullable — soft-delete timestamp. All list/detail queries filter `deletedAt IS NULL` by default.

**`Unit`** (canonical lettable entity) — `id, orgId, propertyId, label, bedrooms, bathrooms, sizeSqm?, notes?, createdAt, updatedAt`. `UNIQUE(propertyId, label)`.

- A standalone house is a `Property` with one auto-created `Unit` labeled `"Main"`. Auto-creation happens in the `createProperty` service when the caller sets `autoCreateMainUnit: true` (the default from the UI).

**`Tenant`** — `id, orgId, firstName, lastName, email?, phone?, idNumber?, notes?, userId?, archivedAt?, createdAt, updatedAt`.

- **No unique constraint on email.** Real-world property ops: some tenants have no email, couples share one, placeholder emails get used, addresses change. Uniqueness on email is operationally brittle. Duplicate detection is a *soft* check in the create-tenant service (warns the staff user; does not block).
- `idNumber` is the preferred loose-identity hint for duplicate detection but is also nullable.
- `userId` is nullable — filled in Slice 3 when tenants get logins.
- `archivedAt` is nullable. **Tenant lifecycle:** a tenant with no active/upcoming leases can be archived by staff (soft-hide from default tenant list; appears in an "Archived" filter). Archiving is reversible. Tenants are never hard-deleted via the UI. A tenant with any active or upcoming lease cannot be archived — the service returns `409 CONFLICT`.

**`Lease`** — `id, orgId, unitId, startDate, endDate, rentAmountCents, depositAmountCents, heldInTrustAccount (Bool), paymentDueDay (Int 1..31), state (LeaseState), renewedFromId?, terminatedAt?, terminatedReason?, notes?, createdAt, updatedAt`

- `renewedFromId` is a self-FK; walking the chain gives full history.
- **Rent and deposit are stored in Slice 1 but are not wired to any accounting workflow.** They are static lease attributes. No balances, no charge schedules, no trust-account logic, no billing rules exist until Slice 2. The UI displays them as "expected monthly rent" and "deposit on file."

**`state` vs `status` — explicit contract**

- **`state`** is the persisted workflow state. Exactly one of `DRAFT | ACTIVE | TERMINATED | RENEWED`. It is the source of truth for business actions (what buttons are enabled, what transitions are legal). It is set only by explicit user action (`activate`, `terminate`, `renew`) or by the tx that completes a renewal.
- **`status`** is a derived, UI/business-facing label computed on every read in `lib/services/leases.ts`. Values: `DRAFT | ACTIVE | EXPIRING | EXPIRED | TERMINATED | RENEWED`. The UI never re-derives; every API response that returns a Lease includes `status`.

Derivation rules:

| Persisted `state` | Condition | Derived `status` |
|---|---|---|
| `DRAFT` | — | `DRAFT` |
| `TERMINATED` | — | `TERMINATED` |
| `RENEWED` | — | `RENEWED` |
| `ACTIVE` | `endDate < today` | `EXPIRED` |
| `ACTIVE` | `today ≤ endDate ≤ today + EXPIRING_WINDOW_DAYS` | `EXPIRING` |
| `ACTIVE` | `endDate > today + EXPIRING_WINDOW_DAYS` | `ACTIVE` |

**A lease whose `endDate` has passed but which was never explicitly terminated remains `state = ACTIVE` in storage** and surfaces as `status = EXPIRED` in every API response and UI view. No nightly job flips state; staff must decide whether to terminate, renew, or leave it as-is. This is deliberate — the product does not presume a late tenant has vacated.

**`LeaseTenant`** (joint leases) — PK`(leaseId, tenantId)`, `isPrimary Bool`. Partial unique index enforces exactly one `isPrimary = true` per lease.

**Joint-lease semantics** (domain contract, binding across all slices):

- **All tenants on a lease are jointly liable** for rent, deposit, and obligations. There is no "primary payer" in the financial sense.
- **`isPrimary` is a communications and display convention, not a liability marker.** The primary tenant is the default addressee for documents, reminders, and future notifications, and is the name shown in compact UI contexts (e.g. lease list rows). Co-tenants are fully visible on the lease detail page.
- **Every tenant profile shows all leases they are on**, each annotated with their role on that lease (`primary` vs `co-tenant`), and annotated with the lease's derived `status`.
- Changing who is primary is a single-endpoint action (`PATCH /api/leases/:id/primary-tenant`) that runs inside a tx to preserve the "exactly one primary" invariant.

**`Document`** — `id, orgId, kind (DocumentKind), leaseId?, propertyId?, unitId?, tenantId?, filename, mimeType, sizeBytes, storageKey, uploadedById, createdAt`. CHECK constraint: **exactly one** of the four parent FKs is set — this is the document's *canonical owner*.

**Canonical owner + relationship traversal.** A document has one canonical parent (the entity it is "about"), not many. Related views **surface** the document by traversing relationships rather than by giving it multiple owners:

| Document kind | Canonical owner | Surfaces on |
|---|---|---|
| `LEASE_AGREEMENT` | `leaseId` | Lease detail, unit detail (via `unit.leases`), each tenant's profile (via `lease.tenants`) |

Follow-on kinds in later slices (`PROOF_OF_PAYMENT`, `MAINTENANCE_PHOTO`, etc.) will declare their canonical owner in the same table so the rule stays consistent. If a use case ever genuinely needs one file in two unrelated contexts, the answer is two `Document` rows pointing at the same `storageKey`, not a polymorphic parent.

### Indexes

- `Property(orgId, name)`
- `Unit(orgId, propertyId)`
- `Tenant(orgId, email)` — unique
- `Lease(orgId, unitId, state)`
- `Lease(orgId, endDate)` — drives the expiring-soon query
- `Document(orgId, leaseId)`

### Unit occupancy (derived)

Occupancy is **not stored** on `Unit`. It is derived on every read from the unit's leases by a single helper `getUnitOccupancy(unitId, on = today)` in `lib/services/units.ts`. Every API response that returns a Unit includes an `occupancy` field. The UI never re-derives.

**Occupancy states:**

| State | Rule |
|---|---|
| `VACANT` | No lease on this unit with `state = ACTIVE` and `startDate ≤ today ≤ endDate`, and no `DRAFT` or future-dated `ACTIVE` lease exists |
| `OCCUPIED` | Exactly one lease on this unit with `state = ACTIVE` and `startDate ≤ today ≤ endDate` |
| `UPCOMING` | No active lease covers today, but at least one `DRAFT` lease or `ACTIVE` lease with `startDate > today` exists |
| `CONFLICT` | More than one lease with `state = ACTIVE` has overlapping `[startDate, endDate]` ranges covering today (data integrity red flag — surfaced in UI, logged to Sentry) |

**The current tenant** for an occupied unit is the primary tenant of the covering active lease. Unit detail pages show:

- Current occupancy state + the covering lease (if any)
- Current primary tenant + co-tenants (if occupied)
- Next upcoming lease (if `UPCOMING` or `OCCUPIED` with a successor lined up)
- Past leases in reverse chronological order

**Conflict handling.** Lease creation/activation runs an overlap check in the same tx and refuses to create a second active lease that overlaps an existing one (`409 CONFLICT` with code `LEASE_OVERLAP`). `CONFLICT` as a derived occupancy state only appears if data ever reaches a bad state (e.g. a direct DB edit or a bug); it exists so the UI can flag it loudly rather than hide the problem.

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
| `/dashboard` | Fixed Slice 1 widget set — see "Dashboard widgets" below. Real KPIs + charts in Slice 4. |
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
| `/settings/team` | ADMIN — list users, create staff account directly (no email invite flow), set role, deactivate |
| `/settings/org` | ADMIN — org name, `EXPIRING_WINDOW_DAYS` |

### Dashboard widgets (Slice 1 — exact scope)

Served by one endpoint `GET /api/dashboard/summary`. The response is a flat JSON object with exactly these fields:

| Widget | Field | Definition |
|---|---|---|
| Total properties | `totalProperties` | `Property` count, `deletedAt IS NULL` |
| Total units | `totalUnits` | `Unit` count under non-deleted properties |
| Occupied units | `occupiedUnits` | Units whose derived occupancy is `OCCUPIED` |
| Vacant units | `vacantUnits` | Units whose derived occupancy is `VACANT` |
| Upcoming units | `upcomingUnits` | Units whose derived occupancy is `UPCOMING` |
| Active leases | `activeLeases` | Leases with `state = ACTIVE` and `status ∈ {ACTIVE, EXPIRING}` |
| Expiring soon | `expiringSoonLeases` | Leases with `status = EXPIRING` |
| Expired (not terminated) | `expiredLeases` | Leases with `status = EXPIRED` (endDate past, never terminated) |
| Recently created leases | `recentLeases` | Last 5 leases by `createdAt`, any state |
| Expiring-soon list | `expiringSoonList` | Up to 10 leases with `status = EXPIRING`, ordered by `endDate` asc, each with lease id, unit label, property name, primary tenant name, endDate, daysUntilExpiry |

No charts, no trends, no money widgets (deferred to Slice 4). `CONFLICT` occupancy, if present, surfaces as a red banner above the widget grid, not as a counted widget, to keep it impossible to miss.

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

Admin-only endpoints: all `/api/settings/*`, `DELETE /api/properties/:id`, user creation.

**User creation — POC scope.** No email invitation flow in Slice 1. An ADMIN creates a staff account directly by entering `email`, `name`, `role`, and a temporary password; the new user logs in with that password and changes it from a self-serve profile page. Email-based invitations, password-reset emails, and MFA are all post-POC. This is an intentional scope cut — flagged here so implementation does not drift into building an invite pipeline.

**Seed script** (`prisma/seed.ts`) — idempotent for the demo org; never touches other orgs.

- 1 Org (`Acme Property Co`)
- 4 users, password `demo1234`:
  - `admin@acme.test` — ADMIN
  - `pm@acme.test` — PROPERTY_MANAGER
  - `finance@acme.test` — FINANCE
  - `tenant@acme.test` — TENANT (no UI in Slice 1 but role enforcement works)
- 3 Properties: a block of flats (8 units), a townhouse complex (4 units), a standalone house (1 auto "Main" unit)
- 8 Tenants
- 11 Leases exercising every derived status: 5 ACTIVE (well inside window), 2 EXPIRING (within 60 days), 1 EXPIRED (endDate past, state still ACTIVE — proves the "never flipped" rule), 1 DRAFT, 1 TERMINATED, 1 RENEWED + its successor ACTIVE lease. One of the ACTIVE leases is a joint lease (2 tenants, one primary). Seed leaves at least one unit `VACANT`, one `OCCUPIED`, and one `UPCOMING` (future-dated DRAFT) so the dashboard widgets all have non-zero data to show.
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

- Stripe, monthly charge generation, invoices, arrears, payment recording, trust-account logic — Slice 2. Rent and deposit amounts are *stored* in Slice 1 but not connected to any accounting workflow.
- Email-based user invitations, password-reset emails, MFA — post-POC
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
