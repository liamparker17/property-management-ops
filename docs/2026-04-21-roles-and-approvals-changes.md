# Roles, Portals & Approvals — Change Summary

**Date:** 2026-04-21
**Baseline commit on `master`:** `1b552a5 Restore orbs to original corner placement with blur-3xl`
**Status:** Uncommitted working tree — all changes below are local, nothing pushed.

This document captures every change made to the codebase since the baseline commit, and the divergence from `origin/master`.

---

## 1. Why these changes exist

The product needs to be a single source of truth for three parties — **Property Managers**, **Landlords**, and **Tenants** — where the paying party owns the workspace and everyone else is a scoped collaborator. Two archetypes are supported:

- **PM-agency workspace** (`Org.ownerType = PM_AGENCY`): PM pays and drives. Landlords are in the loop and sign off on specific actions above a configurable threshold.
- **Landlord-direct workspace** (`Org.ownerType = LANDLORD_DIRECT`): Landlord pays and has full authority. PMs execute.

Same schema, same role enum, same UI — permissions are computed from `(role, Org.ownerType)`, not baked into role names.

---

## 2. Changes made by Gemini prior to this session

Gemini touched the repo before this session. Some changes were retained; one was buggy and has been fixed; unauthorised permission additions were reverted.

### Retained from Gemini
- **`prisma/schema.prisma`** — added `LANDLORD` and `MANAGING_AGENT` to the `Role` enum.
- **`lib/zod/team.ts`** — extended `roleEnum` to match.
- **`app/(staff)/settings/team/new-user-form.tsx`** — added `LANDLORD` and `MANAGING_AGENT` options.
- **`app/(staff)/settings/team/team-row.tsx`** — role union type extended + select options added.
- **`proxy.ts`** — route guards for `/landlord` and `/agent` areas, and per-role redirects out of the staff area.
- **`app/(landlord)/layout.tsx`, `app/(agent)/layout.tsx`** — new route-group layouts with dedicated sidebars.
- **`components/nav/landlord-sidebar.tsx`, `components/nav/agent-sidebar.tsx`** — placeholder nav components.
- **`app/(landlord)/landlord/page.tsx`, `app/(agent)/agent/page.tsx`** — scaffolded dashboard pages (the landlord page has since been replaced with a real data-driven version; agent page remains a stub).

### Fixed from Gemini
- **`proxy.ts` silent fallthrough bug** — Gemini's rewrite replaced the original `return NextResponse.redirect('/tenant')` fallback with three conditional redirects for `TENANT` / `LANDLORD` / `MANAGING_AGENT` but no default, meaning a session with missing/unknown role fell through into the staff area. Added `return NextResponse.redirect('/login')` as the default branch.

### Reverted from Gemini
- **`.claude/settings.local.json`** — Gemini added six permissions for `sms-gate.app`, `capcom6.github.io`, and `gh api *`. None related to the roles work. All removed.

---

## 3. Changes made in this session

All changes are production-bound and type-clean (`npx tsc --noEmit` passes).

### 3.1 Database schema (`prisma/schema.prisma`)

Two schema pushes to Neon (`prisma db push`, no migration files created — this is a personal dev database).

#### New enums
- `OrgOwnerType { PM_AGENCY, LANDLORD_DIRECT }`
- `ApprovalKind { MAINTENANCE_COMMIT, LEASE_CREATE, LEASE_RENEW, RENT_CHANGE, TENANT_EVICT, PROPERTY_REMOVE }`
- `ApprovalState { PENDING, APPROVED, DECLINED, CANCELLED }`

#### `Org` — new fields
- `ownerType: OrgOwnerType @default(PM_AGENCY)`
- `landlordApprovalThresholdCents: Int @default(500000)` (R5,000)
- Back-relations added: `landlords`, `managingAgents`, `approvals`

#### `User` — new fields
- `landlordId: String?` + relation to `Landlord`
- `managingAgentId: String?` + relation to `ManagingAgent`
- Indexes on both new FKs

#### `Property` — new fields
- `landlordId: String?` + relation to `Landlord`
- `assignedAgentId: String?` + relation to `ManagingAgent`
- Indexes on both new FKs

**Note:** Both `Property.landlordId` and `Property.assignedAgentId` are optional in the DB to avoid breaking legacy rows. Zod validation can tighten on create going forward. Legacy properties can be bulk-assigned later via UI.

#### New models

- **`Landlord`**
  `id`, `orgId`, `name`, `email?`, `phone?`, `vatNumber?`, `notes?`, `archivedAt?`, `createdAt`, `updatedAt`
  Relations: `org`, `users`, `properties`, `approvals`

- **`ManagingAgent`**
  `id`, `orgId`, `name`, `email?`, `phone?`, `notes?`, `archivedAt?`, `createdAt`, `updatedAt`
  Relations: `org`, `users`, `assignedProperties`

- **`Approval`**
  `id`, `orgId`, `landlordId`, `propertyId?`, `kind`, `subjectType?`, `subjectId?`, `payload: Json`, `state`, `reason?`, `decisionNote?`, `requestedById`, `decidedById?`, `createdAt`, `updatedAt`, `decidedAt?`
  Indexes: `(orgId, state)`, `(landlordId, state)`, `(subjectType, subjectId)`

### 3.2 New library files

| File | Purpose |
|---|---|
| `lib/permissions.ts` | `landlordHasExecutiveAuthority(org)`, `requiresLandlordApproval(action, org)` with typed action union, `orgOwnerTypeLabel()` |
| `lib/zod/landlords.ts` | `createLandlordSchema`, `updateLandlordSchema` |
| `lib/zod/managing-agents.ts` | `createManagingAgentSchema`, `updateManagingAgentSchema` |
| `lib/zod/approvals.ts` | `approvalKindEnum`, `decideApprovalSchema` |
| `lib/services/landlords.ts` | `listLandlords()`, `getLandlord()`, `createLandlord()`, `updateLandlord()` |
| `lib/services/managing-agents.ts` | `listManagingAgents()`, `getManagingAgent()`, `createManagingAgent()`, `updateManagingAgent()` |
| `lib/services/landlord-portal.ts` | `getLandlordProfile()`, `listLandlordProperties()`, `getLandlordPortfolioSummary()` — scoped by `User.id → User.landlordId` |
| `lib/services/approvals.ts` | `requestApproval()`, `listPendingForLandlord()`, `listApprovalsForOrg()`, `decideApproval()`, `cancelApproval()` |

### 3.3 Modified library files

- **`lib/zod/team.ts`**
  - `createUserSchema` now accepts optional `landlordId` and `managingAgentId` (for linking a new user to an existing entity record).
  - `updateOrgSchema` now accepts optional `ownerType` and `landlordApprovalThresholdCents`.

- **`lib/services/team.ts`**
  - `createTeamUser()` rewritten to run inside a `db.$transaction`. When role is `LANDLORD` or `MANAGING_AGENT`:
    - If `landlordId` / `managingAgentId` is provided, verify the entity exists in the Org and link the user to it.
    - If not provided, auto-create a matching `Landlord` / `ManagingAgent` record using the user's name and email.

### 3.4 Modified UI

- **`app/(staff)/settings/org/org-form.tsx`**
  - New **Workspace Type** select (`PM_AGENCY` / `LANDLORD_DIRECT`).
  - New **Landlord Approval Threshold (R)** input — converts to cents on submit.
  - `initial` prop extended with `ownerType` and `landlordApprovalThresholdCents`.

- **`app/(staff)/settings/org/page.tsx`**
  - Passes the new fields through to `OrgForm`.

- **`app/(landlord)/landlord/page.tsx`**
  - Replaced Gemini's static placeholder with a real dashboard:
    - Four KPIs fetched via `getLandlordPortfolioSummary()`: properties, units, active leases, open maintenance.
    - Property list fetched via `listLandlordProperties()`, scoped by `User.landlordId`, showing address, unit count, and assigned agent.
    - Empty state when no properties are assigned.

### 3.5 Manifest

- **`CODEBASE.md`** updated with every new enum, model, service, zod schema, and the `permissions.ts` helper, per the manifest-first rule.

---

## 4. Divergence from `origin/master`

### Modified files (10)
```
.claude/settings.local.json
CODEBASE.md
app/(staff)/settings/org/org-form.tsx
app/(staff)/settings/org/page.tsx
app/(staff)/settings/team/new-user-form.tsx
app/(staff)/settings/team/team-row.tsx
lib/services/team.ts
lib/zod/team.ts
prisma/schema.prisma
proxy.ts
```

### New files (12)
```
app/(agent)/layout.tsx
app/(agent)/agent/page.tsx
app/(landlord)/layout.tsx
app/(landlord)/landlord/page.tsx
components/nav/agent-sidebar.tsx
components/nav/landlord-sidebar.tsx
lib/permissions.ts
lib/services/approvals.ts
lib/services/landlord-portal.ts
lib/services/landlords.ts
lib/services/managing-agents.ts
lib/zod/approvals.ts
lib/zod/landlords.ts
lib/zod/managing-agents.ts
```

### Untracked artefacts (not to commit)
```
.dev.log
```

### Database divergence from `origin/master` baseline
The local Neon database has received two `prisma db push` syncs and is **ahead of** `origin/master`'s schema. No migration files were created — pushing this branch will require either:
- `prisma db push` on the target DB, **or**
- Generating a proper migration with `prisma migrate dev` before merging to `master`.

---

## 5. What's not yet done

Known gaps, in descending priority:

1. **Approvals not wired into maintenance.** `requestApproval()` exists but no call site creates one when a maintenance job crosses the threshold. Product decision needed: does approval trigger at maintenance *creation* with an estimate, or at a separate *commit/schedule* step after a quote is attached?
2. **No landlord UI for pending approvals.** No `/landlord/approvals` page. Needs a list + accept/decline action.
3. **Agent portal is still a stub.** No `lib/services/managing-agent-portal.ts`, and `/agent/page.tsx` shows placeholder data. Mirror of landlord portal pattern.
4. **Sidebar dead links.** `landlord-sidebar.tsx` and `agent-sidebar.tsx` list routes (`/landlord/properties`, `/landlord/leases`, `/landlord/invoices`, `/landlord/repairs`, `/landlord/profile`, etc.) that 404. Acceptable while portals are WIP but should be disabled visually until pages exist.
5. **`TopBar` in both portals uses `variant="tenant"`.** Likely renders tenant-specific chrome. Needs `landlord` / `agent` variants or a neutral one.
6. **Existing `Property` rows have `landlordId = null`.** They need bulk assignment before the `/landlord/properties` page can show anything for legacy data.
7. **No migration file.** See section 4. If this branch is ever pushed to a shared DB, a proper migration must be generated.

---

## 6. How to pick up

To see the landlord portal work against real data:
1. Run `prisma db push` or ensure the local DB is current.
2. In `/settings/org`, set Workspace Type and approval threshold.
3. In `/settings/team`, create a user with role `LANDLORD` — a `Landlord` record is auto-created.
4. Manually update a property in Prisma Studio (or via future UI) to set `landlordId` to the new record.
5. Log in as the landlord user → `/landlord` shows real KPIs and the property list.
