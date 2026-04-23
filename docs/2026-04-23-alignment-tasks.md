# Alignment Tasks — Deck-to-Product

Branch: `alignment-work`
Plan source: `docs/2026-04-23-product-overview-implementation-plan.md`
Gap source: `docs/2026-04-23-product-overview-gap-checklist.md`
Manifest (source of truth): `CODEBASE.md`

## How to use this document

Each task below is **self-contained**. A fresh Claude instance should be able to pick one up with no prior conversation and execute it. Every task includes:

- **ID** — stable handle (e.g. `T-P0-01`).
- **Depends on** — tasks that must land first.
- **Read first** — the exact file paths and plan sections to load (check `CODEBASE.md` before opening code).
- **Deliverables** — files to create/edit, with pointer back to the plan section that defines the shape.
- **Verification** — the command(s) to run; what "done" looks like.
- **Manifest update** — which table in `CODEBASE.md` to update.
- **Clarifications needed** — **before touching code**, resolve these with the user. If none are listed, the task is ready to execute.

Binding constraints that apply to **every task**:

- Read `CODEBASE.md` before any source file (manifest-first rule).
- Business logic in `lib/services/*`. Validation in `lib/zod/*`. Routes are thin `withOrg()` wrappers.
- Money is `Int` cents, formatted via `formatZar()` in `lib/format.ts`.
- UI follows the Regalis shell invariants in plan §0.1. Do not introduce new card/header/badge primitives.
- Every nav entry must have a destination page in the same PR. No dead links.
- Update `CODEBASE.md` in the same PR as the change.
- When a task requires a migration, run `npx prisma migrate dev --name <snake_case_name>` and commit the generated migration SQL.
- If anything in the clarifications list is unanswered, **stop and ask** — do not guess.

## Locked decisions (answered 2026-04-23)

These are binding for every task below. If a task description contradicts a locked decision, the decision wins.

1. **Feature-flag defaults for new orgs:** all `FeatureFlagKey` values default to `enabled=false` on org creation. Admins switch features on as they need them.

2. **Landlord approval thresholds:** do not touch existing `Org.landlordApprovalThresholdCents` values. No migration, no seed change.

3. **Approval routing by org type (replaces the two-stage agent→landlord chain in the original plan):**
   - `ownerType = LANDLORD_DIRECT` → landlord is the final approver.
   - `ownerType = PM_AGENCY` → PM (ADMIN/PROPERTY_MANAGER) approves; the cost is charged to the landlord's account; landlord sees the decision on their statement and in an after-the-fact approval log. The landlord does not block.
   - There is **no two-stage agent-then-landlord chain**. The `ManagingAgent` entity is a property-coordination role, not a financial-approval gate.
   - Quotes are **optional**. Contractors often can't quote before starting (rolling costs). Approval may proceed on `estimatedCostCents` or a description alone; `quotedCostCents` stays optional. The threshold gate evaluates `quotedCostCents ?? estimatedCostCents ?? 0`.
   - `OrgFeature.AGENT_APPROVALS` is removed from the feature-flag enum. `OrgFeature.LANDLORD_APPROVALS` stays — it lets landlord-direct orgs disable explicit approval entirely if they want everything auto-approved.

4. **Tax returns scope:** Phase 5 ships **accountant-ready packs** (PDF + CSV). Statutory direct filing (e.g. SARS submission) is a future adapter. **Design constraint:** `lib/services/tax-reporting.ts` must structure its output behind an interface so a filing adapter can be added later without rewriting the pack builders. Specifically:
   - Keep a `TaxPack` record as the canonical data.
   - Rendering (PDF/CSV) and transmission (future filing) are separate concerns — do not bake filing logic into pack generation.

5. **No applicant portal.** Applicants never get a login. All applications are captured by PM staff on behalf of the prospect. On conversion, the existing `onboardTenant()` flow optionally creates a tenant portal `User` as it does today. Drop any task deliverable that creates a portal `User` for an `Applicant`.

6. **No duplicate detection** on applicants or tenants beyond what exists today (`detectDuplicates` in `lib/services/tenants.ts` stays as-is, unchanged). Applications are captured by PM staff who already know their own tenant roster. Do not add email/ID dedup to the application form or API.

7. **Nav validator is a work-planner, not a CI blocker.** `lib/nav/validate.ts` outputs the list of nav links whose destination pages don't exist yet. Agents picking up tasks read this list and, for each missing page, ask: "Is this page owed by the current milestone's plan, and can I build it from the existing spec?" If yes → build it. If the spec is ambiguous → stop and ask. The validator never fails CI. It is wired into task execution, not into the build pipeline.

8. **Vetting is a TPN integration, not an internal checklist.** We integrate with TPN (https://mrisoftware.tpn.co.za/) for tenant screening. Internal `VettingCheck` / `VettingCheckType` models and services in the original plan are **dropped**. Replaced by a single `TpnCheck` integration.
   - A TPN request is raised against an `Application`.
   - TPN returns a report (credit score, payment profile, adverse data, employment, income band — whatever their API exposes).
   - We store the full TPN response and a short summary on `TpnCheck`.
   - `approveApplication` requires a `TpnCheck` with `status = RECEIVED` and (unless explicitly overridden with an audited `WAIVED` reason) a pass indicator from the TPN report.
   - See "New clarifications — TPN" below for what we still need from you to spec the integration.

9. **Audit log retention:** indefinite. No purge job, no retention window, no TTL. Revisit only if storage cost becomes material.

10. **Timezone:** `Africa/Johannesburg` hardcoded app-wide (same offset covers Pretoria and Harare — UTC+2, no DST). Stored as a single constant in `lib/format.ts` or a new `lib/timezone.ts`. Not per-org, not per-user.

## New clarifications — TPN integration (blocks Phase 1 vetting tasks)

Q8 swaps internal vetting for a TPN integration. Before T-P1-06 onwards can start, we need:

- **TPN API access:** Do you have (or will you obtain) API credentials for TPN? Who's the contact?
- **TPN product tier:** Which TPN product are we integrating — Tenant Profile Network (TPN Credit Bureau) rental history check, their full credit check, or something else in their MRI-hosted suite? This determines the request/response shape.
- **Cost model:** Does TPN bill per-check? If so, do we need a spending cap per org or a "confirm cost before running" dialog?
- **Delivery mode:** Synchronous (submit, wait ~seconds, receive) or asynchronous (submit, TPN webhooks back later)? This decides whether we need a webhook endpoint and a `RECEIVED` transition driven by a callback.
- **Credential scope:** One TPN account for all orgs (we pay and bill back), or each org brings its own TPN credentials (we store per-org secrets)?
- **Consent:** TPN screening requires applicant consent (PoPIA + TPN's T&Cs). Do we capture a consent record on the `Application` before calling TPN, or is paper/offline consent assumed?
- **Report storage:** Store the full TPN report payload in `TpnCheck.reportPayload` (Json) — or also store the original PDF in Vercel Blob? Default recommendation: both (Json for queries, PDF for audit).

If you don't have TPN access yet, we can ship Phase 1 without approval-gating (application stages work, staff approve manually, TPN hooks are scaffolded but inactive) and turn it on when credentials arrive. Let me know which path.

---

# Milestone 1 — Foundation + Applications & Vetting

## Phase 0 — Cross-cutting foundation

### T-P0-01 · FeatureFlag enum and OrgFeature model

**Depends on:** —
**Read first:** `CODEBASE.md` §Database Schema; `prisma/schema.prisma`; plan §1.1
**Deliverables:**
- `prisma/schema.prisma`
  - Add `FeatureFlagKey` enum: `UTILITIES_BILLING`, `TRUST_ACCOUNTING`, `AREA_NOTICES`, `LANDLORD_APPROVALS`, `AGENT_APPROVALS`, `USAGE_ALERTS`, `PAYMENT_ALERTS`, `ANNUAL_PACKS`.
  - Add `OrgFeature` model exactly as plan §1.1 specifies.
  - Add `orgFeatures OrgFeature[]` relation on `Org`.
- Migration: `npx prisma migrate dev --name add_feature_flags`.
**Verification:**
- `npx prisma generate` succeeds.
- `npx prisma migrate status` shows clean.
**Manifest update:** Add `FeatureFlagKey` to enums list; add `OrgFeature` row to models table in `CODEBASE.md`.
**Clarifications needed:** Global Q1 (default flag state).

### T-P0-02 · AuditLog model

**Depends on:** —
**Read first:** `prisma/schema.prisma`; plan §1.1
**Deliverables:**
- `prisma/schema.prisma`
  - Add `AuditLog` model exactly as plan §1.1 (fields: `orgId`, `actorUserId?`, `entityType`, `entityId`, `action`, `diff?`, `payload?`, `createdAt`, indexes on `(orgId, entityType, entityId)` and `(orgId, createdAt)`).
  - Add `auditLogs AuditLog[]` relation on `Org` and `User`.
- Migration: `npx prisma migrate dev --name add_audit_log`.
**Verification:** same as T-P0-01.
**Manifest update:** add `AuditLog` row in models table.
**Clarifications needed:** Global Q9 (retention).

### T-P0-03 · audit service

**Depends on:** T-P0-02
**Read first:** `lib/auth/with-org.ts` (for `RouteCtx` type); `lib/errors.ts`; plan §1.2
**Deliverables:**
- `lib/services/audit.ts` exporting:
  ```ts
  writeAudit(ctx: RouteCtx, input: { entityType: string; entityId: string; action: string; diff?: unknown; payload?: unknown }): Promise<void>
  ```
- Inserts an `AuditLog` row. Uses `ctx.orgId` and `ctx.userId`. Never throws — if insert fails, log to console and swallow (do not fail the parent mutation).
**Verification:** Add a tiny unit test `tests/services/audit.test.ts` that calls `writeAudit` and asserts a row exists.
**Manifest update:** add `lib/services/audit.ts` row to services table.
**Clarifications needed:** None.

### T-P0-04 · org-features service

**Depends on:** T-P0-01
**Read first:** `lib/auth/with-org.ts`; `lib/errors.ts`; plan §1.2
**Deliverables:**
- `lib/services/org-features.ts` exporting:
  ```ts
  getOrgFeatures(orgId: string): Promise<Record<FeatureFlagKey, boolean>>   // returns every key, default false
  setOrgFeature(ctx: RouteCtx, key: FeatureFlagKey, enabled: boolean, config?: unknown): Promise<OrgFeature>
  assertFeature(ctx: RouteCtx, key: FeatureFlagKey): Promise<void>          // throws ApiError.forbidden if disabled
  ```
- `getOrgFeatures` fills in missing keys as `false`.
- `setOrgFeature` writes `AuditLog { entityType: "OrgFeature", action: "toggle" }`.
**Verification:** Unit test: toggle a flag, read it back, assert persistence + audit row.
**Manifest update:** add `lib/services/org-features.ts` to services table.
**Clarifications needed:** None.

### T-P0-05 · org-features zod schema

**Depends on:** T-P0-01
**Read first:** `lib/zod/team.ts` (existing zod pattern)
**Deliverables:**
- `lib/zod/org-features.ts` exporting `featureFlagKeyEnum`, `setOrgFeatureSchema` (`{ key, enabled, config? }`).
**Verification:** `npx tsc --noEmit` passes.
**Manifest update:** add `lib/zod/org-features.ts` to zod table.
**Clarifications needed:** None.

### T-P0-06 · org-features API route

**Depends on:** T-P0-04, T-P0-05
**Read first:** `app/api/settings/org/route.ts` (existing pattern); `lib/auth/with-org.ts`; `lib/errors.ts`
**Deliverables:**
- `app/api/settings/features/route.ts` — `GET` returns `getOrgFeatures(ctx.orgId)`; `POST` validates against `setOrgFeatureSchema` and calls `setOrgFeature`. ADMIN only (throw `ApiError.forbidden` otherwise). Uses `withOrg()`.
**Verification:** hit both endpoints manually; confirm 403 for non-ADMIN.
**Manifest update:** add row in API table.
**Clarifications needed:** None.

### T-P0-07 · staff features page

**Depends on:** T-P0-06
**Read first:** `app/(staff)/settings/org/page.tsx` (existing pattern); `components/page-header.tsx`; `components/empty-state.tsx`; plan §0.1 (Regalis invariants)
**Deliverables:**
- `app/(staff)/settings/features/page.tsx` — server component reads flags, renders `PageHeader` + a list of toggle rows using existing shadcn `Switch` (add it via `npx shadcn@latest add switch` if not installed).
- ADMIN-only render guard (redirect to `/dashboard` if not ADMIN).
- Loading state: skeleton. Empty state: not applicable (all keys always present).
**Verification:** sign in as ADMIN, toggle a flag, refresh — state persists.
**Manifest update:** add `/settings/features` row in pages table.
**Clarifications needed:** None.

### T-P0-08 · staff nav — add Features entry

**Depends on:** T-P0-07
**Read first:** `components/nav/sidebar.tsx` (`getStaffNavItems`)
**Deliverables:**
- Add `{ label: "Features", href: "/settings/features", icon: <existing-icon-from-lucide> }` nested under Settings (or top-level if current Settings is flat).
**Verification:** visible only to ADMIN in staff sidebar.
**Manifest update:** none (sidebar file line-count change will drift; acceptable).
**Clarifications needed:** None.

### T-P0-09 · nav validator (work-planner, not CI blocker)

**Depends on:** —
**Read first:** `components/nav/sidebar.tsx`, `tenant-sidebar.tsx`, `landlord-sidebar.tsx`, `agent-sidebar.tsx`; `app/` directory structure; decision #7
**Deliverables:**
- `lib/nav/validate.ts` — pure function `validateNav()`:
  - Reads every nav `href` from `getStaffNavItems`, `getTenantNavItems`, `getLandlordNavItems`, `getAgentNavItems`.
  - For each href, verifies a matching `app/**/page.tsx` exists (dynamic segments matched loosely: `/tenants/[id]` matches `app/(staff)/tenants/[id]/page.tsx`).
  - Returns `{ missing: Array<{ href: string; sidebar: "staff"|"tenant"|"landlord"|"agent" }> }`.
- `scripts/report-missing-pages.ts` — CLI that prints the missing list so an agent can read it at the start of a task.
- No CI wiring. No test that fails on missing pages.
**How agents use this (per decision #7):** before picking up a task, an agent runs `tsx scripts/report-missing-pages.ts`. For each missing page the agent asks: "Is this page owed by the current milestone's plan (`docs/2026-04-23-product-overview-implementation-plan.md`) and do I have enough spec to build it without user input?" If yes → build it in this task. If the spec is ambiguous → stop and ask.
**Verification:** script runs and prints a list (even if empty).
**Manifest update:** add `lib/nav/validate.ts` to lib table; add `scripts/report-missing-pages.ts` to a new scripts section.
**Clarifications needed:** None.

### T-P0-10 · triage landlord & agent sidebar links

**Depends on:** T-P0-09
**Read first:** `components/nav/landlord-sidebar.tsx`, `components/nav/agent-sidebar.tsx`; `docs/2026-04-23-product-overview-implementation-plan.md` §8.3 (full list of landlord/agent routes the product owes); decision #7
**Deliverables:**
- Run `tsx scripts/report-missing-pages.ts`.
- For every missing link, decide one of:
  - **Build now** — if the destination page is in M1 scope and the spec is clear, add a stub page with `PageHeader` + `EmptyState` saying "Coming in [Milestone X]" and a friendly description. This is a page, not a dead link — it resolves, renders Regalis shell, and explains its own status.
  - **Remove now** — if the destination is not owed until a later milestone AND a stub would mislead users, remove the sidebar item until that milestone picks it up.
  - **Ask** — if unclear whether it's in scope or what the page should contain, stop and ask the user.
- Log each decision in a comment at the top of the modified sidebar file so the next agent sees the reasoning.
**Verification:** `tsx scripts/report-missing-pages.ts` reports no missing links, OR every missing link has a written justification in the sidebar file.
**Manifest update:** update pages table for any new stub pages.
**Clarifications needed:** None — decision #7 locks the policy.

### T-P0-11 · backfill property owners

**Depends on:** —
**Read first:** `prisma/schema.prisma` (Property, Landlord, ManagingAgent); `lib/db.ts`
**Deliverables:**
- `scripts/backfill-property-owners.ts`:
  - For every `Property` with `landlordId IS NULL`, if the org has exactly one active (non-archived) `Landlord`, set `landlordId` to that id.
  - Same heuristic for `assignedAgentId` vs `ManagingAgent`.
  - Emit a CSV report to stdout of properties that couldn't be resolved.
  - Idempotent — safe to re-run.
- Add to `package.json` scripts: `"backfill:owners": "tsx scripts/backfill-property-owners.ts"`.
**Verification:** run against a snapshot DB; rerun and confirm no changes on second run.
**Manifest update:** none.
**Clarifications needed:** None.

### T-P0-12 · CODEBASE.md refresh for Phase 0

**Depends on:** T-P0-01..T-P0-11
**Read first:** `CODEBASE.md`
**Deliverables:**
- Update schema enums row to include `FeatureFlagKey`.
- Add rows for `OrgFeature`, `AuditLog` to models table.
- Add `lib/services/audit.ts`, `lib/services/org-features.ts`, `lib/nav/validate.ts`, `lib/zod/org-features.ts` to their tables.
- Add `/api/settings/features` to API table.
- Add `/settings/features` to pages table.
- Bump "Last updated" date.
**Verification:** diff is readable; no unrelated changes.
**Clarifications needed:** None.

---

## Phase 1 — Applications & Vetting

### T-P1-01 · Application enums

**Depends on:** T-P0-12
**Read first:** `prisma/schema.prisma`; plan §2.1; decision #8
**Deliverables:**
- Enums: `ApplicationStage`, `ApplicationDecision` — values exactly per plan §2.1.
- New enums for TPN (replacing the plan's `VettingCheckType` / `VettingCheckStatus`):
  - `TpnCheckStatus`: `NOT_STARTED`, `REQUESTED`, `RECEIVED`, `FAILED`, `WAIVED`.
  - `TpnRecommendation`: `PASS`, `CAUTION`, `DECLINE`, `UNKNOWN` (derived from TPN response when we map it).
- Migration: `add_application_enums`.
**Verification:** `npx prisma generate`.
**Manifest update:** enums row in `CODEBASE.md`.
**Clarifications needed:** None — enum shape is safe even before TPN API details are finalised; the recommendation mapping can be tuned later.

### T-P1-02 · Applicant model

**Depends on:** T-P1-01
**Read first:** plan §2.1; decisions #5, #6
**Deliverables:**
- `Applicant` model with fields exactly per plan §2.1, relation `org Org`.
- Add `applicants Applicant[]` on `Org`.
- Add consent fields for TPN (decision #8 prerequisite): `tpnConsentGiven Boolean @default(false)`, `tpnConsentAt DateTime?`, `tpnConsentCapturedById String?`.
- **Do not** add a `userId` relation to `Applicant` — applicants never get portal logins (decision #5).
- **Do not** add unique constraints on `(orgId, email)` or `(orgId, idNumber)` — duplicate detection is not required (decision #6).
- Migration: `add_applicant`.
**Verification:** prisma generate.
**Manifest update:** models table.
**Clarifications needed:** None.

### T-P1-03 · Application model + relations

**Depends on:** T-P1-02
**Read first:** plan §2.1; `prisma/schema.prisma` (Tenant, Property, Unit, User models)
**Deliverables:**
- `Application` model per plan §2.1.
- Add inverse relations: `Org.applications`, `Property.applications`, `Unit.applications`, `User.assignedApplications` (named relation `ApplicationReviewer`), `Tenant.convertedFromApplication Application?`.
- Migration: `add_application`.
**Verification:** prisma generate.
**Manifest update:** models table.
**Clarifications needed:** None.

### T-P1-04 · TpnCheck, ApplicationDocument, ApplicationNote models

**Depends on:** T-P1-03
**Read first:** plan §2.1 (ApplicationDocument + ApplicationNote shape); decision #8
**Deliverables:**
- `ApplicationDocument` and `ApplicationNote` models exactly per plan §2.1.
- **Replace** the plan's `VettingCheck` model with a TPN-integration model:
  ```prisma
  model TpnCheck {
    id               String @id @default(cuid())
    applicationId    String @unique
    status           TpnCheckStatus @default(NOT_STARTED)
    requestedAt      DateTime?
    receivedAt       DateTime?
    tpnReferenceId   String?
    recommendation   TpnRecommendation?
    summary          String?                // short human-readable summary extracted from report
    reportPayload    Json?                  // full TPN response body
    reportBlobKey    String?                // Vercel Blob key for the PDF if supplied
    waivedReason     String?
    waivedById       String?
    application      Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  }
  ```
- Add `tpnCheck TpnCheck?` relation on `Application`.
- Migration: `add_application_children`.
**Verification:** prisma generate.
**Manifest update:** models table.
**Clarifications needed:** None — model shape is stable regardless of which TPN product tier we ultimately integrate; payload is Json so the exact fields can vary.

### T-P1-05 · applications service (list/get/CRUD)

**Depends on:** T-P1-04, T-P0-03
**Read first:** `lib/services/tenants.ts`, `lib/services/onboarding.ts` (patterns); plan §2.2
**Deliverables:**
- `lib/services/applications.ts` exporting the signatures listed in plan §2.2 (top block): `listApplications`, `getApplication`, `createApplication`, `submitApplication`, `assignReviewer`, `addApplicationNote`, `uploadApplicationDocument`, `withdrawApplication`.
- Every mutation writes an `AuditLog` via `writeAudit`.
- `submitApplication` enforces `stage` transition DRAFT → SUBMITTED.
- `uploadApplicationDocument` uses `lib/blob.ts` `validateFile` + `uploadBlob`.
**Verification:** unit tests for stage transitions + happy path.
**Manifest update:** services table.
**Clarifications needed:** None.

### T-P1-06 · TPN integration service + decisions

**Depends on:** T-P1-05
**Read first:** plan §2.2; `lib/services/onboarding.ts`; decision #8; "New clarifications — TPN" at top of this file
**Deliverables:**
- `lib/services/tpn.ts` exporting a provider-agnostic interface:
  ```ts
  requestTpnCheck(ctx, applicationId): Promise<TpnCheck>       // moves TpnCheck to REQUESTED, calls the TPN adapter
  recordTpnResult(applicationId, payload): Promise<TpnCheck>   // webhook or sync-response handler; sets RECEIVED + summary + recommendation
  waiveTpnCheck(ctx, applicationId, reason): Promise<TpnCheck> // sets WAIVED with audit
  getTpnCheck(ctx, applicationId): Promise<TpnCheck | null>
  ```
- `lib/integrations/tpn/adapter.ts` — real TPN adapter. Until credentials arrive this is a stub that:
  - Reads env vars `TPN_API_URL`, `TPN_API_KEY` (or per-org equivalents — to be confirmed in TPN clarifications).
  - If env vars are missing, `requestTpnCheck` throws `ApiError.conflict("TPN not configured")` so PM staff see a clear message.
  - Exposes a typed `submitCheck(applicantPayload)` and `mapResponse(rawResponse): { recommendation; summary; payload }`.
- `lib/services/vetting.ts` exporting the application-decision methods:
  ```ts
  approveApplication(ctx, id, input): Promise<Application>
  declineApplication(ctx, id, input): Promise<Application>
  convertApplicationToTenant(ctx, id, input): Promise<{ tenant; lease; application }>
  ```
- `approveApplication` refuses unless the Application has a `TpnCheck` with either:
  - `status = RECEIVED` AND `recommendation IN (PASS, CAUTION)` (CAUTION requires `input.overrideReason`), OR
  - `status = WAIVED` (requires applicant's `tpnConsentGiven = true` to have been captured beforehand only if we decide waiver still needs consent — flag this as a sub-clarification if ambiguous).
- `approveApplication` also refuses if `Applicant.tpnConsentGiven = false` unless explicitly waived.
- `convertApplicationToTenant` delegates into `onboardTenant()` from `lib/services/onboarding.ts`, passing `{ fromApplicationId }`. On success sets `Application.convertedTenantId`, `convertedLeaseId`, `stage=CONVERTED`.
- Every mutation writes `AuditLog`.
**Verification:** unit tests covering:
  - approval blocked when TPN status is NOT_STARTED / REQUESTED / FAILED.
  - approval blocked on DECLINE recommendation even if RECEIVED.
  - approval allowed on PASS; allowed on CAUTION only with override reason.
  - approval allowed after waive with audit trail.
  - Conversion produces one Tenant + one DRAFT Lease.
**Manifest update:** services table (add `lib/services/tpn.ts`, `lib/services/vetting.ts`, `lib/integrations/tpn/adapter.ts`).
**Clarifications needed:** "New clarifications — TPN" section. If the user says "ship without live TPN for now", keep the adapter as the stub above and mark the test "approval requires TPN" as `it.skip` with a TODO until credentials arrive.

### T-P1-07 · extend onboardTenant to accept fromApplicationId

**Depends on:** T-P1-06
**Read first:** `lib/services/onboarding.ts` (current `onboardTenant`); `lib/zod/onboarding.ts`
**Deliverables:**
- Extend `onboardTenantSchema` with optional `fromApplicationId: string`.
- In `onboardTenant`, if `fromApplicationId` is supplied:
  - Load the application; pre-fill tenant/unit/lease fields from `Applicant` + `Application` (only where the caller didn't override).
  - In the same transaction, set `Application.convertedTenantId`, `convertedLeaseId`, `stage=CONVERTED`.
- Preserve existing walk-in behavior for callers that don't pass the param.
**Verification:** existing onboarding flow still works; new path creates tenant+lease+application linkage atomically.
**Manifest update:** update `onboarding.ts` description if signature changes.
**Clarifications needed:** None.

### T-P1-08 · zod schemas for applications & TPN

**Depends on:** T-P1-04
**Read first:** `lib/zod/tenant.ts`, `lib/zod/lease.ts` (patterns); plan §2.3; decision #8
**Deliverables:**
- `lib/zod/application.ts`: `createApplicationSchema`, `updateApplicationSchema`, `assignReviewerSchema`, `applicationDecisionSchema` (includes optional `overrideReason` for CAUTION approvals), `convertApplicationSchema` (per plan §2.3).
- `lib/zod/tpn.ts`: `requestTpnCheckSchema` (just `applicationId`), `waiveTpnCheckSchema` (`{ applicationId, reason: string.min(10) }`), `captureTpnConsentSchema` (`{ applicantId, consentGiven: true, signedName, capturedAt }`).
**Verification:** `npx tsc --noEmit`.
**Manifest update:** zod table (add `application.ts`, `tpn.ts`).
**Clarifications needed:** None.

### T-P1-09 · applications & TPN API routes

**Depends on:** T-P1-05, T-P1-06, T-P1-08
**Read first:** `app/api/tenants/route.ts`, `app/api/onboarding/tenants/route.ts` (patterns); plan §2.4; decision #8
**Deliverables:**
- Route family per plan §2.4 table, minus the internal vetting routes. Replace the plan's `/api/applications/[id]/vetting/start` and `/api/applications/[id]/vetting/checks` with:
  - `POST /api/applications/[id]/tpn/request` → `requestTpnCheck`
  - `POST /api/applications/[id]/tpn/waive` → `waiveTpnCheck`
  - `POST /api/applications/[id]/consent` → captures applicant TPN consent on `Applicant`.
  - `POST /api/integrations/tpn/webhook` → calls `recordTpnResult` (unauthenticated but verifies TPN-supplied signature; this stays inert until TPN credentials arrive — return 501 with a clear message in stub mode).
- All application routes ADMIN/PM only, wrapped with `withOrg()`. Webhook is separate and auth is signature-based.
- Multipart handler for `/api/applications/[id]/documents` (see `uploadLeaseAgreement` route for reference).
**Verification:** hit each endpoint; 403 for non-ADMIN/PM; TPN webhook returns 501 without credentials; happy paths return expected shapes.
**Manifest update:** API table.
**Clarifications needed:** TPN webhook signature method (HMAC header name + algorithm) — part of the TPN clarifications block.

### T-P1-10 · application-form component

**Depends on:** T-P1-08
**Read first:** `components/forms/tenant-form.tsx`, `components/forms/lease-form.tsx`, `components/forms/onboard-tenant-form.tsx`; plan §0.1 (Regalis invariants); decisions #5, #6
**Deliverables:**
- `components/forms/application-form.tsx` — client component composed from shadcn primitives, matching the Regalis form pattern (same field sizing, label treatment, spacing). Posts to `/api/applications`.
- Include a **TPN consent block** on the form: a `Checkbox` labelled "Applicant consents to TPN screening" plus a typed-name field. On submit, the API call captures consent onto the `Applicant` record (via the `/consent` route) in the same request chain.
- **No duplicate-applicant detection** (decision #6) — do not fetch existing applicants on email blur, do not show any duplicate-warning UI.
**Verification:** form submits, consent block required before submission is enabled.
**Manifest update:** components table.
**Clarifications needed:** None.

### T-P1-11 · /applications list page

**Depends on:** T-P1-09
**Read first:** `app/(staff)/tenants/page.tsx`, `app/(staff)/leases/page.tsx` (list patterns); plan §2.5
**Deliverables:**
- `app/(staff)/applications/page.tsx` — list with stage filter tabs + reviewer filter + search. Uses `PageHeader`, shadcn `Table`.
- Show stage pill using the existing status-pill style (do not introduce a new badge primitive).
- Loading + empty states via `components/empty-state.tsx`.
**Verification:** page loads, filters work, empty state renders when no applications.
**Manifest update:** pages table.
**Clarifications needed:** None.

### T-P1-12 · /applications/new page

**Depends on:** T-P1-10
**Read first:** `app/(staff)/tenants/onboard/page.tsx` (server + client form composition)
**Deliverables:**
- `app/(staff)/applications/new/page.tsx` — renders `ApplicationForm`. On success, redirects to `/applications/[id]`.
**Verification:** full create flow works.
**Manifest update:** pages table.
**Clarifications needed:** None.

### T-P1-13 · /applications/[id] detail page

**Depends on:** T-P1-11
**Read first:** `app/(staff)/leases/[id]/page.tsx` (tabbed detail pattern); plan §2.5; decision #8
**Deliverables:**
- `app/(staff)/applications/[id]/page.tsx` — tabs: **Overview / TPN / Documents / Notes** (Vetting tab replaced by TPN).
- Overview: applicant card, property+unit card, affordability summary, stage history, decision CTAs. Show TPN status pill + recommendation pill in the header strip. Use existing badge primitives.
- TPN: shows current `TpnCheck` status. Actions available by status:
  - NOT_STARTED → "Request TPN check" button (disabled if applicant consent not captured; link to consent form).
  - REQUESTED → read-only "Awaiting TPN response" panel with requested-at timestamp.
  - RECEIVED → summary, recommendation, link to stored report PDF if any, full payload collapsible.
  - FAILED → error message + retry button.
  - WAIVED → reason + who waived + when + "re-request" button.
  - "Waive TPN check" always available as a secondary action (opens dialog, requires reason min 10 chars).
- Documents: upload + list via `/api/applications/[id]/documents`.
- Notes: timeline of `ApplicationNote`.
- Decision CTAs in Overview: "Approve" (disabled unless TPN recommendation PASS, or RECEIVED+CAUTION with override reason dialog, or WAIVED), "Decline", "Withdraw".
- "Convert to tenant" CTA visible only when `stage=APPROVED`; opens `ConvertApplicationDialog`.
**Verification:** each tab round-trips; CTA gating correct across every TPN status; attempts to approve without a qualifying TPN state are blocked with a helpful message.
**Manifest update:** pages table.
**Clarifications needed:** None.

### T-P1-14 · ConvertApplicationDialog client component

**Depends on:** T-P1-07, T-P1-13
**Read first:** `components/forms/onboard-tenant-form.tsx`
**Deliverables:**
- Client dialog that collects lease terms (start/end/rent/deposit) and `createPortalUser: boolean`, then POSTs to `/api/applications/[id]/convert`.
- On success: redirect to the created `/tenants/[id]`, show temp password toast if portal user created.
**Verification:** conversion produces exactly one Tenant + one DRAFT Lease + optional User; application stage flips to CONVERTED.
**Manifest update:** components table.
**Clarifications needed:** Global Q5.

### T-P1-15 · staff nav — Applications entry

**Depends on:** T-P1-11
**Read first:** `components/nav/sidebar.tsx`
**Deliverables:**
- Add `{ label: "Applications", href: "/applications", icon: ClipboardList }` in `getStaffNavItems()`. Position between Tenants and Leases (adjust after user check).
**Verification:** T-P0-09 validator passes.
**Manifest update:** none.
**Clarifications needed:** None.

### T-P1-16 · in-app notifications for application events (interim table)

**Depends on:** T-P1-05, T-P1-06
**Read first:** plan §2.7, §9.1 (full Notification schema — we ship the M1 subset now)
**Rationale:** the full notifications stack lands in Phase 8. To avoid rework, we ship the minimal Notification row shape now and Phase 8 extends it (adds `NotificationDelivery`, channel enums, etc.).
**Deliverables:**
- Prisma model `Notification` with M1-minimal fields only:
  ```prisma
  model Notification {
    id         String   @id @default(cuid())
    orgId      String
    userId     String?
    role       Role?
    type       String
    subject    String
    body       String
    payload    Json?
    entityType String?
    entityId   String?
    readAt     DateTime?
    createdAt  DateTime @default(now())
    org        Org   @relation(fields: [orgId], references: [id], onDelete: Cascade)
    user       User? @relation(fields: [userId], references: [id], onDelete: Cascade)
    @@index([orgId, userId, readAt])
  }
  ```
- `lib/services/notifications.ts` with `createNotification(ctx, input)` — writes an in-app row. No email/SMS delivery in M1.
- Hook points:
  - `submitApplication` → notify all ADMIN + PROPERTY_MANAGER users in the org (`type: "APPLICATION_SUBMITTED"`).
  - `approveApplication` → notify reviewer (`type: "APPLICATION_APPROVED"`).
  - `declineApplication` → notify reviewer (`type: "APPLICATION_DECLINED"`).
- Migration: `add_notification_m1`.
**Verification:** submit/approve/decline creates rows; `/tenant/notices` etc. are not built in M1 so staff visibility can be via a simple badge count in the top bar (optional — if visibility adds too much scope, defer to Phase 8).
**Manifest update:** models + services tables.
**Clarifications needed:** None.

### T-P1-17 · integration test — application lifecycle

**Depends on:** T-P1-14
**Read first:** any existing integration tests under `tests/`; decision #8
**Deliverables:**
- `tests/integration/applications.test.ts` covering:
  1. Create applicant (with TPN consent captured) → create application → submit.
  2. Request TPN check → simulate `recordTpnResult` with a PASS response payload (bypass adapter; call service directly).
  3. Approve application.
  4. Convert → assert Tenant + DRAFT Lease exist + Application `stage=CONVERTED`.
- A second test path: waive TPN → approve → convert (same assertions).
- A third test path: recommendation DECLINE → attempted approval returns ApiError.
**Verification:** `npm test` green. Any test that requires the live TPN adapter is marked `it.skip` with a TODO referring to the TPN clarifications block.
**Manifest update:** none.
**Clarifications needed:** None.

### T-P1-18 · M1 acceptance checklist

**Depends on:** T-P1-01..T-P1-17
**Read first:** plan §2.8
**Deliverables:** walkthrough confirming:
- Prospect can be captured without becoming Tenant/Lease.
- Vetting decision refuses approval without required checks.
- Convert produces exactly one Tenant + one DRAFT Lease + optional User.
- Declined/withdrawn applications remain visible in list filters.
- `CODEBASE.md` reflects every addition.
- T-P0-09 nav validator returns `ok: true` (flip to hard gate per Global Q7).
- `npm test` green; `npx tsc --noEmit` clean; `npx prisma migrate status` clean.
**Clarifications needed:** None.

---

# Milestone 2 — Itemised billing, payments, trust, statements

Break into tasks when M1 is merged. Outline below.

**Plan sections:** §4 (Phase 3 — utilities/billing), §5 (Phase 4 — payments/trust/statements).

### M2 clarifications needed (answer before M2 planning)

1. **Invoice field deprecation** — timeline for dropping `Invoice.amountCents` after `totalCents` is populated. Do we drop at end of Phase 3, end of Phase 4, or keep as cache indefinitely?
2. **Backfill strategy** — run `scripts/backfill-invoice-line-items.ts` in a maintenance window or live? (Idempotent either way, but affects finance review.)
3. **Meter ownership** — are meters per-unit always, or can a property have a shared meter across units? (Plan assumes per-unit.)
4. **Tariff scoping** — does a tariff apply org-wide by default, or must a property be explicitly attached? (Plan allows both; pick default.)
5. **Trust account count** — one per org (plan default) or one per landlord? This materially changes the ledger shape.
6. **Statement delivery cadence** — monthly auto-generation or on-demand only for M2?
7. **CSV import format** — which bank? Needs a sample CSV to spec the importer.
8. **Partial payment behavior** — if a receipt is less than the invoice total, do we auto-allocate oldest-first or require manual allocation?
9. **Reversal window** — can any allocation be reversed indefinitely, or only within N days?
10. **Statement regeneration** — re-generating for a locked period should be allowed for PDFs? (Default: yes, but ledger snapshot is frozen.)

### M2 task outline (to be expanded)

- **T-P3-01..05** · Invoice header/line-item refactor + migration + backfill script (plan §4.1).
- **T-P3-06..10** · Utility schema: Meter, MeterReading, UtilityTariff, BillingRun (plan §4.2).
- **T-P3-11..15** · utilities service, billing service (plan §4.3).
- **T-P3-16..18** · Billing API + pages (`/billing`, `/billing/runs/[id]`, meter + tariff pages).
- **T-P3-19** · Tenant itemised invoice page `/tenant/invoices/[id]`.
- **T-P3-20** · Staff dashboard refactor to split rent vs utility income.
- **T-P4-01..06** · Payment + Trust + Statement + Reconciliation schema (plan §5.1).
- **T-P4-07..12** · payments, trust, statements, reconciliations services (plan §5.2).
- **T-P4-13..15** · Re-wire `markInvoicePaid`, `activateLease` (deposit), `terminateLease` ledger hooks (plan §5.3).
- **T-P4-16..20** · Payment + trust + statement API + pages (plan §5.4).
- **T-P4-21** · Ledger reconciliation test — paidAmountCents reconstructed from ledger matches pre-migration values row-for-row.
- **T-M2-accept** · M2 acceptance checklist.

---

# Milestone 3 — Maintenance approvals + Inspections & offboarding

**Plan sections:** §7 (Phase 6 — approvals/maintenance), §3 (Phase 2 — inspections/offboarding).

### M3 locked approach (per decision #3)

- **Single-stage approval, routed by `Org.ownerType`.** `LANDLORD_DIRECT` → landlord is final approver. `PM_AGENCY` → ADMIN/PROPERTY_MANAGER is final approver, cost charged to landlord's account, landlord receives after-the-fact statement line and audit visibility.
- **No two-stage agent→landlord chain.** The `ManagingAgent` entity is a property-coordination role (inspections, ticket triage, notice delivery) and never a financial-approval gate.
- **Quotes are optional.** `resolveMaintenanceApprovalPath(org, request)` evaluates `quotedCostCents ?? estimatedCostCents ?? 0` against `Org.landlordApprovalThresholdCents`. If none of those is set and the work is not zero-cost, require staff to enter an estimate before requesting approval.
- **`ApprovalStage` enum is removed from plan §7.1.** Drop `stageTargetRole`. Replace with a single derived field `approver: Role` computed at request time from org ownerType.
- **`OrgFeature.AGENT_APPROVALS` is dropped from the enum entirely.** `OrgFeature.LANDLORD_APPROVALS` is kept — when `false` for a `LANDLORD_DIRECT` org, maintenance below threshold auto-approves without touching `Approval`.

### M3 remaining clarifications

1. **Vendor bidding** — multiple quotes per request with a "winning quote" marker, or single-quote only? (Default: multi-quote, one flagged `selected`.)
2. **Deposit settlement mutation** — after `finaliseDepositSettlement`, can it be reopened, or is it immutable? (Default: immutable, requires a new settlement with reason.)
3. **Inspection templates** — do we ship with a default area/item template per unit type (e.g. 1-bed apartment vs house), or start blank?
4. **Inspection photo storage** — direct Blob upload with signed URLs, or server-mediated upload? (Default: server-mediated via existing `uploadBlob`.)
5. **Move-out charge to invoice conversion** — do `MoveOutCharge` rows land on a final invoice line item, or stay as a standalone settlement? (Default: settlement-only; no invoice.)
6. **Multi-signer inspections** — must both landlord/PM and tenant sign for SIGNED_OFF, or either one is sufficient? (Default: both required for MOVE_IN and MOVE_OUT; tenant-only for INTERIM.)
7. **Post-approval landlord visibility** (PM_AGENCY mode) — does the landlord receive only a statement line, or also a push notification each time a threshold-exceeding repair is approved on their account? (Default: statement line + monthly digest; no per-event push.)

### M3 task outline

- **T-P6-01..05** · Approval extensions (stage, stageTargetRole, ApprovalStage enum); MaintenanceRequest extensions; Vendor/MaintenanceQuote/MaintenanceWorklog models.
- **T-P6-06..08** · `resolveMaintenanceApprovalPath` pure function in `lib/permissions.ts` + exhaustive unit tests across ownerType × threshold × agent × flag.
- **T-P6-09..12** · Maintenance service additions (`attachQuote`, `requestMaintenanceApproval`, `scheduleMaintenance`, `completeMaintenance`) + re-wiring of `updateMaintenanceRequest` refusal logic.
- **T-P6-13..15** · Approval service extension for two-stage chain + API.
- **T-P6-16..20** · Staff + landlord + agent maintenance/approvals pages.
- **T-P2-01..05** · Inspection + signature + offboarding schema (plan §3.1).
- **T-P2-06..09** · inspections, offboarding services (plan §3.2) + PDF report builder.
- **T-P2-10..11** · `terminateLease` opens OffboardingCase; `activateLease` soft-flags missing MOVE_IN.
- **T-P2-12..16** · Inspection API + pages + offboarding API + pages.
- **T-M3-accept** · M3 acceptance.

---

# Milestone 4 — Portals, dashboards, analytics + Notifications

**Plan sections:** §8 (Phase 7 — portals/analytics), §9 (Phase 8 — notifications).

### M4 clarifications needed

1. **Snapshot refresh cadence** — hourly (plan default) or real-time on mutation? Hourly is cheaper and simpler.
2. **Map library** — `react-leaflet` with OpenStreetMap tiles, or Mapbox (needs paid token)? Regalis look requires neutral base tiles — OSM with a muted style is the default.
3. **Chart library** — `recharts` (plan default) or something else already in stack? Confirm.
4. **Role data scoping** — landlord sees only own data (plan says yes); managing agent sees only assigned-property data (plan says yes); confirm.
5. **Area notice audience resolution** — resolved at creation time (static recipient list) or dynamically at delivery time? Default: static at creation.
6. **Payment alert cadence** — reminder at 7 days, overdue at 14 days, final at 30 days (plan defaults). Confirm.
7. **Usage alert comparison basis** — rolling 3-month average per meter (plan default), or per-lease since move-in? Default: 3-month rolling.
8. **Notification channel defaults** — email + in-app by default; SMS opt-in per org? Confirm.
9. **Outage vs Estate split** — same infrastructure, different enum (plan default). Confirm.
10. **Cron platform** — Vercel Cron Jobs (plan default) or another runner? Requires `vercel.ts` / `vercel.json` config.

### M4 task outline

- **T-P7-01..06** · Snapshot models + `lib/services/analytics-refresh.ts` + hourly Vercel Cron.
- **T-P7-07..10** · Role analytics services (`staff-analytics`, `landlord-analytics`, `agent-analytics`, `tenant-analytics`).
- **T-P7-11..14** · KPI registry (`lib/analytics/kpis.ts`), formatters, drill-targets, chart theme.
- **T-P7-15..20** · `components/analytics/*` primitives (every one Regalis-shaped per plan §0.1.3).
- **T-P7-21..26** · Staff dashboard rebuild into command-center modules across `/dashboard` + subroutes.
- **T-P7-27..32** · Landlord portal build-out (every route in plan §8.3 landlord list).
- **T-P7-33..38** · Agent portal build-out.
- **T-P7-39..42** · Tenant portal additions.
- **T-P8-01..05** · Notification, NotificationDelivery, AreaNotice, NoticeAudience, UsageAlertRule, UsageAlertEvent schema (plan §9.1).
- **T-P8-06..10** · notifications service + dispatchPending cron + adapter migration of existing email/SMS call sites.
- **T-P8-11..15** · Area notices, usage alerts, payment alerts services + crons.
- **T-P8-16..20** · Notice + alert pages across roles.
- **T-M4-accept** · Dead-link sweep, visual diff screenshots against §0.1 invariants, full test run.

---

# Milestone 5 — Annual packs + Backup/DR

**Plan sections:** §6 (Phase 5 — annual/tax), §10 (Phase 9 — backup/DR).

### M5 clarifications needed

1. **Tax pack scope** — per Global Q4: accountant-pack only. Confirm final stance before PDF templates are written.
2. **Financial year start** — March 1 (ZA default) or configurable per org?
3. **Locked-year behavior** — can a locked year still have PDF regeneration, or are PDFs frozen to their original bytes?
4. **Backup location** — Vercel Blob (plan default), or an external S3/GCS bucket? External adds cost but better separation.
5. **DB backup cadence** — daily `pg_dump` (plan default) vs Neon's point-in-time-restore only? Plan says both; confirm we need the external dump.
6. **Encryption copy** — final admin-page wording: "Data is encrypted at rest by Neon (Postgres) and Vercel Blob (file storage) using provider-managed keys." Approve verbatim or edit.
7. **Verification cadence** — weekly (plan default). Confirm.
8. **Retention** — 30 days (plan default). Confirm.

### M5 task outline

- **T-P5-01..04** · FinancialYear, AnnualReconciliation, TaxPack, TaxPackLine schema.
- **T-P5-05..07** · year-end, tax-reporting services + PDF/CSV builders.
- **T-P5-08..10** · Reports API + staff pages + landlord-facing report pages.
- **T-P9-01..03** · Document model extension (checksum, retention, encryptionNote); BackupSnapshot, BackupVerificationRun models.
- **T-P9-04..05** · backup service + weekly verification cron.
- **T-P9-06** · `/settings/backup` admin page.
- **T-M5-accept** · Final acceptance.

---

# Done = ready to merge to master

- All milestone acceptance tasks complete.
- `npm test` green.
- `npx tsc --noEmit` clean.
- `npx prisma migrate status` clean.
- `CODEBASE.md` current.
- T-P0-09 nav validator green as a hard gate.
- Visual-diff screenshots against §0.1 attached to the final PR.
