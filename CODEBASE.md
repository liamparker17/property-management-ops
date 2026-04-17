# Codebase Manifest — Property Management Ops

> **This is the LLM source of truth.** Check here BEFORE reading any file.
> Last updated: 2026-04-17

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
| APP_URL | Base URL used in email login links; falls back to request origin |

**Do NOT set NEXTAUTH_URL on Vercel** — auto-detected from VERCEL_URL.

## Database Schema (prisma/schema.prisma)

**Enums:** Role (ADMIN, PROPERTY_MANAGER, FINANCE, TENANT) | LeaseState (DRAFT, ACTIVE, TERMINATED, RENEWED) | DocumentKind (LEASE_AGREEMENT) | SAProvince (GP, WC, KZN, EC, FS, LP, MP, NW, NC) | MaintenancePriority (LOW, MEDIUM, HIGH, URGENT) | MaintenanceStatus (OPEN, IN_PROGRESS, RESOLVED, CLOSED) | InvoiceStatus (DUE, PAID, OVERDUE) | ReviewRequestStatus (OPEN, ACCEPTED, REJECTED, RESOLVED)

**Models:**
| Model | Key Fields | Relations |
|-------|-----------|-----------|
| Org | name, slug, expiringWindowDays | users, properties, units, tenants, leases, documents |
| User | email, passwordHash, role, orgId, disabledAt | org, accounts, sessions, documents |
| Property | name, address*, suburb, city, province, postalCode, deletedAt | org, units, documents |
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
| blob.ts | `validateFile(file)` (20MB, pdf/png/jpeg/webp), `uploadBlob(path, file)`, `deleteBlob(pathname)` | 13 |
| utils.ts | `cn()` — clsx + tailwind-merge | 6 |

### lib/services/
| File | Exports | Lines |
|------|---------|-------|
| dashboard.ts | `getDashboardSummary(ctx)` → totalProperties, totalUnits, occupied/vacant/upcoming/conflict, activeLeases, expiring, recentLeases | 103 |
| leases.ts | `DerivedStatus` type, `deriveStatus()`, `listLeases()`, `getLease()`, `createLease()`, `updateDraftLease()`, `activateLease()`, `terminateLease()`, `renewLease()`, `setPrimaryTenant()` | 348 |
| properties.ts | `listProperties()`, `getProperty()`, `createProperty()`, `updateProperty()`, `softDeleteProperty()` | 51 |
| tenants.ts | `listTenants()`, `getTenant()`, `detectDuplicates()`, `createTenant()`, `updateTenant()`, `archiveTenant()`, `unarchiveTenant()`, `inviteTenantToPortal()` — creates a TENANT User, links via Tenant.userId, returns one-time temp password | 145 |
| units.ts | `UnitOccupancy` type, `getUnitOccupancy()`, `listUnits()`, `getUnit()`, `createUnit()`, `updateUnit()`, `deleteUnit()` | 97 |
| documents.ts | `uploadLeaseAgreement()`, `getDocumentForDownload()` | 37 |
| team.ts | `listTeam()`, `createTeamUser()`, `updateTeamUser()`, `getOrg()`, `updateOrg()`, `changeOwnPassword()` | 102 |
| tenant-portal.ts | `getTenantProfile()`, `getActiveLeaseForTenant()`, `getPendingLeaseForTenant()` (DRAFT lease w/ signatures+reviewRequests filtered to tenant), `getTenantLeases()`, `listTenantDocuments()`, `getTenantDocumentForDownload()` — all scoped by User.id → Tenant.userId | 106 |
| signatures.ts | `signLeaseAsTenant()`, `getTenantSignatureForLease()`, `listLeaseSignatures(ctx)`, `createReviewRequest()`, `listTenantReviewRequests()`, `listLeaseReviewRequests(ctx)`, `respondToReviewRequest(ctx)` | 145 |
| onboarding.ts | `onboardTenant(ctx, input)` — single-transaction tenant + DRAFT lease + optional portal account with temp password | 94 |
| maintenance.ts | `createTenantMaintenanceRequest()`, `listTenantMaintenanceRequests()`, `getTenantMaintenanceRequest()`, `listMaintenanceRequests()`, `getMaintenanceRequest()`, `updateMaintenanceRequest()` | 128 |
| invoices.ts | `ensureInvoicesForLease()` (idempotent month-by-month generator, past→PAID, current/future→DUE), `listTenantInvoices()`, `listLeaseInvoices()`, `markInvoicePaid()`, `markInvoiceUnpaid()` | 135 |

### lib/zod/
| File | Exports | Lines |
|------|---------|-------|
| lease.ts | `leaseStateEnum`, `createLeaseSchema`, `updateDraftLeaseSchema`, `terminateLeaseSchema`, `leaseListQuerySchema` | 51 |
| property.ts | `provinceEnum`, `createPropertySchema`, `updatePropertySchema` | 17 |
| tenant.ts | `createTenantSchema`, `updateTenantSchema` | 12 |
| unit.ts | `createUnitSchema`, `updateUnitSchema` | 12 |
| team.ts | `roleEnum`, `createUserSchema`, `updateUserSchema`, `updateOrgSchema`, `changePasswordSchema` | 26 |
| document.ts | `documentKindEnum`, `documentUploadMetaSchema` | 4 |
| maintenance.ts | `maintenancePriorityEnum`, `maintenanceStatusEnum`, `createMaintenanceRequestSchema`, `updateMaintenanceRequestSchema` | 18 |
| invoice.ts | `markInvoicePaidSchema` | 8 |
| signature.ts | `signLeaseSchema`, `createReviewRequestSchema`, `respondReviewRequestSchema` | — |
| onboarding.ts | `onboardTenantSchema` — full form schema for tenant+lease+invite in one step | — |

### types/
| File | Purpose | Lines |
|------|---------|-------|
| next-auth.d.ts | Augments Session.user (id, email, name, role, orgId) and JWT (userId, role, orgId) | 24 |

### app/ — Layouts & Pages
| Route | File | Purpose |
|-------|------|---------|
| — | app/layout.tsx | Root layout: metadata + `<Providers>` wrapper | 
| — | app/providers.tsx | Client: `<SessionProvider>` |
| / | (marketing)/page.tsx | Landing page |
| — | (marketing)/layout.tsx | Public layout shell |
| /login | (marketing)/login/page.tsx | Renders `<LoginForm>` in Suspense |
| — | (staff)/layout.tsx | Auth guard + `<StaffNav>` |
| /dashboard | (staff)/dashboard/page.tsx | Summary stats, recent/expiring leases |
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
| /leases/[id] | (staff)/leases/[id]/invoices-panel.tsx | Client: mark-paid / unpay actions per invoice |
| /leases/[id] | (staff)/leases/[id]/signatures-panel.tsx | Client: signatures list + review requests with respond (accept/reject/resolve + pmResponse) |
| /tenant/lease | (tenant)/tenant/lease/sign-card.tsx | Client: `SignLeaseCard` (typed name + geolocation + agreement) and `SignedConfirmation` |
| /tenant/lease | (tenant)/tenant/lease/review-form.tsx | Client: `ReviewRequestForm` (clause + note) and `ReviewRequestList` |

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
| /api/tenants/[id] | GET, PATCH | getTenant, updateTenant |
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
| /api/settings/team | GET, POST | listTeam, createTeamUser |
| /api/settings/team/[id] | PATCH | updateTeamUser |

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
| lease-agreement-document.tsx | Server | `LeaseAgreementDocument` — scrollable rendered lease from `renderLeaseAgreement()` | — |
| ui/* | Client | shadcn: badge, button, card, checkbox, dialog, input, label, select, table, textarea | ~800 |
