# Codebase Manifest — Property Management Ops

> **This is the LLM source of truth.** Check here BEFORE reading any file.
> Last updated: 2026-04-23 (Phase 1 — Applications & TPN)

## Stack

Next.js 16.2 | React 19 | TypeScript strict | Prisma 7 + Neon Postgres | NextAuth v5 (JWT/Credentials) | Tailwind 4 + shadcn | Vercel Blob | Zod 4

## Environment Variables (.env.local)

| Var | Purpose |
|-----|---------|
| DATABASE_URL | Neon pooled connection string |
| DIRECT_URL | Neon direct connection (migrations) |
| NEXTAUTH_SECRET | JWT signing secret |
| BLOB_READ_WRITE_TOKEN | Vercel Blob access |
| SENTRY_DSN | Error tracking (optional) |
| EXPIRING_WINDOW_DAYS | Lease expiry warning threshold |
| AUTH_TRUST_HOST | Trust proxy host header (Vercel) |
| GMAIL_USER | Gmail address used as SMTP sender; leave blank to disable outbound email |
| GMAIL_APP_PASSWORD | Gmail App Password (16 chars) — generate at myaccount.google.com/apppasswords with 2FA on |
| EMAIL_FROM_NAME | Display name in From header (default `"PMOps"`) |
| EMAIL_FROM | Optional explicit From override (default `"EMAIL_FROM_NAME <GMAIL_USER>"`) |
| EMAIL_REPLY_TO | Optional reply-to address (route tenant replies to a real inbox) |
| APP_URL | Base URL used in email/SMS login links; falls back to request origin |
| SMS_GATEWAY_USER | Username for SMS Gateway for Android cloud server; leave blank to disable SMS |
| SMS_GATEWAY_PASSWORD | Password for SMS Gateway for Android cloud server |
| SMS_GATEWAY_URL | Optional override endpoint for self-hosted / private SMS server (default is the public cloud URL) |
| OPS_SMS_RECIPIENTS | Comma-separated E.164 numbers that receive PM-side alerts (new maintenance, lease signings, clause reviews) |

**Do NOT set NEXTAUTH_URL on Vercel** — auto-detected from VERCEL_URL.

## Database Schema (prisma/schema.prisma)

**Enums:** Role (ADMIN, PROPERTY_MANAGER, FINANCE, TENANT, LANDLORD, MANAGING_AGENT) | OrgOwnerType (PM_AGENCY, LANDLORD_DIRECT) | FeatureFlagKey (UTILITIES_BILLING, TRUST_ACCOUNTING, AREA_NOTICES, LANDLORD_APPROVALS, USAGE_ALERTS, PAYMENT_ALERTS, ANNUAL_PACKS) | ApprovalKind (MAINTENANCE_COMMIT, LEASE_CREATE, LEASE_RENEW, RENT_CHANGE, TENANT_EVICT, PROPERTY_REMOVE) | ApprovalState (PENDING, APPROVED, DECLINED, CANCELLED) | LeaseState (DRAFT, ACTIVE, TERMINATED, RENEWED) | DocumentKind (LEASE_AGREEMENT) | SAProvince (GP, WC, KZN, EC, FS, LP, MP, NW, NC) | MaintenancePriority (LOW, MEDIUM, HIGH, URGENT) | MaintenanceStatus (OPEN, IN_PROGRESS, RESOLVED, CLOSED) | InvoiceStatus (DUE, PAID, OVERDUE) | ReviewRequestStatus (OPEN, ACCEPTED, REJECTED, RESOLVED) | ApplicationStage (DRAFT, SUBMITTED, UNDER_REVIEW, VETTING, APPROVED, DECLINED, CONVERTED, WITHDRAWN) | ApplicationDecision (PENDING, APPROVED, DECLINED) | TpnCheckStatus (NOT_STARTED, REQUESTED, RECEIVED, FAILED, WAIVED) | TpnRecommendation (PASS, CAUTION, DECLINE, UNKNOWN)

**Models:**
| Model | Key Fields | Relations |
|-------|-----------|-----------|
| Org | name, slug, ownerType, landlordApprovalThresholdCents, expiringWindowDays | users, properties, units, tenants, leases, documents, landlords, managingAgents, approvals, orgFeatures, auditLogs |
| OrgFeature | orgId, key, enabled, config, updatedAt | org — unique(orgId, key) |
| AuditLog | orgId, actorUserId?, entityType, entityId, action, diff?, payload?, createdAt | org, actor? |
| User | email, passwordHash, role, orgId, landlordId?, managingAgentId?, disabledAt | org, landlord?, managingAgent?, accounts, sessions, documents, auditLogs |
| Landlord | orgId, name, email?, phone?, vatNumber?, archivedAt | org, users, properties, approvals |
| ManagingAgent | orgId, name, email?, phone?, archivedAt | org, users, assignedProperties |
| Property | name, address*, suburb, city, province, postalCode, landlordId?, assignedAgentId?, deletedAt | org, landlord?, assignedAgent?, units, documents |
| Unit | propertyId, label, bedrooms, bathrooms, sizeSqm | property, leases, documents |
| Tenant | firstName, lastName, email, phone, idNumber, userId, archivedAt | org, leases, documents |
| Lease | unitId, startDate, endDate, rentAmountCents, depositAmountCents, state, renewedFromId | unit, tenants (M2M via LeaseTenant), documents |
| LeaseTenant | leaseId, tenantId, isPrimary | lease, tenant |
| Document | kind, storageKey, filename, mimeType, sizeBytes, uploadedById | lease?, property?, unit?, tenant? |
| Account/Session/VerificationToken | Standard NextAuth models | |
| MaintenanceRequest | title, description, priority, status, internalNotes, resolvedAt | org, tenant, unit |
| Invoice | leaseId, periodStart, dueDate, amountCents, status, paidAt, paidAmountCents, paidNote | org, lease — unique(leaseId, periodStart) |
| LeaseSignature | leaseId, tenantId, signedName, signedAt, ipAddress, userAgent, latitude, longitude, locationText | lease, tenant — unique(leaseId, tenantId) |
| LeaseReviewRequest | leaseId, tenantId, clauseExcerpt, tenantNote, status, pmResponse, respondedAt | lease (no FK to tenant) |
| Approval | orgId, landlordId, propertyId?, kind, subjectType?, subjectId?, payload (Json), state, reason?, decisionNote?, requestedById, decidedById?, decidedAt? | org, landlord |
| Applicant | orgId, firstName, lastName, email, phone, idNumber?, employer?, grossMonthlyIncomeCents?, netMonthlyIncomeCents?, tpnConsentGiven, tpnConsentAt?, tpnConsentCapturedById? | org, applications |
| Application | orgId, applicantId, propertyId?, unitId?, stage, decision, decisionReason?, decidedAt?, assignedReviewerId?, requestedMoveIn?, sourceChannel?, affordabilityRatio?, convertedTenantId?, convertedLeaseId? | org, applicant, property?, unit?, reviewer?, tpnCheck?, documents, notes, convertedTenant? |
| ApplicationDocument | applicationId, filename, mimeType, sizeBytes, storageKey, description?, uploadedById | application |
| ApplicationNote | applicationId, authorId, body | application, author |
| TpnCheck | applicationId (unique), status, requestedAt?, receivedAt?, tpnReferenceId?, recommendation?, summary?, reportPayload? (Json), reportBlobKey?, waivedReason?, waivedById? | application |
| Notification | orgId, userId?, role?, type, subject, body, payload? (Json), entityType?, entityId?, readAt?, createdAt | org, user? |

## Auth Flow

```
proxy.ts (route guard) → lib/auth.config.ts (JWT/session callbacks) → lib/auth.ts (credentials provider + bcrypt)
Login: components/login-form.tsx → signIn('credentials') → window.location.href → proxy.ts verifies JWT
Layouts: (staff)/layout.tsx and (tenant)/layout.tsx call auth() as defense-in-depth
```

## File Index

### Config (root)
| File | Exports / Purpose | Lines |
|------|-------------------|-------|
| next.config.ts | Empty NextConfig | 8 |
| proxy.ts | `proxy(req)`, `config` — route guard: public paths, role-based redirects | 59 |
| prisma.config.ts | defineConfig with schema path | 12 |
| tsconfig.json | strict, ES2017, @/* alias | 35 |
| components.json | shadcn UI config | — |

### lib/
| File | Exports | Lines |
|------|---------|-------|
| db.ts | `db` — PrismaClient singleton with pg adapter | 14 |
| auth.config.ts | `authConfig` — edge-safe NextAuthConfig (JWT strategy, callbacks: jwt+session add userId/role/orgId) | 32 |
| auth.ts | `handlers, auth, signIn, signOut` — full NextAuth with Credentials provider, bcrypt, loginSchema | 36 |
| auth/with-org.ts | `withOrg<P>()` — HOF for auth'd API routes; `RouteCtx {orgId, userId, role}`, `RouteParams<P>` | 38 |
| errors.ts | `ApiError` class (unauthorized/forbidden/notFound/validation/conflict/internal), `toErrorResponse()`, `ApiErrorCode` type | 58 |
| format.ts | `formatZar(cents)`, `formatDate(d)` | 12 |
| lease-template.ts | `LeaseTemplateData`, `LeaseSection`, `renderLeaseAgreement(data)` — generic SA residential lease generator (15 sections) | 200 |
| email.ts | `sendTenantInvite({to, tenantName, orgName, tempPassword, appUrl})`, `SendResult` — Gmail SMTP (nodemailer) transactional email; no-ops gracefully if `GMAIL_USER`/`GMAIL_APP_PASSWORD` missing | 112 |
| sms.ts | `sendTenantInviteSms`, `sendMaintenanceCreatedOpsSms`, `sendMaintenanceCreatedTenantSms`, `sendMaintenanceStatusTenantSms`, `sendLeaseSignedOpsSms`, `sendReviewRequestOpsSms`, `sendReviewResponseTenantSms`, `sendInvoicePaidTenantSms`, `SendResult` — SMS via SMS Gateway for Android (cloud mode); normalizes ZA local numbers to E.164; ops messages go to `OPS_SMS_RECIPIENTS`; no-ops if unconfigured | — |
| blob.ts | `validateFile(file)` (20MB, pdf/png/jpeg/webp), `uploadBlob(path, file)`, `deleteBlob(pathname)` | 13 |
| utils.ts | `cn()` — clsx + tailwind-merge | 6 |
| permissions.ts | `landlordHasExecutiveAuthority(org)`, `requiresLandlordApproval(action, org)`, `orgOwnerTypeLabel()` — gates landlord actions based on Org.ownerType | — |
| nav/validate.ts | `validateNav()` — planner utility that reports missing sidebar destinations with loose dynamic-route matching; non-blocking by design | 119 |
| integrations/tpn/adapter.ts | `tpnAdapter.submitCheck()`, `tpnAdapter.mapResponse()`, `TpnApplicantPayload`, `TpnResponse` — provider-agnostic TPN adapter; throws `ApiError.conflict("TPN not configured")` until `TPN_API_URL`/`TPN_API_KEY` env vars are set | — |

### lib/services/
| File | Exports | Lines |
|------|---------|-------|
| dashboard.ts | `getDashboardSummary(ctx)` → portfolio totals, occupancy, lease expiries, invoice overview (invoiced vs paid, overdue accounts, cashflow by unit, expiry buckets), recent leases | 301 |
| leases.ts | `DerivedStatus` type, `deriveStatus()`, `listLeases()`, `getLease()`, `createLease()`, `updateDraftLease()`, `activateLease()`, `terminateLease()`, `renewLease()`, `setPrimaryTenant()` | 348 |
| properties.ts | `listProperties()`, `getProperty()`, `createProperty()`, `updateProperty()`, `softDeleteProperty()` | 51 |
| tenants.ts | `listTenants()`, `getTenant()`, `detectDuplicates()`, `createTenant()`, `updateTenant()`, `archiveTenant()`, `unarchiveTenant()`, `deleteTenant()` (hard delete — requires archived; cascades LeaseTenant, MaintenanceRequest, LeaseSignature, LeaseReviewRequest, linked User; nulls Document.tenantId), `inviteTenantToPortal()` — creates a TENANT User, links via Tenant.userId, returns one-time temp password | 170 |
| units.ts | `UnitOccupancy` type, `getUnitOccupancy()`, `listUnits()`, `getUnit()`, `createUnit()`, `updateUnit()`, `deleteUnit()` | 97 |
| documents.ts | `uploadLeaseAgreement()`, `getDocumentForDownload()` | 37 |
| team.ts | `listTeam()`, `createTeamUser()`, `updateTeamUser()`, `getOrg()`, `updateOrg()`, `changeOwnPassword()` | 102 |
| tenant-portal.ts | `getTenantProfile()`, `getActiveLeaseForTenant()`, `getPendingLeaseForTenant()` (DRAFT lease w/ signatures+reviewRequests filtered to tenant), `getTenantLeases()`, `listTenantDocuments()`, `getTenantDocumentForDownload()` — all scoped by User.id → Tenant.userId | 106 |
| signatures.ts | `signLeaseAsTenant()`, `getTenantSignatureForLease()`, `listLeaseSignatures(ctx)`, `createReviewRequest()`, `listTenantReviewRequests()`, `listLeaseReviewRequests(ctx)`, `respondToReviewRequest(ctx)` | 145 |
| onboarding.ts | `onboardTenant(ctx, input)` — single-transaction tenant + DRAFT lease + optional portal account with temp password | 94 |
| maintenance.ts | `createTenantMaintenanceRequest()`, `listTenantMaintenanceRequests()`, `getTenantMaintenanceRequest()`, `listMaintenanceRequests()`, `getMaintenanceRequest()`, `updateMaintenanceRequest()` | 128 |
| invoices.ts | `ensureInvoicesForLease()` (idempotent month-by-month generator, past→PAID, current/future→DUE), `listTenantInvoices()`, `listLeaseInvoices()`, `markInvoicePaid()`, `markInvoiceUnpaid()` | 135 |
| audit.ts | `writeAudit(ctx, input)` — reusable audit-log writer with JSON-safe payload normalization; swallows insert failures after logging | 90 |
| landlords.ts | `listLandlords()`, `getLandlord()`, `createLandlord()`, `updateLandlord()` | — |
| managing-agents.ts | `listManagingAgents()`, `getManagingAgent()`, `createManagingAgent()`, `updateManagingAgent()` | — |
| landlord-portal.ts | `getLandlordProfile()`, `listLandlordProperties()`, `getLandlordPortfolioSummary()` — scoped by User.id → User.landlordId | — |
| approvals.ts | `requestApproval()`, `listPendingForLandlord()`, `listApprovalsForOrg()`, `decideApproval()`, `cancelApproval()` — generic approval workflow (MAINTENANCE_COMMIT etc.) | — |
| org-features.ts | `getOrgFeatures()`, `setOrgFeature()`, `assertFeature()` — workspace feature flag lookups/upserts with audit logging on toggles | 97 |
| applications.ts | `listApplications`, `getApplication`, `createApplication`, `updateApplication`, `submitApplication`, `assignReviewer`, `addApplicationNote`, `uploadApplicationDocument`, `withdrawApplication` — applicant+application CRUD with stage transitions; writes AuditLog + notification hooks on submit | 330 |
| tpn.ts | `captureTpnConsent`, `requestTpnCheck`, `recordTpnResult`, `waiveTpnCheck`, `getTpnCheck` — TPN integration lifecycle; persists TpnCheck rows + reportPayload; audited | 387 |
| vetting.ts | `approveApplication`, `declineApplication`, `convertApplicationToTenant` — decision + conversion service; enforces TPN/consent gates; delegates to `onboardTenant`; notifies assigned reviewer | 256 |
| notifications.ts | `createNotification(ctx, input)` — M1-minimal in-app Notification row writer (no email/SMS delivery yet) | 27 |

### lib/zod/
| File | Exports | Lines |
|------|---------|-------|
| lease.ts | `leaseStateEnum`, `createLeaseSchema`, `updateDraftLeaseSchema`, `terminateLeaseSchema`, `leaseListQuerySchema` | 51 |
| property.ts | `provinceEnum`, `createPropertySchema`, `updatePropertySchema` | 17 |
| tenant.ts | `createTenantSchema`, `updateTenantSchema` | 12 |
| unit.ts | `createUnitSchema`, `updateUnitSchema` | 12 |
| team.ts | `roleEnum`, `createUserSchema` (incl. optional landlordId/managingAgentId), `updateUserSchema`, `updateOrgSchema` (incl. ownerType, landlordApprovalThresholdCents), `changePasswordSchema` | — |
| org-features.ts | `featureFlagKeys`, `featureFlagKeyEnum`, `FeatureFlagKey`, `JsonConfig`, `setOrgFeatureSchema` | 51 |
| landlords.ts | `createLandlordSchema`, `updateLandlordSchema` | — |
| managing-agents.ts | `createManagingAgentSchema`, `updateManagingAgentSchema` | — |
| approvals.ts | `approvalKindEnum`, `decideApprovalSchema` | — |
| document.ts | `documentKindEnum`, `documentUploadMetaSchema` | 4 |
| maintenance.ts | `maintenancePriorityEnum`, `maintenanceStatusEnum`, `createMaintenanceRequestSchema`, `updateMaintenanceRequestSchema` | 18 |
| invoice.ts | `markInvoicePaidSchema` | 8 |
| signature.ts | `signLeaseSchema`, `createReviewRequestSchema`, `respondReviewRequestSchema` | — |
| onboarding.ts | `onboardTenantSchema` — full form schema for tenant+lease+invite in one step (accepts optional `fromApplicationId` cuid for application conversion) | — |
| application.ts | `applicationListQuerySchema`, `createApplicationSchema`, `updateApplicationSchema`, `assignReviewerSchema`, `addApplicationNoteSchema`, `withdrawApplicationSchema`, `applicationDecisionSchema`, `convertApplicationSchema` | 79 |
| tpn.ts | `captureTpnConsentSchema`, `requestTpnCheckSchema`, `waiveTpnCheckSchema`, `tpnWebhookSchema` | — |

### types/
| File | Purpose | Lines |
|------|---------|-------|
| next-auth.d.ts | Augments Session.user (id, email, name, role, orgId) and JWT (userId, role, orgId) | 24 |

### docs/
| File | Purpose | Lines |
|------|---------|-------|
| docs/2026-04-21-roles-and-approvals-changes.md | Product and schema notes for roles, landlord approvals, and portal additions | 150 |
| docs/2026-04-23-alignment-tasks.md | Task-by-task execution plan that refines the product overview plan with locked decisions and milestone-ready deliverables | 703 |
| docs/2026-04-23-product-overview-gap-checklist.md | Product deck checklist mapping implemented, partial, and missing capabilities against the current app | 55 |
| docs/2026-04-23-product-overview-implementation-plan.md | Deep phased implementation plan covering tenant lifecycle, finance, approvals, portals, notifications, and platform hardening | 997 |

### scripts/
| File | Purpose | Lines |
|------|---------|-------|
| scripts/report-missing-pages.ts | CLI planner report for missing nav destinations based on `validateNav()`; prints missing routes without failing the build | 19 |
| scripts/backfill-property-owners.ts | Dry-run-first backfill for missing `Property.landlordId` / `assignedAgentId`; unresolved rows are emitted as CSV on stdout and `--write` persists safe assignments | 246 |

### tests/
| File | Purpose | Lines |
|------|---------|-------|
| tests/services/audit.test.ts | Node test-runner coverage for audit normalization, swallow-on-failure behavior, and validation rejection | 102 |
| tests/services/org-features.test.ts | Node test-runner coverage for default flag reads, audited toggles, and disabled-feature enforcement | 158 |
| tests/services/applications.test.ts | Coverage for createApplication, submitApplication (+ notification side effect), listApplications org-scoping | 178 |
| tests/services/tpn.test.ts | Coverage for captureTpnConsent, requestTpnCheck (stub refusal + adapter-backed create), recordTpnResult mapping, waiveTpnCheck | — |
| tests/services/vetting.test.ts | Coverage for approveApplication gating (TPN status/recommendation/consent/override), declineApplication, convertApplicationToTenant | — |
| tests/integration/applications.test.ts | Full lifecycle: create → submit → TPN PASS → approve → convert (+ waive path, DECLINE-blocks path) | — |

### app/ — Layouts & Pages
| Route | File | Purpose |
|-------|------|---------|
| — | app/layout.tsx | Root layout: metadata + `<Providers>` wrapper | 
| — | app/providers.tsx | Client: `<SessionProvider>` |
| / | (marketing)/page.tsx | Landing page |
| — | (marketing)/layout.tsx | Public layout shell |
| /login | (marketing)/login/page.tsx | Renders `<LoginForm>` in Suspense |
| — | (staff)/layout.tsx | Auth guard + `<StaffNav>` |
| /dashboard | (staff)/dashboard/page.tsx | Staff dashboard with portfolio KPIs, drill-through cards, invoiced vs paid chart, receivables donut, overdue accounts, cashflow by unit, expiring leases |
| /properties | (staff)/properties/page.tsx | Property list |
| /properties/new | (staff)/properties/new/page.tsx | Create property form |
| /properties/[id] | (staff)/properties/[id]/page.tsx | Property detail + units list |
| /properties/[id]/edit | (staff)/properties/[id]/edit/page.tsx | Edit property form |
| /properties/[id] | (staff)/properties/[id]/delete-button.tsx | Client: delete with confirmation |
| /properties/[id]/units/new | (staff)/properties/[id]/units/new/page.tsx | Create unit in property |
| /units/[id] | (staff)/units/[id]/page.tsx | Unit detail + lease history |
| /tenants | (staff)/tenants/page.tsx | Tenant list |
| /tenants/new | (staff)/tenants/new/page.tsx | Create tenant form |
| /tenants/onboard | (staff)/tenants/onboard/page.tsx | Single-screen wizard: tenant + unit assignment + draft lease + portal invite |
| /tenants/[id] | (staff)/tenants/[id]/page.tsx | Tenant detail + lease history |
| /tenants/[id] | (staff)/tenants/[id]/archive-button.tsx | Client: archive/unarchive |
| /tenants/[id] | (staff)/tenants/[id]/delete-button.tsx | Client: permanently delete archived tenant (typed-name confirmation) |
| /tenants/[id] | (staff)/tenants/[id]/invite-button.tsx | Client: invite tenant to portal, shows one-time temp password |
| /leases | (staff)/leases/page.tsx | Lease list with status filters |
| /leases/new | (staff)/leases/new/page.tsx | Create lease form |
| /leases/[id] | (staff)/leases/[id]/page.tsx | Lease detail |
| /leases/[id] | (staff)/leases/[id]/actions.tsx | Client: activate/terminate/renew buttons |
| /leases/[id] | (staff)/leases/[id]/document-upload.tsx | Client: upload lease doc |
| /leases/[id]/renew | (staff)/leases/[id]/renew/page.tsx | Renew lease (pre-filled) |
| /profile | (staff)/profile/page.tsx | User profile + password change |
| /settings/org | (staff)/settings/org/page.tsx | Org settings page |
| /settings/org | (staff)/settings/org/org-form.tsx | Client: org settings form |
| /settings/features | (staff)/settings/features/page.tsx | Feature flag settings page (ADMIN only) |
| /settings/features | (staff)/settings/features/feature-flags-form.tsx | Client: feature toggle list for workspace modules |
| /settings/team | (staff)/settings/team/page.tsx | Team management page |
| /settings/team | (staff)/settings/team/new-user-form.tsx | Client: new team member form |
| /settings/team | (staff)/settings/team/team-row.tsx | Client: team member row |
| — | (tenant)/layout.tsx | Tenant auth guard + TenantSidebar + TopBar shell |
| /tenant | (tenant)/tenant/page.tsx | Tenant home: active lease card, renewal banner, recent documents |
| /tenant/lease | (tenant)/tenant/lease/page.tsx | Full active lease detail + document list + previous leases |
| /tenant/documents | (tenant)/tenant/documents/page.tsx | All documents available to tenant |
| /tenant/profile | (tenant)/tenant/profile/page.tsx | Tenant contact info (read-only) + change password |
| /tenant/repairs | (tenant)/tenant/repairs/page.tsx | List of tenant's maintenance requests |
| /tenant/repairs/new | (tenant)/tenant/repairs/new/page.tsx | Submit a repair request |
| /tenant/repairs/[id] | (tenant)/tenant/repairs/[id]/page.tsx | Tenant view of a request |
| /tenant/invoices | (tenant)/tenant/invoices/page.tsx | Rent invoices: next due, history, paid total |
| /maintenance | (staff)/maintenance/page.tsx | Staff maintenance list with status filters |
| /maintenance/[id] | (staff)/maintenance/[id]/page.tsx | Staff detail + update status/priority/internal notes |
| /maintenance/[id] | (staff)/maintenance/[id]/update-form.tsx | Client: status/priority/notes form |
| /applications | (staff)/applications/page.tsx | Application list with stage tabs, reviewer filter, search; loading skeleton + empty state |
| /applications/new | (staff)/applications/new/page.tsx | Capture form for new applicant + application + TPN consent |
| /applications/[id] | (staff)/applications/[id]/page.tsx | Tabbed detail (Overview / TPN / Documents / Notes) with decision CTAs and convert dialog |
| /leases/[id] | (staff)/leases/[id]/invoices-panel.tsx | Client: mark-paid / unpay actions per invoice |
| /leases/[id] | (staff)/leases/[id]/signatures-panel.tsx | Client: signatures list + review requests with respond (accept/reject/resolve + pmResponse) |
| /tenant/lease | (tenant)/tenant/lease/sign-card.tsx | Client: `SignLeaseCard` (typed name + geolocation + agreement) and `SignedConfirmation` |
| /tenant/lease | (tenant)/tenant/lease/review-form.tsx | Client: `ReviewRequestForm` (clause + note) and `ReviewRequestList` |
| - | (landlord)/layout.tsx | Landlord auth guard + `DesktopLandlordSidebar` shell |
| /landlord | (landlord)/landlord/page.tsx | Landlord dashboard with portfolio summary cards and assigned property list |
| - | (agent)/layout.tsx | Managing-agent auth guard + `DesktopAgentSidebar` shell |
| /agent | (agent)/agent/page.tsx | Managing-agent dashboard with placeholder approvals, property, and alerts summary |

### app/api/ — Route Handlers
| Endpoint | Methods | Handler calls |
|----------|---------|--------------|
| /api/auth/[...nextauth] | GET, POST | handlers (NextAuth) |
| /api/dashboard/summary | GET | getDashboardSummary |
| /api/properties | GET, POST | listProperties, createProperty |
| /api/properties/[id] | GET, PATCH, DELETE | getProperty, updateProperty, softDeleteProperty |
| /api/units | GET, POST | listUnits, createUnit |
| /api/units/[id] | GET, PATCH, DELETE | getUnit, updateUnit, deleteUnit |
| /api/tenants | GET, POST | listTenants, createTenant |
| /api/tenants/[id] | GET, PATCH, DELETE | getTenant, updateTenant, deleteTenant (hard delete — archived only) |
| /api/tenants/[id]/archive | POST | archiveTenant/unarchiveTenant |
| /api/tenants/[id]/invite | POST | inviteTenantToPortal (ADMIN/PM only) |
| /api/maintenance | GET, POST | listMaintenanceRequests (staff), createTenantMaintenanceRequest (tenant) |
| /api/maintenance/[id] | GET, PATCH | getMaintenanceRequest, updateMaintenanceRequest (ADMIN/PM only) |
| /api/invoices/[id]/paid | POST, DELETE | markInvoicePaid, markInvoiceUnpaid (ADMIN/PM/FINANCE) |
| /api/leases/[id]/sign | POST | signLeaseAsTenant (TENANT only; records IP/UA from request headers) |
| /api/leases/[id]/review-requests | POST | createReviewRequest (TENANT only) |
| /api/review-requests/[id] | PATCH | respondToReviewRequest (ADMIN/PM only) |
| /api/onboarding/tenants | POST | onboardTenant (ADMIN/PM only) — creates tenant + draft lease + optional portal user |
| /api/leases | GET, POST | listLeases, createLease |
| /api/leases/[id] | GET, PATCH | getLease, updateDraftLease |
| /api/leases/[id]/activate | POST | activateLease |
| /api/leases/[id]/terminate | POST | terminateLease |
| /api/leases/[id]/renew | POST | renewLease |
| /api/leases/[id]/primary-tenant | POST | setPrimaryTenant |
| /api/leases/[id]/documents | POST | uploadLeaseAgreement |
| /api/documents/[id]/download | GET | role-dispatch: `getTenantDocumentForDownload` for TENANT, `getDocumentForDownload` otherwise |
| /api/profile/password | POST | changeOwnPassword |
| /api/settings/org | GET, PATCH | getOrg, updateOrg |
| /api/settings/features | GET, POST | getOrgFeatures, setOrgFeature |
| /api/settings/team | GET, POST | listTeam, createTeamUser |
| /api/settings/team/[id] | PATCH | updateTeamUser |
| /api/applications | GET, POST | listApplications, createApplication |
| /api/applications/[id] | GET, PATCH | getApplication, updateApplication |
| /api/applications/[id]/submit | POST | submitApplication |
| /api/applications/[id]/withdraw | POST | withdrawApplication |
| /api/applications/[id]/approve | POST | approveApplication (ADMIN/PM) — enforces TPN/consent gates |
| /api/applications/[id]/decline | POST | declineApplication (ADMIN/PM) |
| /api/applications/[id]/convert | POST | convertApplicationToTenant — creates Tenant + DRAFT Lease |
| /api/applications/[id]/consent | POST | captureTpnConsent — records applicant TPN consent |
| /api/applications/[id]/assign | POST | assignReviewer |
| /api/applications/[id]/notes | POST | addApplicationNote |
| /api/applications/[id]/documents | POST | uploadApplicationDocument (multipart) |
| /api/applications/[id]/tpn/request | POST | requestTpnCheck — calls TPN adapter |
| /api/applications/[id]/tpn/waive | POST | waiveTpnCheck (audited reason) |
| /api/integrations/tpn/webhook | POST | recordTpnResult — signature-verified; returns 501 in stub mode |

### components/
| File | Type | Exports | Lines |
|------|------|---------|-------|
| login-form.tsx | Client | `LoginForm` — email/password, signIn + redirect | 70 |
| lease-status-badge.tsx | Server | `LeaseStatusBadge` — color-coded status with dot (DRAFT/ACTIVE/EXPIRING/EXPIRED/TERMINATED/RENEWED) | 28 |
| occupancy-badge.tsx | Server | `OccupancyBadge` — color-coded occupancy with dot (VACANT/OCCUPIED/UPCOMING/CONFLICT) | 26 |
| nav/sidebar.tsx | Client | `Sidebar` — staff left nav with lucide icons, active-state highlight | 56 |
| nav/tenant-sidebar.tsx | Client | `TenantSidebar` — tenant left nav (Home/Lease/Documents/Profile) | 46 |
| nav/top-bar.tsx | Server | `TopBar` — top bar: profile link + signOut (shared by staff + tenant) | 27 |
| nav/staff-nav.tsx | Server | (unused — superseded by sidebar + top-bar) | 30 |
| forms/lease-form.tsx | Client | `LeaseForm` — unit, tenants, dates, rent, deposit, notes | 189 |
| forms/property-form.tsx | Client | `PropertyForm` — name, address fields, province, autoCreateMainUnit | 112 |
| forms/unit-form.tsx | Client | `UnitForm` — property, label, bedrooms, bathrooms, size | 59 |
| forms/tenant-form.tsx | Client | `TenantForm` — name, email, phone, ID, duplicate detection | 90 |
| forms/change-password-form.tsx | Client | `ChangePasswordForm` — current + new + confirm | 47 |
| forms/onboard-tenant-form.tsx | Client | `OnboardTenantForm` — full wizard form, POSTs to /api/onboarding/tenants, displays temp password result | — |
| forms/application-form.tsx | Client | `ApplicationForm` — applicant + application + TPN consent capture, POSTs to /api/applications | — |
| forms/application-detail-actions.tsx | Client | `ApplicationDetailActions` (overview/tpn modes), `ApplicationDocumentsPanel`, `ApplicationNotesPanel` — decision dialogs (approve/decline/withdraw), TPN actions (consent/request/waive/retry), document + note submission | — |
| forms/convert-application-dialog.tsx | Client | `ConvertApplicationDialog` — collects lease terms + portal-user toggle, POSTs to /api/applications/[id]/convert, shows temp password and redirects to tenant | — |
| lease-agreement-document.tsx | Server | `LeaseAgreementDocument` — scrollable rendered lease from `renderLeaseAgreement()` | — |
| ui/* | Client | shadcn/base-ui primitives: badge, button, card, checkbox, dialog, input, label, select, switch, table, textarea, skeleton | ~900 |
 
**Manifest refresh (2026-04-22) — supersedes older line counts above where duplicated**

| File | Type | Exports | Lines |
|------|------|---------|-------|
| empty-state.tsx | Client | `EmptyState` â€” shared empty-state panel with optional icon + action | 43 |
| page-header.tsx | Client | `PageHeader` â€” shared eyebrow/title/description/action header shell | 46 |
| stat-card.tsx | Client | `StatTone`, `StatCard` â€” editorial metric card with left accent rail | 64 |
| lease-status-badge.tsx | Server | `LeaseStatusBadge` â€” lease state pill with editorial status colours | 39 |
| occupancy-badge.tsx | Server | `OccupancyBadge` â€” occupancy pill (VACANT/OCCUPIED/UPCOMING/CONFLICT) | 33 |
| maintenance-badges.tsx | Server | `MaintenanceStatusBadge`, `MaintenancePriorityBadge` â€” maintenance status/priority pills | 36 |
| nav/breadcrumbs.tsx | Client | `Breadcrumbs` â€” pathname-based breadcrumb trail for internal layouts | 70 |
| nav/mobile-nav.tsx | Client | `MobileNav` â€” mobile drawer nav wrapper around `SidebarBody` | 97 |
| nav/sidebar.tsx | Client | `getStaffNavItems()`, `Sidebar`, `SidebarBody`, `DesktopSidebar` â€” shared editorial sidebar shell for portal nav, incl. admin Features link | 155 |
| nav/tenant-sidebar.tsx | Client | `getTenantNavItems()`, `TenantSidebar`, `DesktopTenantSidebar` â€” tenant portal nav config + wrappers | 34 |
| nav/agent-sidebar.tsx | Client | `getAgentNavItems()`, `AgentSidebar`, `DesktopAgentSidebar` â€” agent portal nav config + wrappers (dashboard-only until more routes land) | 29 |
| nav/landlord-sidebar.tsx | Client | `getLandlordNavItems()`, `LandlordSidebar`, `DesktopLandlordSidebar` â€” landlord portal nav config + wrappers (dashboard-only until more routes land) | 29 |
| nav/top-bar.tsx | Server | `TopBar` â€” internal top bar with breadcrumbs, theme toggle, account, sign out | 53 |
