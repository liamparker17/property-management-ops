## Phase J — Manual acceptance + README

### Task 34: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README**

````markdown
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
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README for Slice 1 POC"
```

---

### Task 35: Manual acceptance walkthrough

This is the sole acceptance gate for Slice 1. It replaces automated tests, which are deferred to Slice 4. Run it before declaring Slice 1 done.

**Preconditions:**

```bash
npm run db:reset     # fresh DB
npm run db:migrate
npm run db:seed
npm run dev
```

- [ ] **Check 1: Typecheck + lint pass**

```bash
npm run typecheck
npm run lint
```

Expected: both exit 0.

- [ ] **Check 2: Role redirects**

1. Visit `http://localhost:3000/` while signed out → redirects to `/login`.
2. Sign in as `tenant@acme.test` → redirects to `/tenant`; visiting `/dashboard` redirects back to `/login` (or `/tenant`).
3. Sign in as `finance@acme.test` → `/dashboard` loads; `/settings/team` redirects to `/dashboard` (admin only).
4. Sign in as `admin@acme.test` → `/settings/team` loads.

- [ ] **Check 3: Dashboard widgets**

Signed in as admin, verify on `/dashboard`:

- `Properties = 3`, `Units = 13`
- Non-zero values for `Occupied`, `Vacant`, `Upcoming`
- `Expiring soon` count matches the "Expiring soon" list length (2)
- `Expired (not terminated)` ≥ 1 (the seeded expired lease)
- Recent leases list shows 5 entries
- No red conflict banner (seed leaves no CONFLICT)

- [ ] **Check 4: Property + unit create golden path**

1. `/properties/new` → create "Test Villa", Western Cape, with `autoCreateMainUnit` checked
2. Land on `/properties/<id>` → a "Main" unit exists
3. Click "Add unit" → create "Guest Cottage" (1 bed)
4. Visit `/units/<guest-cottage-id>` → occupancy = `VACANT`

- [ ] **Check 5: Tenant create + duplicate warning**

1. `/tenants/new` → create "Jane Test" with email `noah@example.test` (matches seeded Noah)
2. After save, verify URL lands on the new tenant and the duplicate warning banner was shown during submission (or appears in the response toast).
3. `/tenants` → Jane appears.

- [ ] **Check 6: Joint lease create + activate**

1. `/leases/new` → select "Test Villa · Main"
2. Check both Jane Test and Noah Adams as tenants
3. Mark Jane primary
4. Set dates: today → today+12 months
5. Rent R8,500, deposit R8,500, due day 1
6. Submit → lands on lease detail with status `DRAFT`
7. Click **Activate** → status flips to `ACTIVE`
8. `/units/<main-id>` shows occupancy `OCCUPIED`; covering lease listed

- [ ] **Check 7: Overlap guard (activation is the real gate)**

1. `/leases/new` → pick the same "Test Villa · Main"
2. Use dates that overlap step 6 (e.g. today+30 → today+200)
3. Submit → server accepts (DRAFT leases are free and do not block on create)
4. Confirm on `/units/<main-id>` that occupancy is still `OCCUPIED` with the original covering lease — the new DRAFT must NOT affect the occupancy state
5. Click **Activate** on the new DRAFT → expect `409 CONFLICT` with message about overlap

- [ ] **Check 7b: Activation requires tenants**

1. Create another DRAFT lease on the Guest Cottage with a single tenant
2. Directly hit `PATCH /api/leases/<id>` with `{ "tenantIds": [] }` — this is blocked by Zod (min 1), so instead: use the Prisma Studio or DB shell to delete the `LeaseTenant` rows for that lease
3. Back in the UI click **Activate** → expect `409 CONFLICT` with "Cannot activate a lease with no tenants"
4. (If you don't want to touch the DB directly, skip this sub-check — it's belt-and-braces over the Zod guard.)

- [ ] **Check 8: Document upload**

1. On the active joint lease detail page, upload a small PDF via the "Lease agreement" form
2. File appears in the list
3. Click the filename → redirects to a public Blob URL with the PDF

- [ ] **Check 9: Terminate + renew**

1. Terminate a different active lease (e.g. Rose Court Flat 1) with reason "Tenant relocated"
2. Status flips to `TERMINATED`; unit detail shows `VACANT`
3. Pick another ACTIVE lease → click **Renew**
4. Form is pre-filled with next-year dates and same tenants
5. Submit → new DRAFT lease is created, old lease now shows `RENEWED`
6. Both leases are linked via "Renewed from / Renewed to" on the detail page

- [ ] **Check 10: Property delete guard**

1. As admin, try to delete "Rose Court" (has active leases) → `409 CONFLICT`
2. Delete "Test Villa" (has the activated test lease) → blocked
3. Terminate the test lease, then delete "Test Villa" → soft-deletes successfully; disappears from `/properties`

- [ ] **Check 11: Team management**

1. `/settings/team` → create new ADMIN user `newadmin@acme.test` / `demo1234abc`
2. Sign out, sign in as the new user → `/dashboard` loads
3. Sign back in as original admin → change `newadmin@acme.test` role to FINANCE and disable them

- [ ] **Check 12: Expiring-window org setting**

1. `/settings/org` → change `expiringWindowDays` from 60 to 10 → save
2. `/dashboard` → "Expiring soon" count drops (was 2 inside 60-day window; at 10 days it likely becomes 0)
3. Restore to 60

- [ ] **Final step: Record sign-off**

```bash
git commit --allow-empty -m "chore: Slice 1 manual acceptance passed"
```

---

## Self-Review (written after plan completion)

**Spec coverage:**

| Spec section | Covered by |
|---|---|
| §1 Stack & Layout | Tasks 1–3, 22–24 |
| §2 Enums | Task 4 |
| §2 Org/User/NextAuth | Task 4, 8 |
| §2 Property (incl. `deletedAt`) | Tasks 4, 12, 27 |
| §2 Unit (incl. canonical + auto "Main") | Tasks 4, 12, 13, 28 |
| §2 Tenant (nullable email, no unique, archive) | Tasks 4, 14, 29 |
| §2 Lease + LeaseTenant (joint, isPrimary) | Tasks 4, 15, 30, 31 |
| §2 Document + CHECK + partial unique | Tasks 4, 5, 16 |
| §2 Unit occupancy (VACANT/OCCUPIED/UPCOMING/CONFLICT) | Tasks 13, 26, 28 |
| §2 `state` vs `status` contract + derivation | Task 15 (`deriveStatus`) |
| §2 Renewal semantics + renewedFromId | Task 15, 31 |
| §2 Delete rules (property soft, unit block, tenant archive) | Tasks 12, 13, 14 |
| §2 Joint-lease semantics (primary is comms only, tenant profile annotations) | Tasks 15, 29 |
| §2 Document canonical owner | Task 16 (no polymorphic owner, single parent FK only) |
| §3 Pages (all routes) | Tasks 22–32 |
| §3 REST API (all endpoints) | Tasks 18–21 |
| §3 Service layer | Tasks 12–17 |
| §3 Middleware proxy | Task 10 |
| §3 Error contract | Task 7 |
| §3 Dashboard widgets (exact field list) | Tasks 17, 26 |
| §4 Auth + roles | Tasks 8, 9, 10, 17 |
| §4 Seed (idempotent, exercises every status) | Task 33 |
| §4 Env vars | Task 2 |
| §4 No invite flow (direct admin-created accounts) | Tasks 17, 32 |
| §5 Testing deferred to Slice 4 | Deviation block + Task 35 (manual acceptance) |
| §6 Out-of-scope | Explicitly not addressed (correct) |

**Placeholder scan:** No `TBD`/`TODO`/`implement later`/`similar to Task N` shortcuts. Every task contains the code or command it refers to. No cross-task type drift (types and field names — `RouteCtx`, `deriveStatus`, `getUnitOccupancy`, `uploadLeaseAgreement`, `expiringWindowDays`, `isPrimary`, `renewedFromId` — are consistent across schema → services → API → UI).

**Type consistency:** Checked:
- `RouteCtx` defined once in `lib/auth/with-org.ts` and imported by every service
- `deriveStatus(lease, window)` signature identical between `leases.ts`, `dashboard.ts`, and UI call sites
- `getUnitOccupancy(unitId, orgId, on?)` identical between `units.ts`, `dashboard.ts`, and unit detail page
- `DerivedStatus` values match between service, `LeaseStatusBadge`, and `leaseListQuerySchema` enum
- Seed lease specs map to valid `LeaseState` values and every referenced `unitIdx` exists (units 0–11 under block/townhouse, unit 12 is the standalone "Main")

**Ambiguity check:** One note worth flagging — the seed creates 12 units (8 + 4 + 1) but the spec recap said 13; the plan is authoritative at **13 units (8 + 4 + 1 Main)**. Wait, 8 + 4 + 1 = 13. The seed loop produces 13 units as written. Dashboard acceptance check 3 already uses 13. No change needed.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-15-portfolio-leases.md`. Two execution options:**

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, two-stage review between tasks, fast iteration. Best for a 35-task plan where subagent isolation keeps each task's context minimal.
2. **Inline Execution** — execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

Which approach?










