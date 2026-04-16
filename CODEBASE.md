# Codebase Manifest — Property Management Ops

> **This is the LLM source of truth.** Check here BEFORE reading any file.
> Last updated: 2026-04-16

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

**Do NOT set NEXTAUTH_URL on Vercel** — auto-detected from VERCEL_URL.

## Database Schema (prisma/schema.prisma)

**Enums:** Role (ADMIN, PROPERTY_MANAGER, FINANCE, TENANT) | LeaseState (DRAFT, ACTIVE, TERMINATED, RENEWED) | DocumentKind (LEASE_AGREEMENT) | SAProvince (GP, WC, KZN, EC, FS, LP, MP, NW, NC)

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
| blob.ts | `validateFile(file)` (20MB, pdf/png/jpeg/webp), `uploadBlob(path, file)`, `deleteBlob(pathname)` | 13 |
| utils.ts | `cn()` — clsx + tailwind-merge | 6 |

### lib/services/
| File | Exports | Lines |
|------|---------|-------|
| dashboard.ts | `getDashboardSummary(ctx)` → totalProperties, totalUnits, occupied/vacant/upcoming/conflict, activeLeases, expiring, recentLeases | 103 |
| leases.ts | `DerivedStatus` type, `deriveStatus()`, `listLeases()`, `getLease()`, `createLease()`, `updateDraftLease()`, `activateLease()`, `terminateLease()`, `renewLease()`, `setPrimaryTenant()` | 348 |
| properties.ts | `listProperties()`, `getProperty()`, `createProperty()`, `updateProperty()`, `softDeleteProperty()` | 51 |
| tenants.ts | `listTenants()`, `getTenant()`, `detectDuplicates()`, `createTenant()`, `updateTenant()`, `archiveTenant()`, `unarchiveTenant()` | 104 |
| units.ts | `UnitOccupancy` type, `getUnitOccupancy()`, `listUnits()`, `getUnit()`, `createUnit()`, `updateUnit()`, `deleteUnit()` | 97 |
| documents.ts | `uploadLeaseAgreement()`, `getDocumentForDownload()` | 37 |
| team.ts | `listTeam()`, `createTeamUser()`, `updateTeamUser()`, `getOrg()`, `updateOrg()`, `changeOwnPassword()` | 102 |

### lib/zod/
| File | Exports | Lines |
|------|---------|-------|
| lease.ts | `leaseStateEnum`, `createLeaseSchema`, `updateDraftLeaseSchema`, `terminateLeaseSchema`, `leaseListQuerySchema` | 51 |
| property.ts | `provinceEnum`, `createPropertySchema`, `updatePropertySchema` | 17 |
| tenant.ts | `createTenantSchema`, `updateTenantSchema` | 12 |
| unit.ts | `createUnitSchema`, `updateUnitSchema` | 12 |
| team.ts | `roleEnum`, `createUserSchema`, `updateUserSchema`, `updateOrgSchema`, `changePasswordSchema` | 26 |
| document.ts | `documentKindEnum`, `documentUploadMetaSchema` | 4 |

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
| /tenants/[id] | (staff)/tenants/[id]/page.tsx | Tenant detail + lease history |
| /tenants/[id] | (staff)/tenants/[id]/archive-button.tsx | Client: archive/unarchive |
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
| — | (tenant)/layout.tsx | Tenant auth guard |
| /tenant | (tenant)/tenant/page.tsx | Tenant portal |

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
| /api/leases | GET, POST | listLeases, createLease |
| /api/leases/[id] | GET, PATCH | getLease, updateDraftLease |
| /api/leases/[id]/activate | POST | activateLease |
| /api/leases/[id]/terminate | POST | terminateLease |
| /api/leases/[id]/renew | POST | renewLease |
| /api/leases/[id]/primary-tenant | POST | setPrimaryTenant |
| /api/leases/[id]/documents | POST | uploadLeaseAgreement |
| /api/documents/[id]/download | GET | getDocumentForDownload |
| /api/profile/password | POST | changeOwnPassword |
| /api/settings/org | GET, PATCH | getOrg, updateOrg |
| /api/settings/team | GET, POST | listTeam, createTeamUser |
| /api/settings/team/[id] | PATCH | updateTeamUser |

### components/
| File | Type | Exports | Lines |
|------|------|---------|-------|
| login-form.tsx | Client | `LoginForm` — email/password, signIn + redirect | 70 |
| lease-status-badge.tsx | Server | `LeaseStatusBadge` — color-coded status (DRAFT/ACTIVE/EXPIRING/EXPIRED/TERMINATED/RENEWED) | 18 |
| occupancy-badge.tsx | Server | `OccupancyBadge` — color-coded occupancy (VACANT/OCCUPIED/UPCOMING/CONFLICT) | 16 |
| nav/staff-nav.tsx | Server | `StaffNav` — sidebar links + user info + signOut | 30 |
| forms/lease-form.tsx | Client | `LeaseForm` — unit, tenants, dates, rent, deposit, notes | 189 |
| forms/property-form.tsx | Client | `PropertyForm` — name, address fields, province, autoCreateMainUnit | 112 |
| forms/unit-form.tsx | Client | `UnitForm` — property, label, bedrooms, bathrooms, size | 59 |
| forms/tenant-form.tsx | Client | `TenantForm` — name, email, phone, ID, duplicate detection | 90 |
| forms/change-password-form.tsx | Client | `ChangePasswordForm` — current + new + confirm | 47 |
| ui/* | Client | shadcn: badge, button, card, checkbox, dialog, input, label, select, table, textarea | ~800 |
