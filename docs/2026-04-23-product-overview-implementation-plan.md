# Product Overview Implementation Plan

Source deck: `C:\Users\liamp\Downloads\Product Overview.pptx`
Gap source: `docs/2026-04-23-product-overview-gap-checklist.md`
Planning date: `2026-04-23`

This plan closes every capability in the deck. It is written to be executed, not skimmed — every phase names exact schema fields, service function signatures, route-to-service mapping, page composition, and the specific hook into the existing code.

## 0. Ground rules

1. **Scope exclusion (only one):** no Stitch or live gateway settlement. `PaymentReceipt` is populated by manual capture and CSV import. If Stitch is added later it becomes an adapter that writes `PaymentReceipt` + reconciliation records — it must not change the ledger model.
2. **No dead links.** A sidebar/card/CTA/notification link that does not resolve is a regression. Nav entries ship in the same PR as their destination page, API, and service.
3. **Layering stays as-is:** Prisma → `lib/services/*` (business logic) → `lib/zod/*` (validation) → `app/api/*` route handlers wrapped with `withOrg()` from `lib/auth/with-org.ts` → pages under role-segmented layouts.
4. **Money is `Int` cents.** Always. Display via `formatZar()` in `lib/format.ts`.
5. **Every financial mutation writes an `AuditLog` row.** Every approval writes `Approval`. Every notice writes a `Notification` (in-app) before any email/SMS attempt.
6. **Invoice becomes a header + line items** (phase 3). Do not keep bolting rent-only totals onto `Invoice.amountCents` after phase 3 lands.
7. **Encryption posture (deck "full Encryption"):** at-rest encryption is provided by Neon (Postgres) and Vercel Blob by default. We do not manage our own KMS. The app surfaces `encryptionAtRest: "provider-default"` in the admin backup page and does not claim BYOK.
8. **Regalis visual direction is locked (see §0.1).** No phase may ship UI that departs from it. New complexity is absorbed into modular panels; existing primitives are reused before new ones are introduced.

## 0.1 Regalis visual direction (binding for every phase)

The current editorial shell is the product's identity. Every new page, dashboard, form, and component in this plan extends it. Do not swap in a third-party admin theme, do not introduce a second design language for "data-dense" screens, and do not restyle the shell to look like another property management product.

### 0.1.1 Shell invariants (do not change)

- **Typography:** mono eyebrow labels (uppercase, tracked), serif headline numerals, sans body. Do not replace serif numerals with sans. Do not introduce a new display face.
- **Palette:** current Regalis neutrals and accent. No new accent colors per phase — if a new status needs a color, reuse the existing semantic palette used by `LeaseStatusBadge`, `OccupancyBadge`, `MaintenanceStatusBadge`.
- **Card language:** refined borders, left accent rail on `StatCard`, deliberate whitespace, no card shadows. Do not switch to elevated/shadowed cards to "add depth."
- **Headers:** every page uses `components/page-header.tsx` (`PageHeader` with eyebrow / title / description / action). No page introduces a custom page header.
- **Empty / loading / error:** every list, table, and panel uses `components/empty-state.tsx`. No phase ships a surface without the three states.
- **Navigation:** role sidebars follow the existing `Sidebar` / `DesktopSidebar` / `MobileNav` composition. New portals/nav items plug into `getStaffNavItems()` / `getLandlordNavItems()` / `getAgentNavItems()` / `getTenantNavItems()` — do not author new sidebar shells.
- **Badges:** status pills follow the existing dot + label format. Do not introduce filled/solid badges.
- **Forms:** shadcn primitives from `components/ui/*` composed in the `components/forms/*` pattern already established by `lease-form.tsx`, `tenant-form.tsx`, `onboard-tenant-form.tsx`. No new form libraries.
- **Buttons and dialogs:** shadcn primitives only. Do not hand-roll a replacement button system for a phase.

### 0.1.2 How density increases without breaking the look

Density comes from **more modular panels within the same shell**, not from cramming text into existing cards or switching visual language. When a dashboard needs more information:

1. Split it across additional `StatCard` rows, funnel panels, sparkline cards, ranked-list panels, and status strips.
2. Each added panel uses the same card border, eyebrow, and typographic hierarchy as the existing dashboard.
3. Each panel has a single responsibility and either drills down or filters into a destination.

### 0.1.3 New analytics components must be Regalis-shaped

`components/analytics/*` (added in Phase 7) inherit the shell. Explicit rules for each:

- `metric-tile.tsx` — visually a `StatCard` variant with a serif number, mono eyebrow, optional `trend-chip`. Reuses `StatCard` internally; does not introduce a parallel card primitive.
- `sparkline.tsx` — thin stroke, single accent color from existing palette, no axis labels, no gridlines.
- `funnel.tsx` — horizontal stacked bars with eyebrow labels for each stage. No 3D, no gradients.
- `ranked-list.tsx` — mono eyebrow, serif rank numerals, right-aligned value column with the same typography as `StatCard`.
- `map-panel.tsx` — neutral-tone base tiles (light mode) or muted dark tiles (dark mode). Markers use the same status palette as badges. No satellite tiles, no colored base maps.
- `status-strip.tsx` — inline pills using the existing badge component.
- `command-center-card.tsx` — composition wrapper: header (eyebrow + title + action), body slot, optional footer CTA. Same border and spacing as `StatCard`.
- `trend-chip.tsx` — small pill with +/- delta, colored by existing semantic palette.
- `segment-donut.tsx` — thin stroke, no drop shadow, legend below the chart using the mono eyebrow style.
- `comparison-bars.tsx` — thin bars, no gradients.

Chart library: `recharts` with a single shared theme file (`lib/analytics/chart-theme.ts`) that pulls colors from the Regalis palette tokens. No per-chart ad-hoc colors.

### 0.1.4 Dashboard composition rules (binding for Phase 7)

- Row 1: executive summary cards (`StatCard` / `metric-tile`). Period shown in the eyebrow.
- Row 2: trend and distribution modules (`sparkline` cards, `segment-donut`, `funnel`).
- Row 3: queue and action modules (`ranked-list`, `status-strip`, `command-center-card` with tables).
- Every module displays the period it covers and its comparison basis in the mono eyebrow.
- Every module either drills through to a filtered destination route or opens a detail dialog.
- No module shows a number without a source definition registered in `lib/analytics/kpis.ts` (§8.6).

### 0.1.5 What the reference imagery is used for, and what it is not

The command-center reference in the deck informs density, hierarchy, and interaction patterns (drill-through, filter, ranked queues, map overlays). It does not inform palette, typography, card treatment, or shell chrome. Those stay Regalis.

### 0.1.6 Review gate

Every phase PR that touches UI must include screenshots of:
- one existing page (unchanged) for visual diff context
- the new surface in light and dark mode
- at least one empty state and one loading state for the new surface

A reviewer rejects the PR if it introduces a new design primitive that duplicates an existing one (e.g. a new card, header, or badge).

## 1. Cross-cutting additions (Phase 0 — lands first)

These are used by every later phase. Build in one PR.

### 1.1 Schema additions (`prisma/schema.prisma`)

```prisma
enum FeatureFlagKey {
  UTILITIES_BILLING
  TRUST_ACCOUNTING
  AREA_NOTICES
  LANDLORD_APPROVALS   // when false on a LANDLORD_DIRECT org, below-threshold work auto-approves
  USAGE_ALERTS
  PAYMENT_ALERTS
  ANNUAL_PACKS
}
// Note: AGENT_APPROVALS is intentionally not listed. Approval routing is by Org.ownerType (see §7).

model OrgFeature {
  id        String         @id @default(cuid())
  orgId     String
  key       FeatureFlagKey
  enabled   Boolean        @default(false)
  config    Json?
  updatedAt DateTime       @updatedAt
  org       Org            @relation(fields: [orgId], references: [id], onDelete: Cascade)
  @@unique([orgId, key])
}

model AuditLog {
  id          String   @id @default(cuid())
  orgId       String
  actorUserId String?
  entityType  String   // "Invoice", "Approval", "Lease", ...
  entityId    String
  action      String   // "created", "allocated", "approved", "reversed", ...
  diff        Json?    // before/after deltas for financial mutations
  payload     Json?
  createdAt   DateTime @default(now())
  org         Org      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  actor       User?    @relation(fields: [actorUserId], references: [id], onDelete: SetNull)
  @@index([orgId, entityType, entityId])
  @@index([orgId, createdAt])
}
```

Add `orgFeatures OrgFeature[]` and `auditLogs AuditLog[]` to `Org`. Add `auditLogs AuditLog[]` to `User`.

### 1.2 Services

- `lib/services/audit.ts`
  - `writeAudit(ctx: RouteCtx, input: { entityType: string; entityId: string; action: string; diff?: unknown; payload?: unknown }): Promise<void>`
  - Used by every service method that mutates financial state, approvals, or lease state.
- `lib/services/org-features.ts`
  - `getOrgFeatures(orgId: string): Promise<Record<FeatureFlagKey, boolean>>`
  - `setOrgFeature(ctx, key: FeatureFlagKey, enabled: boolean, config?: unknown)`
  - `assertFeature(ctx, key: FeatureFlagKey): void` — throws `ApiError.forbidden` if disabled.

### 1.3 Validation & API

- `lib/zod/org-features.ts` — `setOrgFeatureSchema`.
- `app/api/settings/features/route.ts` — `GET` → `getOrgFeatures`, `POST` → `setOrgFeature`. ADMIN only.

### 1.4 Pages

- `app/(staff)/settings/features/page.tsx` — toggle list, ADMIN only (render-guard by `session.user.role`).
- Add a "Features" row to the staff settings nav in `components/nav/sidebar.tsx` (`getStaffNavItems()`).

### 1.5 Nav cleanup (immediate)

- `components/nav/landlord-sidebar.tsx` and `agent-sidebar.tsx` currently advertise routes that don't exist. Remove items from `getLandlordNavItems()` / `getAgentNavItems()` until the matching phase lands. Only keep `/landlord` and `/agent` (the dashboard roots) at this point.
- Add a unit test or linter rule in `lib/nav/validate.ts` that asserts every nav `href` has a matching `app/**/page.tsx`. Run it in CI.

### 1.6 Data backfill

- Script: `scripts/backfill-property-owners.ts` — for every `Property` with `landlordId IS NULL`, assign the single `Landlord` in that org if one exists, else leave null and emit a report.
- Same for `assignedAgentId` where the org has exactly one `ManagingAgent`.

### 1.7 Manifest

Update `CODEBASE.md`:
- Add `OrgFeature`, `AuditLog` to the schema table.
- Add `lib/services/audit.ts`, `lib/services/org-features.ts` to the services table.
- Add `/api/settings/features` to the API table.
- Add `/settings/features` to the pages table.

---

## 2. Phase 1 — Tenant application & vetting

Covers deck items: *Tenant Application*, *Tenant Vetting*. Feeds the existing `onboardTenant` flow.

### 2.1 Schema

```prisma
enum ApplicationStage {
  DRAFT SUBMITTED UNDER_REVIEW VETTING APPROVED DECLINED CONVERTED WITHDRAWN
}

enum ApplicationDecision { PENDING APPROVED DECLINED }

enum VettingCheckType {
  ID_VERIFICATION EMPLOYMENT INCOME CREDIT LANDLORD_REFERENCE BANK_STATEMENT
}

enum VettingCheckStatus { PENDING PASSED FAILED WAIVED }

model Applicant {
  id         String   @id @default(cuid())
  orgId      String
  firstName  String
  lastName   String
  email      String
  phone      String
  idNumber   String?
  employer   String?
  grossMonthlyIncomeCents Int?
  netMonthlyIncomeCents   Int?
  createdAt  DateTime @default(now())
  org        Org      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  applications Application[]
  @@index([orgId, email])
}

model Application {
  id              String            @id @default(cuid())
  orgId           String
  applicantId     String
  propertyId      String?
  unitId          String?
  requestedMoveIn DateTime?
  affordabilityRatio Float?         // rent / netMonthlyIncome
  sourceChannel   String?
  assignedReviewerId String?
  stage           ApplicationStage  @default(DRAFT)
  decision        ApplicationDecision @default(PENDING)
  decisionReason  String?
  decidedAt       DateTime?
  convertedTenantId String?         // set on convertApplicationToTenant
  convertedLeaseId  String?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  org             Org               @relation(fields: [orgId], references: [id], onDelete: Cascade)
  applicant       Applicant         @relation(fields: [applicantId], references: [id], onDelete: Cascade)
  property        Property?         @relation(fields: [propertyId], references: [id])
  unit            Unit?             @relation(fields: [unitId], references: [id])
  reviewer        User?             @relation("ApplicationReviewer", fields: [assignedReviewerId], references: [id])
  convertedTenant Tenant?           @relation(fields: [convertedTenantId], references: [id])
  vettingChecks   VettingCheck[]
  documents       ApplicationDocument[]
  notes           ApplicationNote[]
  @@index([orgId, stage])
}

model VettingCheck {
  id            String @id @default(cuid())
  applicationId String
  type          VettingCheckType
  status        VettingCheckStatus @default(PENDING)
  notes         String?
  resultPayload Json?
  completedAt   DateTime?
  completedById String?
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  @@unique([applicationId, type])
}

model ApplicationDocument {
  id            String @id @default(cuid())
  applicationId String
  storageKey    String
  filename      String
  mimeType      String
  sizeBytes     Int
  uploadedById  String?
  createdAt     DateTime @default(now())
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
}

model ApplicationNote {
  id            String @id @default(cuid())
  applicationId String
  authorId      String
  body          String
  createdAt     DateTime @default(now())
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  author        User        @relation(fields: [authorId], references: [id])
}
```

Relations added to existing models: `Org.applicants`, `Org.applications`, `Property.applications`, `Unit.applications`, `Tenant.convertedFromApplication Application?`, `User.assignedApplications Application[]` (inverse of `ApplicationReviewer`).

### 2.2 Services — `lib/services/applications.ts`

```ts
listApplications(ctx, filters: { stage?; assignedReviewerId?; propertyId?; q? }): Promise<Application[]>
getApplication(ctx, id): Promise<Application & { applicant; vettingChecks; documents; notes }>
createApplication(ctx, input: CreateApplicationInput): Promise<Application>   // stage=DRAFT
submitApplication(ctx, id): Promise<Application>                               // DRAFT → SUBMITTED, notify staff
assignReviewer(ctx, id, userId): Promise<Application>
addApplicationNote(ctx, id, body): Promise<ApplicationNote>
uploadApplicationDocument(ctx, id, file): Promise<ApplicationDocument>         // uses lib/blob.ts
withdrawApplication(ctx, id, reason): Promise<Application>
```

`lib/services/vetting.ts`
```ts
startVetting(ctx, applicationId): Promise<Application>                         // SUBMITTED/UNDER_REVIEW → VETTING, seeds default VettingCheck rows
recordVettingCheck(ctx, applicationId, type, input): Promise<VettingCheck>
approveApplication(ctx, id, input: { note? }): Promise<Application>            // requires all required VettingChecks PASSED/WAIVED
declineApplication(ctx, id, input: { reason }): Promise<Application>
convertApplicationToTenant(ctx, id, input: ConvertInput): Promise<{ tenant; lease; application }>
```

`convertApplicationToTenant` **delegates to the existing `onboardTenant()` in `lib/services/onboarding.ts`** with `{ fromApplicationId: id }`. That handler:
1. Creates `Tenant` from `Applicant` fields (single transaction).
2. Creates DRAFT `Lease` with rent/start/unit from conversion input.
3. Optionally creates a portal `User` + returns temp password (same behavior as today).
4. Sets `Application.convertedTenantId`, `convertedLeaseId`, `stage=CONVERTED`.
5. Writes `AuditLog` rows for each mutation.

### 2.3 Validation — `lib/zod/application.ts`, `lib/zod/vetting.ts`

Schemas: `createApplicationSchema`, `assignReviewerSchema`, `applicationDecisionSchema`, `recordVettingCheckSchema`, `convertApplicationSchema` (`{ startDate; endDate; rentAmountCents; depositAmountCents; createPortalUser: boolean }`).

### 2.4 API — new route family

| Method | Path | Handler call |
|---|---|---|
| GET, POST | `/api/applications` | `listApplications`, `createApplication` |
| GET, PATCH | `/api/applications/[id]` | `getApplication`, `updateApplication` |
| POST | `/api/applications/[id]/submit` | `submitApplication` |
| POST | `/api/applications/[id]/assign` | `assignReviewer` |
| POST | `/api/applications/[id]/vetting/start` | `startVetting` |
| POST | `/api/applications/[id]/vetting/checks` | `recordVettingCheck` |
| POST | `/api/applications/[id]/decision` | `approveApplication` / `declineApplication` (switch on body) |
| POST | `/api/applications/[id]/convert` | `convertApplicationToTenant` |
| POST | `/api/applications/[id]/documents` | `uploadApplicationDocument` |
| POST | `/api/applications/[id]/notes` | `addApplicationNote` |
| POST | `/api/applications/[id]/withdraw` | `withdrawApplication` |

All ADMIN/PROPERTY_MANAGER only, wrapped with `withOrg()`.

### 2.5 Pages — staff portal

| Route | File |
|---|---|
| `/applications` | `app/(staff)/applications/page.tsx` — filter by stage/reviewer, stage funnel header |
| `/applications/new` | `app/(staff)/applications/new/page.tsx` — uses `components/forms/application-form.tsx` |
| `/applications/[id]` | `app/(staff)/applications/[id]/page.tsx` — detail tabs: Overview / Vetting / Documents / Notes |
| `/applications/[id]/convert` | client component on detail page; opens a dialog with `ConvertApplicationDialog` |

Wire into staff sidebar: add `{ label: "Applications", href: "/applications", icon: ClipboardList }` to `getStaffNavItems()`.

### 2.6 Wiring into existing code

- `components/forms/onboard-tenant-form.tsx` stays as today for walk-in onboarding. Application-conversion flow routes through the same form pre-filled from `Application`.
- `app/(staff)/tenants/onboard/page.tsx` accepts `?applicationId=` and pre-fills the form via `getApplication()`.
- Add "Convert to tenant" CTA on `/applications/[id]` that opens the onboard form with the query param.

### 2.7 Notifications (in-app only at this phase; email/SMS arrives in phase 8)

- On `submitApplication`: write `Notification` records for all `ADMIN` and `PROPERTY_MANAGER` users in the org.
- On `approveApplication` / `declineApplication`: write a `Notification` for the applicant's portal user if one exists.

Phase 8 will add email/SMS delivery on top of the same records.

### 2.8 Acceptance

- Prospect captured without becoming a `Tenant` or `Lease`.
- Every `VettingCheck` stored structurally; decision refuses to approve if any required check is not PASSED/WAIVED.
- "Convert" produces exactly one `Tenant` + one DRAFT `Lease` + optional `User`, identical to today's `onboardTenant()` output.
- `CODEBASE.md` updated with all new models, services, routes, pages.

---

## 3. Phase 2 — Inspections & offboarding

Covers: *Handover Inspection*, *Outgoing Inspection*, *Repairs/Cleaning Summary*, *Tenant Offboarding*, *Finalise Accounts/Payments* (move-out charges half — final settlement bookkeeping lives in phase 4).

### 3.1 Schema

```prisma
enum InspectionType   { MOVE_IN MOVE_OUT INTERIM }
enum InspectionStatus { SCHEDULED IN_PROGRESS COMPLETED SIGNED_OFF CANCELLED }
enum ConditionRating  { EXCELLENT GOOD FAIR POOR DAMAGED }
enum ChargeResponsibility { LANDLORD TENANT SHARED }

model Inspection {
  id           String           @id @default(cuid())
  orgId        String
  leaseId      String
  unitId       String
  type         InspectionType
  status       InspectionStatus @default(SCHEDULED)
  scheduledAt  DateTime
  startedAt    DateTime?
  completedAt  DateTime?
  signedOffAt  DateTime?
  staffUserId  String?
  agentId      String?
  summary      String?
  reportKey    String?          // Blob storage key for generated PDF
  org          Org   @relation(fields: [orgId], references: [id], onDelete: Cascade)
  lease        Lease @relation(fields: [leaseId], references: [id], onDelete: Cascade)
  unit         Unit  @relation(fields: [unitId], references: [id], onDelete: Cascade)
  areas        InspectionArea[]
  signatures   InspectionSignature[]
  @@index([orgId, type, status])
}

model InspectionArea {
  id            String @id @default(cuid())
  inspectionId  String
  name          String            // "Kitchen", "Master Bedroom", ...
  orderIndex    Int
  inspection    Inspection        @relation(fields: [inspectionId], references: [id], onDelete: Cascade)
  items         InspectionItem[]
}

model InspectionItem {
  id               String @id @default(cuid())
  areaId           String
  label            String           // "Walls", "Floor", ...
  condition        ConditionRating
  note             String?
  estimatedCostCents Int?
  responsibility   ChargeResponsibility?
  area             InspectionArea   @relation(fields: [areaId], references: [id], onDelete: Cascade)
  photos           InspectionPhoto[]
}

model InspectionPhoto {
  id        String @id @default(cuid())
  itemId    String
  storageKey String
  caption   String?
  item      InspectionItem @relation(fields: [itemId], references: [id], onDelete: Cascade)
}

model InspectionSignature {
  id           String @id @default(cuid())
  inspectionId String
  signerRole   Role
  signerUserId String?
  signedName   String
  signedAt     DateTime @default(now())
  ipAddress    String?
  userAgent    String?
  inspection   Inspection @relation(fields: [inspectionId], references: [id], onDelete: Cascade)
}

model OffboardingCase {
  id          String @id @default(cuid())
  orgId       String
  leaseId     String @unique
  openedAt    DateTime @default(now())
  closedAt    DateTime?
  status      String   // "OPEN" | "SETTLING" | "CLOSED"
  org         Org   @relation(fields: [orgId], references: [id], onDelete: Cascade)
  lease       Lease @relation(fields: [leaseId], references: [id], onDelete: Cascade)
  tasks       OffboardingTask[]
  charges     MoveOutCharge[]
  settlement  DepositSettlement?
}

model OffboardingTask {
  id        String @id @default(cuid())
  caseId    String
  label     String             // "Schedule move-out inspection", "Final meter reading", "Return keys"
  done      Boolean @default(false)
  doneAt    DateTime?
  doneById  String?
  case      OffboardingCase @relation(fields: [caseId], references: [id], onDelete: Cascade)
}

model MoveOutCharge {
  id          String @id @default(cuid())
  caseId      String
  label       String
  amountCents Int
  responsibility ChargeResponsibility
  sourceInspectionItemId String?
  case        OffboardingCase @relation(fields: [caseId], references: [id], onDelete: Cascade)
}

model DepositSettlement {
  id               String @id @default(cuid())
  caseId           String @unique
  depositHeldCents Int
  chargesAppliedCents Int
  refundDueCents   Int
  balanceOwedCents Int
  statementKey     String?   // generated PDF in Blob
  finalizedAt      DateTime?
  case             OffboardingCase @relation(fields: [caseId], references: [id])
}
```

### 3.2 Services

`lib/services/inspections.ts`
```ts
listInspections(ctx, filters): Promise<Inspection[]>
getInspection(ctx, id): Promise<Inspection & { areas: {items, photos}[]; signatures }>
createInspection(ctx, input: { leaseId; type; scheduledAt; templateKey? }): Promise<Inspection>
startInspection(ctx, id): Promise<Inspection>
recordArea(ctx, id, input): Promise<InspectionArea>
recordItem(ctx, areaId, input): Promise<InspectionItem>
uploadItemPhoto(ctx, itemId, file): Promise<InspectionPhoto>
completeInspection(ctx, id, summary): Promise<Inspection>   // triggers PDF build
signInspection(ctx, id, input: { signerRole; signedName }): Promise<InspectionSignature>
```

`lib/services/offboarding.ts`
```ts
openOffboardingCase(ctx, leaseId): Promise<OffboardingCase>
listOffboardingTasks(ctx, caseId): Promise<OffboardingTask[]>
toggleOffboardingTask(ctx, taskId, done: boolean): Promise<OffboardingTask>
addMoveOutCharge(ctx, caseId, input): Promise<MoveOutCharge>            // can reference InspectionItem
finaliseDepositSettlement(ctx, caseId): Promise<DepositSettlement>       // sum charges, compare to Lease.depositAmountCents
closeOffboardingCase(ctx, caseId): Promise<OffboardingCase>              // requires lease.state=TERMINATED
```

`lib/reports/inspection-pdf.ts` — deterministic PDF builder (`renderInspectionReport(data)`) mirroring the approach in `lib/lease-template.ts`. Output uploaded via `uploadBlob()` and stored as `Inspection.reportKey` on `completeInspection`.

### 3.3 Wiring into existing code

- `terminateLease()` in `lib/services/leases.ts` is modified: **after** state transition, it calls `openOffboardingCase(ctx, leaseId)` and seeds the default task list:
  1. `"Confirm move-out date"`
  2. `"Schedule move-out inspection"`
  3. `"Final meter reading"` (only if `OrgFeature.UTILITIES_BILLING` enabled)
  4. `"Collect keys"`
  5. `"Apply deposit"`
  6. `"Issue deposit statement"`
- `activateLease()` in `lib/services/leases.ts` is modified: after activation, if no `Inspection` of type `MOVE_IN` exists for the lease, write an `AuditLog` entry flagging it missing (soft gate — does not block activation, but dashboards surface it).

### 3.4 Validation, API, Pages

- `lib/zod/inspection.ts`, `lib/zod/offboarding.ts`.
- API: `/api/inspections` (GET, POST), `/api/inspections/[id]` (GET, PATCH), `/api/inspections/[id]/complete` (POST), `/api/inspections/[id]/sign` (POST), `/api/inspections/[id]/areas` (POST), `/api/inspection-items/[id]/photos` (POST), `/api/offboarding` (GET, POST), `/api/offboarding/[id]/tasks/[taskId]` (PATCH), `/api/offboarding/[id]/charges` (POST, GET), `/api/offboarding/[id]/finalise` (POST).
- Staff pages: `/inspections`, `/inspections/[id]`, `/leases/[id]/move-in` (creates inspection if none + redirects), `/leases/[id]/move-out` (same), `/offboarding`, `/offboarding/[id]`.
- Add `{label: "Inspections", href: "/inspections"}` and `{label: "Offboarding", href: "/offboarding"}` to staff nav.

### 3.5 Generated artifacts

- `MOVE_IN` inspection PDF written on `completeInspection`; linked on tenant portal at `/tenant/lease`.
- `MOVE_OUT` inspection PDF same mechanism.
- `DepositSettlement.statementKey` generated on `finaliseDepositSettlement`, visible to staff + tenant.

### 3.6 Acceptance

- Every activated lease can have a signed `MOVE_IN` `Inspection`.
- Terminating a lease opens an `OffboardingCase` with the default task list.
- `MoveOutCharge` rows can link to `InspectionItem.id` for provenance.
- `DepositSettlement.refundDueCents + balanceOwedCents` reconciles against `Lease.depositAmountCents` and the sum of charges.

---

## 4. Phase 3 — Utilities & usage-aware invoicing

Covers: *Rental Income & Utilities*, *Auto monthly invoices based on rent + usage*, *Usage Alerts* data source.

### 4.1 Invoice refactor (critical)

Current: `Invoice { amountCents, status, paidAt, paidAmountCents }` keyed `@@unique([leaseId, periodStart])`.

New shape (additive migration, then backfill, then drop old write paths):

```prisma
model Invoice {
  // existing fields kept:
  id, orgId, leaseId, periodStart, dueDate, status, paidAt, paidAmountCents, paidNote
  // replaced:
  subtotalCents      Int   @default(0)
  taxCents           Int   @default(0)
  totalCents         Int   @default(0)    // cached aggregate of line items + tax
  amountCents        Int   // KEEP during migration, mirrors totalCents; drop in a follow-up after all readers migrate
  // new:
  billingRunId       String?
  lineItems          InvoiceLineItem[]
  billingRun         BillingRun? @relation(fields: [billingRunId], references: [id])
}

enum InvoiceLineItemKind { RENT UTILITY_WATER UTILITY_ELECTRICITY UTILITY_GAS UTILITY_SEWER UTILITY_REFUSE ADJUSTMENT LATE_FEE DEPOSIT_CHARGE }

model InvoiceLineItem {
  id           String @id @default(cuid())
  invoiceId    String
  kind         InvoiceLineItemKind
  description  String
  quantity     Decimal?  // e.g. kWh
  unitRateCents Int?
  amountCents  Int
  sourceType   String?   // "MeterReading" | "Lease" | "Manual" | "Inspection" | "Override"
  sourceId     String?
  estimated    Boolean @default(false)
  invoice      Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  @@index([invoiceId])
}
```

Backfill script: `scripts/backfill-invoice-line-items.ts` — for every existing `Invoice`, insert a single `RENT` line item with `amountCents = invoice.amountCents`, set `subtotalCents = totalCents = amountCents`, `taxCents = 0`.

### 4.2 Utility schema

```prisma
enum UtilityType         { WATER ELECTRICITY GAS SEWER REFUSE OTHER }
enum MeterReadingSource  { MANUAL IMPORT ESTIMATED ROLLOVER }
enum TariffStructure     { FLAT TIERED }

model Meter {
  id         String @id @default(cuid())
  orgId      String
  unitId     String
  type       UtilityType
  serial     String?
  installedAt DateTime?
  retiredAt   DateTime?
  org        Org  @relation(fields: [orgId], references: [id], onDelete: Cascade)
  unit       Unit @relation(fields: [unitId], references: [id], onDelete: Cascade)
  readings   MeterReading[]
  @@index([orgId, unitId, type])
}

model MeterReading {
  id        String @id @default(cuid())
  meterId   String
  takenAt   DateTime
  readingValue Decimal
  source    MeterReadingSource
  recordedById String?
  meter     Meter @relation(fields: [meterId], references: [id], onDelete: Cascade)
  @@unique([meterId, takenAt])
  @@index([meterId, takenAt])
}

model UtilityTariff {
  id           String @id @default(cuid())
  orgId        String
  propertyId   String?        // optional scope
  type         UtilityType
  structure    TariffStructure
  effectiveFrom DateTime
  effectiveTo   DateTime?
  flatUnitRateCents Int?
  tieredJson   Json?           // [{ uptoQty, unitRateCents }]
  org          Org       @relation(fields: [orgId], references: [id], onDelete: Cascade)
  property     Property? @relation(fields: [propertyId], references: [id])
  @@index([orgId, type, effectiveFrom])
}

model BillingRun {
  id          String @id @default(cuid())
  orgId       String
  periodStart DateTime
  status      String   // "DRAFT" | "READY" | "PUBLISHED" | "FAILED"
  createdById String?
  createdAt   DateTime @default(now())
  publishedAt DateTime?
  summary     Json?    // counts: invoicesGenerated, estimatedLineItems, missingReadings
  org         Org       @relation(fields: [orgId], references: [id], onDelete: Cascade)
  invoices    Invoice[]
  @@unique([orgId, periodStart])
}
```

### 4.3 Services

`lib/services/utilities.ts`
```ts
listMeters(ctx, filters): Promise<Meter[]>
createMeter(ctx, input): Promise<Meter>
recordMeterReading(ctx, input): Promise<MeterReading>
latestReading(ctx, meterId, asOf: Date): Promise<MeterReading | null>
estimateMissingReading(ctx, meterId, asOf: Date): Promise<{ value: Decimal; method: "ROLLING_AVG" | "ROLLOVER" }>
listTariffs(ctx, filters): Promise<UtilityTariff[]>
upsertTariff(ctx, input): Promise<UtilityTariff>
```

`lib/services/billing.ts`
```ts
calculateUtilityChargesForLease(ctx, leaseId, periodStart): Promise<InvoiceLineItemDraft[]>
generateBillingRun(ctx, periodStart): Promise<BillingRun>                 // creates run + DRAFT invoices with rent + utility line items
rebuildInvoiceTotals(invoiceId): Promise<void>                             // recalculates subtotal/tax/total/amountCents from line items
publishBillingRun(ctx, runId): Promise<BillingRun>                         // flips invoices DRAFT → DUE, writes AuditLog + Notification
previewBillingRun(ctx, periodStart): Promise<BillingRunPreview>            // dry-run for the UI
addManualLineItem(ctx, invoiceId, input): Promise<InvoiceLineItem>         // rebuilds totals
removeLineItem(ctx, lineItemId): Promise<void>
```

`generateBillingRun` drives off `ensureInvoicesForLease()` pattern in `lib/services/invoices.ts` but replaces flat rent insertion with:
1. Create `Invoice` header for each active lease for the period.
2. Insert `RENT` line item from `Lease.rentAmountCents`.
3. If `OrgFeature.UTILITIES_BILLING` enabled and the unit has meters: insert `UTILITY_*` line items from `calculateUtilityChargesForLease()`. Mark `estimated: true` if any contributing `MeterReading` had source `ESTIMATED`.
4. Call `rebuildInvoiceTotals()`.
5. Attach invoices to the `BillingRun`.

`publishBillingRun` refuses to publish if any invoice in the run has `estimated` line items **unless** `OrgFeature.UTILITIES_BILLING.config.allowEstimates = true`.

### 4.4 Existing code changes

- `lib/services/invoices.ts::ensureInvoicesForLease()` — deprecate for new invoices. Keep for backfill only. All new invoice generation goes through `generateBillingRun`.
- `markInvoicePaid` / `markInvoiceUnpaid` stay, but the paid-amount semantics move to `PaymentReceipt + Allocation` in phase 4. In phase 3 they still work directly against `Invoice.paidAmountCents`.
- `lib/services/dashboard.ts::getDashboardSummary()` — update the "invoiced vs paid" and "cashflow by unit" queries to sum from `InvoiceLineItem` grouped by `kind` (rent vs utilities) instead of flat `amountCents`.

### 4.5 API

| Method | Path | Handler |
|---|---|---|
| GET, POST | `/api/utilities/meters` | `listMeters`, `createMeter` |
| GET | `/api/utilities/meters/[id]` | `getMeter` |
| POST | `/api/utilities/meters/[id]/readings` | `recordMeterReading` |
| GET, POST | `/api/utilities/tariffs` | `listTariffs`, `upsertTariff` |
| GET, POST | `/api/billing/runs` | list runs, `generateBillingRun` |
| GET | `/api/billing/runs/[id]` | `getBillingRun` |
| POST | `/api/billing/runs/[id]/publish` | `publishBillingRun` |
| POST | `/api/invoices/[id]/line-items` | `addManualLineItem` |
| DELETE | `/api/invoices/line-items/[id]` | `removeLineItem` |

### 4.6 Pages

Staff: `/billing`, `/billing/runs/[id]`, `/utilities/meters`, `/utilities/meters/[id]`, `/utilities/readings`, `/utilities/tariffs`.
Tenant: `/tenant/invoices/[id]` (new — itemised view of a single invoice with kind groupings).

Add `{label: "Billing", href: "/billing"}` and `{label: "Utilities", href: "/utilities/meters"}` to staff nav.

### 4.7 Acceptance

- An invoice renders with exactly the line items it was built from; totals recompute deterministically from line items.
- Rebuilding a billing run is idempotent (same period produces the same invoices).
- Tenant `/tenant/invoices` and `/tenant/invoices/[id]` show rent + utility breakdown when utilities are enabled; show rent-only otherwise.
- `getDashboardSummary` reports rent vs utility income separately.

---

## 5. Phase 4 — Payments, trust, statements, reconciliation

Covers: *Payment Tracking*, *Trust Account Management*, *Insight into Trust Balance*, *Identify funds per tenant*, *Document Generation (statements)*, and the financial half of *Finalise Accounts/Payments*.

### 5.1 Schema

```prisma
enum PaymentMethod    { EFT CASH CHEQUE CARD_MANUAL OTHER }
enum ReceiptSource    { MANUAL CSV_IMPORT STITCH }    // STITCH reserved for future adapter
enum AllocationTarget { INVOICE_LINE_ITEM DEPOSIT LATE_FEE UNAPPLIED }
enum LedgerEntryType  { RECEIPT DISBURSEMENT ALLOCATION REVERSAL DEPOSIT_IN DEPOSIT_OUT FEE }
enum StatementType    { TENANT LANDLORD TRUST }

model PaymentReceipt {
  id             String @id @default(cuid())
  orgId          String
  tenantId       String?
  leaseId        String?
  receivedAt     DateTime
  amountCents    Int
  method         PaymentMethod
  source         ReceiptSource
  externalRef    String?            // bank reference / import row id
  note           String?
  recordedById   String?
  org            Org  @relation(fields: [orgId], references: [id], onDelete: Cascade)
  tenant         Tenant? @relation(fields: [tenantId], references: [id])
  lease          Lease?  @relation(fields: [leaseId], references: [id])
  allocations    Allocation[]
  @@index([orgId, receivedAt])
  @@index([orgId, tenantId])
}

model Allocation {
  id                 String @id @default(cuid())
  receiptId          String
  target             AllocationTarget
  invoiceLineItemId  String?
  depositLeaseId     String?
  amountCents        Int
  reversedAt         DateTime?
  reversedById       String?
  createdAt          DateTime @default(now())
  receipt            PaymentReceipt    @relation(fields: [receiptId], references: [id], onDelete: Cascade)
  invoiceLineItem    InvoiceLineItem?  @relation(fields: [invoiceLineItemId], references: [id])
  depositLease       Lease?            @relation("LeaseDepositAllocations", fields: [depositLeaseId], references: [id])
  @@index([receiptId])
  @@index([invoiceLineItemId])
}

model TrustAccount {
  id         String @id @default(cuid())
  orgId      String @unique         // one trust account per org for now
  name       String
  bankRef    String?
  openedAt   DateTime @default(now())
  org        Org @relation(fields: [orgId], references: [id], onDelete: Cascade)
  entries    TrustLedgerEntry[]
}

model TrustLedgerEntry {
  id             String @id @default(cuid())
  trustAccountId String
  occurredAt     DateTime
  type           LedgerEntryType
  amountCents    Int                // signed: receipts +, disbursements -
  tenantId       String?
  leaseId        String?
  landlordId     String?
  sourceType     String?            // "PaymentReceipt" | "Allocation" | "Manual" | "DepositSettlement"
  sourceId       String?
  note           String?
  trustAccount   TrustAccount @relation(fields: [trustAccountId], references: [id], onDelete: Cascade)
  tenant         Tenant?      @relation(fields: [tenantId], references: [id])
  lease          Lease?       @relation(fields: [leaseId], references: [id])
  landlord       Landlord?    @relation(fields: [landlordId], references: [id])
  @@index([trustAccountId, occurredAt])
  @@index([trustAccountId, tenantId])
}

model ReconciliationRun {
  id             String @id @default(cuid())
  orgId          String
  periodStart    DateTime
  periodEnd      DateTime
  status         String   // "RUNNING" | "COMPLETED" | "FAILED"
  summary        Json?
  exceptions     ReconciliationException[]
  org            Org @relation(fields: [orgId], references: [id], onDelete: Cascade)
  @@index([orgId, periodStart])
}

model ReconciliationException {
  id          String @id @default(cuid())
  runId       String
  kind        String   // "UNALLOCATED_RECEIPT" | "OVER_ALLOCATED" | "MISSING_LEDGER_ENTRY" | "BALANCE_MISMATCH"
  entityType  String
  entityId    String
  detail      Json
  resolvedAt  DateTime?
  resolvedById String?
  run         ReconciliationRun @relation(fields: [runId], references: [id], onDelete: Cascade)
}

model Statement {
  id          String @id @default(cuid())
  orgId       String
  type        StatementType
  subjectType String           // "Tenant" | "Landlord" | "Org"
  subjectId   String
  periodStart DateTime
  periodEnd   DateTime
  openingBalanceCents Int
  closingBalanceCents Int
  totalsJson  Json             // grouped totals: rent, utilities, receipts, refunds, disbursements
  storageKey  String?          // PDF in Blob
  generatedAt DateTime @default(now())
  org         Org @relation(fields: [orgId], references: [id], onDelete: Cascade)
  lines       StatementLine[]
  @@index([orgId, type, subjectId, periodStart])
}

model StatementLine {
  id           String @id @default(cuid())
  statementId  String
  occurredAt   DateTime
  description  String
  debitCents   Int @default(0)
  creditCents  Int @default(0)
  runningBalanceCents Int
  sourceType   String?
  sourceId     String?
  statement    Statement @relation(fields: [statementId], references: [id], onDelete: Cascade)
  @@index([statementId, occurredAt])
}
```

### 5.2 Services

`lib/services/payments.ts`
```ts
listReceipts(ctx, filters): Promise<PaymentReceipt[]>
recordIncomingPayment(ctx, input): Promise<PaymentReceipt>
importReceiptsCsv(ctx, csv: string): Promise<{ created: PaymentReceipt[]; skipped: { row: number; reason: string }[] }>
allocateReceipt(ctx, receiptId, allocations: { target; invoiceLineItemId?; depositLeaseId?; amountCents }[]): Promise<Allocation[]>
reverseAllocation(ctx, allocationId, reason): Promise<void>
```

`lib/services/trust.ts`
```ts
ensureTrustAccount(orgId): Promise<TrustAccount>
getTrustBalance(ctx): Promise<{ totalCents; depositsCents; unappliedCents }>
getTenantTrustPosition(ctx, tenantId): Promise<{ receiptsCents; allocatedCents; unappliedCents; depositsCents }>
recordManualLedgerEntry(ctx, input): Promise<TrustLedgerEntry>
disburseToLandlord(ctx, input: { landlordId; amountCents; note }): Promise<TrustLedgerEntry>
```

`lib/services/statements.ts`
```ts
generateTenantStatement(ctx, tenantId, period): Promise<Statement>
generateLandlordStatement(ctx, landlordId, period): Promise<Statement>
generateTrustStatement(ctx, period): Promise<Statement>
regenerateStatement(ctx, statementId): Promise<Statement>
```

`lib/services/reconciliations.ts`
```ts
runTrustReconciliation(ctx, period): Promise<ReconciliationRun>
resolveException(ctx, id, note): Promise<ReconciliationException>
```

`lib/reports/statement-pdf.ts` — deterministic builder mirroring lease-template.

### 5.3 Wiring into existing code

- `markInvoicePaid()` in `lib/services/invoices.ts` — **re-route**. It now:
  1. Creates a `PaymentReceipt` (`method=EFT`, `source=MANUAL`, `amountCents = invoice.totalCents`).
  2. Calls `allocateReceipt` for every `InvoiceLineItem` on the invoice.
  3. Sets `Invoice.status=PAID`, `paidAt=now()`, `paidAmountCents=totalCents` (still maintained for back-compat dashboards).
  4. Writes `TrustLedgerEntry { type: RECEIPT }` and matching `ALLOCATION` entries.
  5. Writes `AuditLog`.
- `markInvoiceUnpaid()` — reverses all allocations belonging to the auto-generated receipt and deletes the receipt (only if `source=MANUAL`).
- `lib/services/leases.ts::activateLease()` — on lease activation, record a `TrustLedgerEntry { type: DEPOSIT_IN }` for `Lease.depositAmountCents` when deposit is received. Add an explicit "Deposit received" action on `/leases/[id]` if the deposit hasn't been recorded.
- `lib/services/offboarding.ts::finaliseDepositSettlement()` — writes `DEPOSIT_OUT` ledger entries for refund and `ALLOCATION` entries for charges; writes an `AuditLog`.
- `lib/services/dashboard.ts::getDashboardSummary()` — "overdue accounts" and "invoiced vs paid" now source from `PaymentReceipt + Allocation` instead of `Invoice.paidAmountCents`. Keep the existing dashboard shape so pages don't break.

### 5.4 API & pages

| Path | Methods | Handler |
|---|---|---|
| `/api/payments` | GET, POST | `listReceipts`, `recordIncomingPayment` |
| `/api/payments/[id]` | GET | `getReceipt` |
| `/api/payments/[id]/allocations` | POST | `allocateReceipt` |
| `/api/payments/allocations/[id]/reverse` | POST | `reverseAllocation` |
| `/api/payments/import` | POST | `importReceiptsCsv` |
| `/api/trust/balance` | GET | `getTrustBalance` |
| `/api/trust/tenants/[id]` | GET | `getTenantTrustPosition` |
| `/api/trust/disbursements` | POST | `disburseToLandlord` |
| `/api/statements/tenants/[id]` | GET, POST | list / generate |
| `/api/statements/landlords/[id]` | GET, POST | list / generate |
| `/api/reconciliations` | GET, POST | list / `runTrustReconciliation` |

Pages: `/payments`, `/payments/[id]`, `/payments/import`, `/trust`, `/trust/reconciliations/[id]`, `/statements`, `/statements/tenants/[id]`, `/statements/landlords/[id]`, `/landlord/invoices`, `/landlord/statements`, extended `/tenant/invoices/[id]` (itemised).

### 5.5 Acceptance

- Trust balance = sum of all `TrustLedgerEntry.amountCents`, and matches `receipts - disbursements - refunds` per reconciliation run.
- Reversing an allocation leaves the receipt intact with increased unapplied balance.
- Tenant statement reproduces identical content when regenerated for the same period.
- `markInvoicePaid` no longer writes `Invoice.paidAmountCents` as the source of truth — ledger is authoritative; the field is a cache.

---

## 6. Phase 5 — Annual reconciliations & tax packs

Covers: *Annual Recons*, *Auto Tax returns for Landlord & Tenant*.

Product stance: **accountant-ready packs**, not statutory filing. UI and generated files both label output as a "tax support pack".

### 6.1 Schema

```prisma
model FinancialYear {
  id        String @id @default(cuid())
  orgId     String
  startDate DateTime
  endDate   DateTime
  lockedAt  DateTime?
  lockedById String?
  org       Org @relation(fields: [orgId], references: [id], onDelete: Cascade)
  @@unique([orgId, startDate])
}

model AnnualReconciliation {
  id           String @id @default(cuid())
  orgId        String
  yearId       String
  scopeType    String   // "ORG" | "PROPERTY" | "LANDLORD"
  scopeId      String?
  summary      Json
  storageKey   String?
  generatedAt  DateTime @default(now())
  org          Org @relation(fields: [orgId], references: [id], onDelete: Cascade)
  year         FinancialYear @relation(fields: [yearId], references: [id])
}

model TaxPack {
  id          String @id @default(cuid())
  orgId       String
  yearId      String
  subjectType String   // "Tenant" | "Landlord"
  subjectId   String
  totalsJson  Json
  storageKey  String?  // PDF
  csvKey      String?  // CSV
  generatedAt DateTime @default(now())
  org         Org @relation(fields: [orgId], references: [id], onDelete: Cascade)
  year        FinancialYear @relation(fields: [yearId], references: [id])
  lines       TaxPackLine[]
  @@unique([orgId, yearId, subjectType, subjectId])
}

model TaxPackLine {
  id        String @id @default(cuid())
  packId    String
  category  String
  amountCents Int
  pack      TaxPack @relation(fields: [packId], references: [id], onDelete: Cascade)
}
```

### 6.2 Services

`lib/services/year-end.ts`
```ts
openFinancialYear(ctx, input): Promise<FinancialYear>
lockFinancialYear(ctx, yearId): Promise<FinancialYear>
generateAnnualReconciliation(ctx, yearId, scope): Promise<AnnualReconciliation>
```

`lib/services/tax-reporting.ts`
```ts
generateLandlordTaxPack(ctx, landlordId, yearId): Promise<TaxPack>
generateTenantTaxPack(ctx, tenantId, yearId): Promise<TaxPack>
```

Both iterate `TrustLedgerEntry` + `InvoiceLineItem` for the year, grouped by category, and produce PDF + CSV via `lib/reports/tax-pack.ts`. Output labels: "Landlord Income Summary", "Tenant Payment Summary", never "SARS return".

### 6.3 API & pages

`/api/year-ends`, `/api/year-ends/[id]/lock`, `/api/reports/annual-recon`, `/api/reports/tax-packs/landlords/[id]`, `/api/reports/tax-packs/tenants/[id]`.

Pages: `/reports/year-end`, `/reports/tax-packs`, and landlord-surfaced `/landlord/reports`, `/landlord/reports/[yearId]`.

### 6.4 Acceptance

- Re-running a pack for a locked year produces byte-identical totals.
- Tenant/landlord can only see their own pack; staff see all.

---

## 7. Phase 6 — Approvals & maintenance governance

Covers: *Repairs/Maintenance approved by MA & LL*.

### 7.1 Schema changes

Extend existing `Approval` model with explicit typed fields (not just `payload`):

```prisma
// add to Approval
requestedAmountCents Int?
approverRole         Role?     // "PM" (ADMIN/PROPERTY_MANAGER) in PM_AGENCY, "LANDLORD" in LANDLORD_DIRECT
```
Approvals are single-stage. There is no `ApprovalStage` enum, no `stageTargetRole`. Routing is determined by `Org.ownerType` at request time.

Extend `ApprovalKind` enum with:
```prisma
MAINTENANCE_QUOTE_APPROVE
DEPOSIT_DEDUCTION_APPROVE
UTILITY_ADJUSTMENT_APPROVE
```

Extend `MaintenanceRequest`:

```prisma
estimatedCostCents Int?
quotedCostCents    Int?
requiresApproval   Boolean @default(false)
approvalStage      ApprovalStage @default(SINGLE)
assignedVendorId   String?
scheduledFor       DateTime?
approvalId         String?        // current active approval
vendor             Vendor?        @relation(fields: [assignedVendorId], references: [id])
approval           Approval?      @relation("MaintenanceApproval", fields: [approvalId], references: [id])
quotes             MaintenanceQuote[]
worklogs           MaintenanceWorklog[]
```

```prisma
model Vendor {
  id    String @id @default(cuid())
  orgId String
  name  String
  contactName  String?
  contactEmail String?
  contactPhone String?
  categories   String[]
  archivedAt   DateTime?
  org          Org @relation(fields: [orgId], references: [id], onDelete: Cascade)
  quotes       MaintenanceQuote[]
}

model MaintenanceQuote {
  id               String @id @default(cuid())
  requestId        String
  vendorId         String?
  amountCents      Int
  documentStorageKey String?
  note             String?
  createdAt        DateTime @default(now())
  request          MaintenanceRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  vendor           Vendor?            @relation(fields: [vendorId], references: [id])
}

model MaintenanceWorklog {
  id         String @id @default(cuid())
  requestId  String
  authorId   String?
  body       String
  createdAt  DateTime @default(now())
  request    MaintenanceRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  author     User?              @relation(fields: [authorId], references: [id])
}
```

### 7.2 Decision logic (`lib/services/maintenance.ts`)

Approval routing is **single-stage**, driven by `Org.ownerType`. There is no agent-then-landlord chain. Managing agents coordinate work but never gate financial approval.

New methods:
```ts
attachQuote(ctx, requestId, input): Promise<MaintenanceQuote>        // quotes optional — contractors often cannot quote before starting
requestMaintenanceApproval(ctx, requestId): Promise<Approval | null> // returns null when auto-approved
scheduleMaintenance(ctx, requestId, input): Promise<MaintenanceRequest>
completeMaintenance(ctx, requestId, input): Promise<MaintenanceRequest>
```

Pure function `resolveMaintenanceApprovalPath(org, request)` in `lib/permissions.ts`:

```
amount = request.quotedCostCents ?? request.estimatedCostCents ?? 0

if org.ownerType === PM_AGENCY:
    approver = "PM"           // ADMIN or PROPERTY_MANAGER inside the org
    requiresExplicitApproval = amount >= org.landlordApprovalThresholdCents
    landlordVisibility = "AFTER_THE_FACT"   // statement line + monthly digest
    // landlord does not block; cost posts to landlord's account

if org.ownerType === LANDLORD_DIRECT:
    approver = "LANDLORD"
    if OrgFeature.LANDLORD_APPROVALS === false:
        requiresExplicitApproval = false   // auto-approve everything
    else:
        requiresExplicitApproval = amount >= org.landlordApprovalThresholdCents
    landlordVisibility = "DIRECT_DECIDER"
```

- If `requiresExplicitApproval` is false, no `Approval` row is created; `AuditLog` records the auto-approval reason (below threshold / flag-off).
- If true, create one `Approval` with `kind=MAINTENANCE_QUOTE_APPROVE` and `approverRole` derived as above.
- Decline closes the `MaintenanceRequest` with a worklog entry and notifies the requester.

`lib/services/approvals.ts::decideApproval()` does **not** auto-create any follow-up approval. Single stage only.

### 7.3 API & pages

Staff: `/maintenance/[id]` (existing) gains quote panel, approval CTA, scheduling.
Landlord: `/landlord/approvals`, `/landlord/approvals/[id]`, `/landlord/maintenance`.
Agent: `/agent/approvals`, `/agent/approvals/[id]`, `/agent/repairs`, `/agent/repairs/[id]`.

Routes:
- `/api/maintenance/[id]/quotes` (GET, POST)
- `/api/maintenance/[id]/request-approval` (POST)
- `/api/maintenance/[id]/schedule` (POST)
- `/api/maintenance/[id]/complete` (POST)
- `/api/approvals` already exists — extend filters to include `stageTargetRole` and `assignedAgentId`.
- `/api/vendors` (GET, POST), `/api/vendors/[id]` (GET, PATCH, DELETE).

### 7.4 Wiring into existing code

- `lib/services/maintenance.ts::updateMaintenanceRequest()` — if `status` moves to `IN_PROGRESS` and `requiresApproval && approvalStage !== SINGLE`, refuse unless there is an `APPROVED` `Approval` chain.
- `components/nav/landlord-sidebar.tsx::getLandlordNavItems()` — add `{label: "Approvals", href: "/landlord/approvals"}`, `{label: "Maintenance", href: "/landlord/maintenance"}` (previously removed in phase 0, now re-added with pages).
- Same for agent sidebar.

### 7.5 Acceptance

- No `MaintenanceRequest` with `requiresApproval=true` can be scheduled without an `APPROVED` approval chain.
- Two-stage approval only fires when `OrgFeature.AGENT_APPROVALS` is on AND the property has an assigned agent.
- `landlordHasExecutiveAuthority(org)` in `lib/permissions.ts` continues to short-circuit approval for landlord-direct ownership.

---

## 8. Phase 7 — Portals, dashboards, analytics

Covers: *Separate Dashboards* for PM / Tenant / Managing Agent / Landlord.

### 8.1 Analytics data layer

Add pre-aggregated snapshot tables. Refreshed nightly by a background job, and on-demand after large mutations (e.g. publishing a billing run).

```prisma
enum AnalyticsPeriod { DAY MONTH }

model OrgDailySnapshot {
  id            String @id @default(cuid())
  orgId         String
  takenOn       DateTime @db.Date
  occupiedUnits Int
  totalUnits    Int
  vacantUnits   Int
  activeLeases  Int
  expiringLeases30 Int
  openMaintenance Int
  blockedApprovals Int
  billedCents     Int
  collectedCents  Int
  arrearsCents    Int
  trustBalanceCents Int
  unallocatedCents  Int
  @@unique([orgId, takenOn])
}

model PropertyDailySnapshot {
  id          String @id @default(cuid())
  orgId       String
  propertyId  String
  takenOn     DateTime @db.Date
  occupiedUnits Int
  totalUnits    Int
  openMaintenance Int
  arrearsCents    Int
  grossRentCents  Int
  @@unique([propertyId, takenOn])
  @@index([orgId, takenOn])
}

model LandlordMonthlySnapshot {
  id          String @id @default(cuid())
  orgId       String
  landlordId  String
  periodStart DateTime @db.Date
  grossRentCents Int
  collectedCents Int
  disbursedCents Int
  maintenanceSpendCents Int
  vacancyDragCents Int
  @@unique([landlordId, periodStart])
}

model AgentDailySnapshot {
  id          String @id @default(cuid())
  orgId       String
  agentId     String
  takenOn     DateTime @db.Date
  openTickets Int
  blockedApprovals Int
  upcomingInspections Int
  @@unique([agentId, takenOn])
}

model AnalyticsRefreshRun {
  id         String @id @default(cuid())
  orgId      String
  period     AnalyticsPeriod
  startedAt  DateTime @default(now())
  completedAt DateTime?
  status     String   // "RUNNING" | "OK" | "FAILED"
  error      String?
}
```

### 8.2 Services

`lib/services/analytics-refresh.ts`
```ts
refreshOrgDaily(orgId: string, forDate: Date): Promise<void>
refreshPropertyDaily(orgId, forDate): Promise<void>
refreshLandlordMonthly(orgId, periodStart): Promise<void>
refreshAgentDaily(orgId, forDate): Promise<void>
refreshAllForOrg(orgId): Promise<AnalyticsRefreshRun>
```

`lib/services/staff-analytics.ts`, `landlord-analytics.ts`, `agent-analytics.ts`, `tenant-analytics.ts` — each exposes `getX(ctx, filters)` and reads from snapshots first, falls back to live queries only for small/critical surfaces (e.g. "top 5 overdue right now").

Background refresh: a Vercel Cron job hits `POST /api/analytics/refresh` (internal, service-token guarded) hourly for daily snapshots and monthly at period rollover.

### 8.3 Pages per role

**Staff** (`/dashboard` stays the entry, existing page is rebuilt to compose modules):
- `/dashboard` — portfolio map, collections, occupancy funnel, expiring queue, maintenance, compliance, finance panels.
- `/dashboard/portfolio`, `/dashboard/collections`, `/dashboard/occupancy`, `/dashboard/maintenance`, `/dashboard/compliance`, `/dashboard/finance` — filtered detail views that each module drills into.

**Landlord** (rebuild of today's placeholder):
- `/landlord` — summary.
- `/landlord/insights` — cashflow, yield, maintenance exposure, annual pack readiness.
- `/landlord/properties`, `/landlord/properties/[id]`, `/landlord/leases`, `/landlord/invoices`, `/landlord/statements`, `/landlord/repairs`, `/landlord/approvals`, `/landlord/profile`.

**Agent**:
- `/agent` — command center.
- `/agent/properties`, `/agent/properties/[id]`, `/agent/repairs`, `/agent/approvals`, `/agent/notices`, `/agent/profile`, `/agent/compliance`.

**Tenant** (extend existing):
- `/tenant/invoices/[id]` — itemised (added phase 3).
- `/tenant/notices` — inbox (phase 8).
- `/tenant/repairs/[id]` — add worklog timeline.

### 8.4 Components

Add to `components/analytics/`:
- `metric-tile.tsx`, `sparkline.tsx`, `funnel.tsx`, `ranked-list.tsx`, `map-panel.tsx`, `status-strip.tsx`, `command-center-card.tsx`, `trend-chip.tsx`, `segment-donut.tsx`.

Visual rule: each module uses the existing Regalis shell (`PageHeader`, `StatCard`, mono eyebrows, serif numerals). No third-party theme. Charts via `recharts` (already in stack if not, add via `npm i recharts`).

### 8.5 Wiring

- `lib/services/dashboard.ts::getDashboardSummary()` — keep as is for the existing dashboard page, but refactor internals to read from `OrgDailySnapshot` when fresh (< 25 h) else live query.
- Each sidebar `getXNavItems()` now returns the full nav list; every entry has a real page.
- Add CI rule: navigation validator (`lib/nav/validate.ts`) runs in tests and fails if any `href` has no backing page.

### 8.6 KPI library

`lib/analytics/kpis.ts` — registry of KPIs with `{ id, formula, sources, drillTarget, comparisonMode }`. Every `metric-tile` takes a `kpiId` and resolves its definition + drill target from this registry. No inline metric strings on pages.

### 8.7 Acceptance

- Every sidebar link resolves.
- Every analytics card has an associated drill destination in `lib/analytics/drill-targets.ts`, and clicking navigates there with preserved filter state.
- No role sees another role's data (covered by `withOrg` + per-service scoping by `session.user.landlordId` / `managingAgentId`).

---

## 9. Phase 8 — Notifications, area intelligence, alerts

Covers: *Usage Alerts*, *Payment Alerts*, *Outage Notifications*, *Estate Notifications*.

### 9.1 Schema

```prisma
enum NotificationChannel { IN_APP EMAIL SMS }
enum NotificationStatus  { QUEUED SENT FAILED SKIPPED }
enum AreaNoticeType      { OUTAGE ESTATE SECURITY WATER POWER GENERAL }

model Notification {
  id         String @id @default(cuid())
  orgId      String
  userId     String?
  role       Role?              // for broadcast
  type       String             // "APPLICATION_APPROVED" | "INVOICE_OVERDUE" | "AREA_OUTAGE" | ...
  subject    String
  body       String
  payload    Json?
  entityType String?
  entityId   String?
  readAt     DateTime?
  createdAt  DateTime @default(now())
  org        Org  @relation(fields: [orgId], references: [id], onDelete: Cascade)
  user       User? @relation(fields: [userId], references: [id], onDelete: Cascade)
  deliveries NotificationDelivery[]
  @@index([orgId, userId, readAt])
}

model NotificationDelivery {
  id             String @id @default(cuid())
  notificationId String
  channel        NotificationChannel
  status         NotificationStatus @default(QUEUED)
  lastAttemptAt  DateTime?
  error          String?
  providerRef    String?
  notification   Notification @relation(fields: [notificationId], references: [id], onDelete: Cascade)
  @@index([notificationId])
}

model AreaNotice {
  id        String @id @default(cuid())
  orgId     String
  type      AreaNoticeType
  title     String
  body      String
  startsAt  DateTime?
  endsAt    DateTime?
  createdById String
  org       Org @relation(fields: [orgId], references: [id], onDelete: Cascade)
  audiences NoticeAudience[]
  deliveries Notification[]
  createdAt DateTime @default(now())
}

model NoticeAudience {
  id       String @id @default(cuid())
  noticeId String
  scopeType String   // "PROPERTY" | "SUBURB" | "ESTATE" | "ALL"
  scopeRef  String?
  notice   AreaNotice @relation(fields: [noticeId], references: [id], onDelete: Cascade)
}

model UsageAlertRule {
  id           String @id @default(cuid())
  orgId        String
  utilityType  UtilityType
  thresholdPct Int       // e.g. 120 means 20% above rolling 3-mo avg
  enabled      Boolean @default(true)
  org          Org @relation(fields: [orgId], references: [id], onDelete: Cascade)
}

model UsageAlertEvent {
  id         String @id @default(cuid())
  orgId      String
  ruleId     String
  leaseId    String
  periodStart DateTime
  observedQty Decimal
  baselineQty Decimal
  deltaPct    Int
  createdAt   DateTime @default(now())
  org         Org @relation(fields: [orgId], references: [id], onDelete: Cascade)
  rule        UsageAlertRule @relation(fields: [ruleId], references: [id])
  lease       Lease @relation(fields: [leaseId], references: [id])
}
```

### 9.2 Services

`lib/services/notifications.ts`
```ts
createNotification(ctx, input): Promise<Notification>              // always creates in-app; queues deliveries
listNotifications(userId, filters): Promise<Notification[]>
markRead(userId, id): Promise<void>
dispatchPending(): Promise<void>                                   // cron: processes NotificationDelivery QUEUED
```

`dispatchPending` dispatches by channel. It wraps the existing `lib/email.ts` and `lib/sms.ts`. **Every existing ad-hoc send site must migrate to `createNotification()`**:
- `lib/services/signatures.ts` — lease signed / review request.
- `lib/services/maintenance.ts` — created / status changed.
- `lib/services/invoices.ts` — paid confirmation.
- `lib/services/applications.ts` (phase 1) — submission / decision.

The email/SMS functions stay as adapters; they are invoked by `dispatchPending`, not by services directly. This gives a portal inbox even when email/SMS fail.

`lib/services/area-notices.ts`
```ts
createAreaNotice(ctx, input): Promise<AreaNotice>                  // fan-out: resolves audience → Notification rows
listAreaNotices(ctx, filters)
```

`lib/services/usage-alerts.ts`
```ts
evaluateUsageAlerts(orgId, periodStart): Promise<UsageAlertEvent[]>
```

Cron jobs:
- `POST /api/cron/usage-alerts` (after each billing run publish).
- `POST /api/cron/payment-alerts` (daily) — scans `Invoice.status=OVERDUE` and fires `Notification` rows with escalation tiers (7-day reminder, 14-day overdue, 30-day final).
- `POST /api/cron/notifications-dispatch` (every 5 min) — processes `QUEUED` deliveries.

### 9.3 Pages

Staff: `/notices`, `/notices/new`, `/alerts/usage`, `/alerts/payments`.
Tenant: `/tenant/notices`, `/tenant/notices/[id]`.
Landlord: `/landlord/notices` (receives org-wide and property-scoped).
Agent: `/agent/notices` (compose + track delivery).

### 9.4 Acceptance

- Every user-facing outbound (email/SMS) is preceded by a `Notification` record, and the in-app inbox is source of truth.
- Area notice audience resolves to an explicit list of `Notification` rows at send time (fan-out), so delivery is auditable.
- Payment alerts throttle per invoice (one reminder per tier per invoice).

---

## 10. Phase 9 — Backup, DR, compliance surfaces

Covers: *Cloud Backup & Storage / DR / full Encryption*.

### 10.1 Position

App-side responsibility is **surface and metadata**. Actual backup execution is operational:
- **Database**: Neon provides point-in-time restore; we add a daily `pg_dump` job that writes to Vercel Blob (`retentionClass=BACKUP`). Retention 30 days.
- **Blob**: Vercel Blob is durable and encrypted at rest. We add a weekly listing + checksum verification to detect corruption or missing files.
- **Encryption**: provider-default at rest (Neon + Blob). The admin page states this explicitly rather than implying BYOK.

### 10.2 Schema

Extend `Document`:
```prisma
checksumSha256  String?
retentionClass  String?   // "STANDARD" | "LONG_TERM" | "BACKUP"
archivedAt      DateTime?
encryptionNote  String?   // e.g. "provider-default"
```

Add:
```prisma
model BackupSnapshot {
  id           String @id @default(cuid())
  orgId        String
  takenAt      DateTime @default(now())
  sizeBytes    BigInt
  storageKey   String
  checksum     String
  kind         String   // "DB" | "BLOB_INDEX"
  org          Org @relation(fields: [orgId], references: [id], onDelete: Cascade)
}

model BackupVerificationRun {
  id           String @id @default(cuid())
  orgId        String
  startedAt    DateTime @default(now())
  completedAt  DateTime?
  status       String   // "OK" | "FAILED"
  missingCount Int @default(0)
  corruptCount Int @default(0)
  summary      Json?
  org          Org @relation(fields: [orgId], references: [id], onDelete: Cascade)
}
```

### 10.3 Services

`lib/services/backup.ts`
```ts
recordBackupSnapshot(orgId, input): Promise<BackupSnapshot>
runBackupVerification(orgId): Promise<BackupVerificationRun>
latestVerification(orgId): Promise<BackupVerificationRun | null>
```

### 10.4 Pages

`/settings/backup` — ADMIN only. Shows:
- last DB snapshot timestamp, size
- last Blob verification status + missing/corrupt counts
- stated RPO (24 h) / RTO (4 h)
- encryption at rest posture: "Neon-managed + Vercel Blob default"

### 10.5 Acceptance

- Backup status visible in admin settings.
- Weekly cron `POST /api/cron/backup-verify` runs and records an `BackupVerificationRun`.
- No app claims BYOK or customer-managed keys in UI copy.

---

## 11. Execution order

1. **Phase 0** — one PR, no dead links after.
2. **Phase 1** (applications + vetting) and **Phase 3** (invoice line items + utilities) can run in parallel after phase 0.
3. **Phase 4** (payments/trust) depends on phase 3 (needs `InvoiceLineItem`).
4. **Phase 6** (approvals/maintenance) depends on phase 0 only; can run parallel to 3/4.
5. **Phase 2** (inspections/offboarding) depends on phase 4 for `DepositSettlement` ledger wiring.
6. **Phase 7** (portals/analytics) depends on 1–6 for the data it surfaces.
7. **Phase 8** (notifications) depends on 1–6 for trigger sites.
8. **Phase 5** (annual/tax) depends on 3 + 4.
9. **Phase 9** (backup/DR) runs in parallel with late phases.

## 12. Milestones

- **M1:** Phase 0 + Phase 1 + nav cleanup. Audit log, feature flags, applications/vetting live, no dead links anywhere.
- **M2:** Phase 3 + Phase 4. Itemised billing, payments, trust, statements.
- **M3:** Phase 6 + Phase 2. Maintenance approvals (landlord + agent), inspections + offboarding with deposit settlement.
- **M4:** Phase 7 + Phase 8. Full portals, analytics, notifications, area notices, payment/usage alerts.
- **M5:** Phase 5 + Phase 9. Annual packs, tax packs, backup verification surface.

## 13. Testing (non-negotiable per phase)

Unit:
- Money math (`lib/services/billing.ts`, `trust.ts`).
- `resolveMaintenanceApprovalPath` across every `ownerType × threshold × agent-assigned × feature-flag` combo.
- KPI formulas from `lib/analytics/kpis.ts`.
- `rebuildInvoiceTotals` idempotency.
- `allocateReceipt` / `reverseAllocation` balance invariants.

Integration:
- Application → conversion → onboard → activate → invoice.
- Terminate → offboarding → inspection → move-out charges → deposit settlement.
- Generate billing run → publish → pay → statement.
- Maintenance request → quote → approval chain (agent + landlord) → schedule → complete.
- Area notice → fan-out → in-app inbox + email + SMS deliveries.

UI:
- Nav validator (CI).
- Role redirect matrix through `proxy.ts`.
- Drill-through from every analytics card to its `drillTarget`.

## 14. Highest-risk areas (read before merging)

- **Invoice migration** (phase 3). Running the backfill against live data must be idempotent and reversible. Gate behind a one-shot migration script reviewed by finance.
- **`markInvoicePaid` re-wire** (phase 4). Tenants' paid history must not regress. Add a reconciliation test that re-computes `Invoice.paidAmountCents` from ledger after migration and compares row-for-row.
- **Approval chain** (phase 6). Landlord-direct ownership must still skip approvals; `landlordHasExecutiveAuthority()` is the single source of truth.
- **Nav validator** (phase 0). Must ship before anyone can add routes behind a future flag — otherwise dead links creep back.
- **Encryption copy** (phase 9). Wording matters. Stick to "provider-default at rest"; never imply BYOK.
