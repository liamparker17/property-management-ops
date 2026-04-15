# Property Management Ops — Slice 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js 16 web app that lets property management staff create properties, units, tenants, and leases end-to-end — proving the core data model. No money flow, no tenant self-service (both come in later slices).

**Architecture:** App Router with three route groups: `(marketing)` (public), `(staff)` (admin/property_manager/finance), `(tenant)` (empty shell, Slice 3). REST API under `app/api/*` delegates to a service layer in `lib/services/*` that owns all business rules and talks to Prisma. Every domain model carries `orgId`. A single `withOrg()` wrapper injects org/role into every handler; `proxy.ts` middleware gates route groups by role.

**Tech Stack:** Next.js 16 (App Router) · TypeScript · Prisma 7 + `@prisma/adapter-pg` · Neon Postgres · NextAuth v5 · Zod · Vercel Blob · Tailwind CSS · shadcn/ui · bcryptjs · Sentry (optional)

**Spec:** `docs/superpowers/specs/2026-04-15-portfolio-leases-design.md`

---

## Deviation from default TDD flow

The spec explicitly defers automated testing to Slice 4. Every task uses **manual verification** (typecheck, lint, dev-server smoke) instead of failing-test-first. This is a user-approved exception to the skill's TDD mandate — an executor must not "correct" it. Test infrastructure (Vitest, Playwright, CI) is a Slice 4 deliverable. Regressions are accepted risk until then.

---

## Phase Map

- **Phase A — Scaffolding** (Tasks 1–3)
- **Phase B — Schema & DB** (Tasks 4–6)
- **Phase C — Auth & infra** (Tasks 7–10)
- **Phase D — Service layer** (Tasks 11–17)
- **Phase E — API routes** (Tasks 18–22)
- **Phase F — UI foundation** (Tasks 23–25)
- **Phase G — Portfolio UI** (Tasks 26–28)
- **Phase H — Tenants & leases UI** (Tasks 29–32)
- **Phase I — Settings & seed** (Tasks 33–35)
- **Phase J — Manual acceptance** (Task 36)

## Phase A — Scaffolding

### Task 1: Initialize Next.js project + core deps

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`, `.gitignore`
- Create: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

- [ ] **Step 1: Scaffold Next.js 16 app**

Run from repo root (`C:\Users\liamp\Desktop\Property Management Ops`):

```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm --no-turbopack
```

When prompted to overwrite existing files, answer **No** for any files already committed; **Yes** for new scaffolding.

- [ ] **Step 2: Install runtime deps**

```bash
npm install next@16 react@19 react-dom@19 \
  prisma@^7 @prisma/client@^7 @prisma/adapter-pg@^7 pg@^8 \
  next-auth@5.0.0-beta.30 @auth/prisma-adapter@^2 bcryptjs@^3 \
  zod@^4 \
  @vercel/blob \
  @sentry/nextjs@^10
```

- [ ] **Step 3: Install dev deps**

```bash
npm install -D @types/bcryptjs @types/pg tsx
```

- [ ] **Step 4: Pin Node version + scripts**

Edit `package.json` — set `"engines": { "node": ">=20.11" }` and replace the `scripts` block:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:reset": "prisma migrate reset --force"
  }
}
```

- [ ] **Step 5: Verify build chain**

```bash
npm run typecheck
npm run lint
```

Expected: both pass on the vanilla scaffold.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 16 + core deps"
```

---

### Task 2: Environment + Neon database

**Files:**
- Create: `.env.example`, `.env.local` (gitignored)

- [ ] **Step 1: Provision a Neon project**

In the Neon dashboard create a project named `property-management-ops`. Copy the **pooled** connection string and the **direct** connection string.

- [ ] **Step 2: Write `.env.example`**

```bash
# .env.example
DATABASE_URL="postgres://user:pass@host/db?sslmode=require"
DIRECT_URL="postgres://user:pass@host/db?sslmode=require"

NEXTAUTH_SECRET="replace-me-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

SENTRY_DSN=""
EXPIRING_WINDOW_DAYS="60"
```

- [ ] **Step 3: Create `.env.local`**

Copy `.env.example` → `.env.local`, paste real Neon values, and generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

- [ ] **Step 4: Ensure `.env.local` is ignored**

Verify `.gitignore` contains `.env*.local`. Add if missing.

- [ ] **Step 5: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: env template + Neon wiring"
```

---

### Task 3: Prettier + folder layout

**Files:**
- Create: `.prettierrc`, `.prettierignore`
- Create empty dirs via `.gitkeep`: `lib/`, `lib/services/`, `lib/auth/`, `lib/zod/`, `components/`, `components/forms/`, `components/nav/`, `components/ui/`, `types/`

- [ ] **Step 1: Prettier config**

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

```
# .prettierignore
.next
node_modules
prisma/migrations
public
```

Install plugin:

```bash
npm install -D prettier prettier-plugin-tailwindcss
```

- [ ] **Step 2: Create empty dirs**

```bash
mkdir -p lib/services lib/auth lib/zod components/forms components/nav components/ui types
touch lib/.gitkeep lib/services/.gitkeep lib/auth/.gitkeep lib/zod/.gitkeep components/forms/.gitkeep components/nav/.gitkeep components/ui/.gitkeep types/.gitkeep
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: prettier + folder skeleton"
```

---

## Phase B — Schema & DB

### Task 4: Prisma setup + full schema

**Files:**
- Create: `prisma.config.ts`, `prisma/schema.prisma`

- [ ] **Step 1: `prisma.config.ts`**

```ts
// prisma.config.ts
import 'dotenv/config';
import path from 'node:path';
import type { PrismaConfig } from 'prisma';

export default {
  earlyAccess: true,
  schema: path.join('prisma', 'schema.prisma'),
} satisfies PrismaConfig;
```

- [ ] **Step 2: Write `prisma/schema.prisma` in full**

```prisma
// prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ---------- Enums ----------

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
}

enum SAProvince {
  GP
  WC
  KZN
  EC
  FS
  LP
  MP
  NW
  NC
}

// ---------- Org & Auth ----------

model Org {
  id                  String    @id @default(cuid())
  name                String
  slug                String    @unique
  expiringWindowDays  Int       @default(60)
  createdAt           DateTime  @default(now())

  users               User[]
  properties          Property[]
  units               Unit[]
  tenants             Tenant[]
  leases              Lease[]
  documents           Document[]
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  passwordHash  String
  role          Role
  orgId         String
  org           Org       @relation(fields: [orgId], references: [id])
  emailVerified DateTime?
  image         String?
  disabledAt    DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts      Account[]
  sessions      Session[]
  uploaded      Document[] @relation("DocumentUploader")

  @@index([orgId])
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ---------- Portfolio ----------

model Property {
  id            String     @id @default(cuid())
  orgId         String
  org           Org        @relation(fields: [orgId], references: [id])
  name          String
  addressLine1  String
  addressLine2  String?
  suburb        String
  city          String
  province      SAProvince
  postalCode    String
  notes         String?
  deletedAt     DateTime?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  units         Unit[]
  documents     Document[]

  @@index([orgId, name])
  @@index([orgId, deletedAt])
}

model Unit {
  id          String    @id @default(cuid())
  orgId       String
  org         Org       @relation(fields: [orgId], references: [id])
  propertyId  String
  property    Property  @relation(fields: [propertyId], references: [id])
  label       String
  bedrooms    Int       @default(0)
  bathrooms   Int       @default(0)
  sizeSqm     Int?
  notes       String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  leases      Lease[]
  documents   Document[]

  @@unique([propertyId, label])
  @@index([orgId, propertyId])
}

model Tenant {
  id          String    @id @default(cuid())
  orgId       String
  org         Org       @relation(fields: [orgId], references: [id])
  firstName   String
  lastName    String
  email       String?
  phone       String?
  idNumber    String?
  notes       String?
  userId      String?   @unique
  archivedAt  DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  leases      LeaseTenant[]
  documents   Document[]

  @@index([orgId, email])
  @@index([orgId, archivedAt])
}

model Lease {
  id                  String        @id @default(cuid())
  orgId               String
  org                 Org           @relation(fields: [orgId], references: [id])
  unitId              String
  unit                Unit          @relation(fields: [unitId], references: [id])
  startDate           DateTime      @db.Date
  endDate             DateTime      @db.Date
  rentAmountCents     Int
  depositAmountCents  Int
  heldInTrustAccount  Boolean       @default(false)
  paymentDueDay       Int
  state               LeaseState    @default(DRAFT)
  renewedFromId       String?       @unique
  renewedFrom         Lease?        @relation("LeaseRenewal", fields: [renewedFromId], references: [id])
  renewedTo           Lease?        @relation("LeaseRenewal")
  terminatedAt        DateTime?
  terminatedReason    String?
  notes               String?
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  tenants             LeaseTenant[]
  documents           Document[]

  @@index([orgId, unitId, state])
  @@index([orgId, endDate])
  @@index([orgId, state])
}

model LeaseTenant {
  leaseId    String
  tenantId   String
  isPrimary  Boolean @default(false)
  lease      Lease   @relation(fields: [leaseId], references: [id], onDelete: Cascade)
  tenant     Tenant  @relation(fields: [tenantId], references: [id])

  @@id([leaseId, tenantId])
  @@index([tenantId])
}

model Document {
  id            String       @id @default(cuid())
  orgId         String
  org           Org          @relation(fields: [orgId], references: [id])
  kind          DocumentKind
  leaseId       String?
  propertyId    String?
  unitId        String?
  tenantId      String?
  filename      String
  mimeType      String
  sizeBytes     Int
  storageKey    String
  uploadedById  String
  uploadedBy    User         @relation("DocumentUploader", fields: [uploadedById], references: [id])
  createdAt     DateTime     @default(now())

  lease         Lease?       @relation(fields: [leaseId], references: [id])
  property      Property?    @relation(fields: [propertyId], references: [id])
  unit          Unit?        @relation(fields: [unitId], references: [id])
  tenant        Tenant?      @relation(fields: [tenantId], references: [id])

  @@index([orgId, leaseId])
  @@index([orgId, tenantId])
}
```

- [ ] **Step 3: Commit**

```bash
git add prisma.config.ts prisma/schema.prisma
git commit -m "feat(db): Prisma schema — org, auth, portfolio, leases, documents"
```

---

### Task 5: First migration + CHECK/partial-unique constraints

Prisma cannot express the Document "exactly one parent FK" CHECK constraint or the "one primary per lease" partial unique. Both land via a raw-SQL follow-up migration right after the initial baseline.

**Files:**
- Create: `prisma/migrations/<timestamp>_init/migration.sql` (via Prisma)
- Create: `prisma/migrations/<timestamp>_constraints/migration.sql`

- [ ] **Step 1: Generate baseline migration**

```bash
npm run db:migrate -- --name init
```

Expected: creates `prisma/migrations/<ts>_init/` with `migration.sql` and applies it against Neon. Prisma Client is generated.

- [ ] **Step 2: Add constraints migration**

Create a new folder `prisma/migrations/<timestamp>_constraints/migration.sql` (use `date +%Y%m%d%H%M%S` for timestamp) with:

```sql
-- Document must have exactly one parent FK set.
ALTER TABLE "Document"
  ADD CONSTRAINT document_single_parent_chk
  CHECK (
    (CASE WHEN "leaseId"     IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "propertyId"  IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "unitId"      IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "tenantId"    IS NOT NULL THEN 1 ELSE 0 END) = 1
  );

-- Exactly one primary tenant per lease.
CREATE UNIQUE INDEX lease_tenant_one_primary_uq
  ON "LeaseTenant" ("leaseId")
  WHERE "isPrimary" = true;
```

- [ ] **Step 3: Apply**

```bash
npm run db:migrate -- --name constraints
```

Expected: Prisma records the migration and the constraints are applied.

- [ ] **Step 4: Commit**

```bash
git add prisma/migrations
git commit -m "feat(db): init migration + document & primary-tenant constraints"
```

---

### Task 6: Prisma client singleton

**Files:**
- Create: `lib/db.ts`

- [ ] **Step 1: Write the client**

```ts
// lib/db.ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add lib/db.ts
git commit -m "feat(db): Prisma client singleton with pg adapter"
```

---

## Phase C — Auth & infra

### Task 7: Error contract + shared helpers

**Files:**
- Create: `lib/errors.ts`

- [ ] **Step 1: Write the error helpers**

```ts
// lib/errors.ts
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'INTERNAL';

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }

  static unauthorized(message = 'Not authenticated') {
    return new ApiError('UNAUTHORIZED', message, 401);
  }
  static forbidden(message = 'Forbidden') {
    return new ApiError('FORBIDDEN', message, 403);
  }
  static notFound(message = 'Not found') {
    return new ApiError('NOT_FOUND', message, 404);
  }
  static validation(details: unknown, message = 'Validation failed') {
    return new ApiError('VALIDATION_ERROR', message, 422, details);
  }
  static conflict(message: string, details?: unknown) {
    return new ApiError('CONFLICT', message, 409, details);
  }
  static internal(message = 'Internal error') {
    return new ApiError('INTERNAL', message, 500);
  }
}

export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, details: err.details ?? undefined } },
      { status: err.status },
    );
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: err.flatten() } },
      { status: 422 },
    );
  }
  console.error('[api] unhandled error', err);
  return NextResponse.json(
    { error: { code: 'INTERNAL', message: 'Internal error' } },
    { status: 500 },
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/errors.ts
git commit -m "feat(api): error contract helpers"
```

---

### Task 8: NextAuth v5 config + session types

**Files:**
- Create: `lib/auth.ts`, `types/next-auth.d.ts`, `app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Augment NextAuth types**

```ts
// types/next-auth.d.ts
import type { Role } from '@prisma/client';
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      role: Role;
      orgId: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    role: Role;
    orgId: string;
  }
}
```

- [ ] **Step 2: NextAuth config**

```ts
// lib/auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const user = await db.user.findUnique({ where: { email } });
        if (!user || user.disabledAt) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          orgId: user.orgId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = (user as { id: string }).id;
        token.role = (user as { role: 'ADMIN' | 'PROPERTY_MANAGER' | 'FINANCE' | 'TENANT' }).role;
        token.orgId = (user as { orgId: string }).orgId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.userId;
        session.user.role = token.role;
        session.user.orgId = token.orgId;
      }
      return session;
    },
  },
});
```

- [ ] **Step 3: Route handler**

```ts
// app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add lib/auth.ts types/next-auth.d.ts app/api/auth
git commit -m "feat(auth): NextAuth v5 credentials + JWT session w/ orgId+role"
```

---

### Task 9: `withOrg` API wrapper

**Files:**
- Create: `lib/auth/with-org.ts`

- [ ] **Step 1: Write the wrapper**

```ts
// lib/auth/with-org.ts
import type { NextRequest, NextResponse } from 'next/server';
import type { Role } from '@prisma/client';
import { auth } from '@/lib/auth';
import { ApiError, toErrorResponse } from '@/lib/errors';

export type RouteCtx = {
  orgId: string;
  userId: string;
  role: Role;
};

type Handler<P> = (
  req: NextRequest,
  ctx: RouteCtx,
  params: P,
) => Promise<NextResponse> | NextResponse;

type RouteParams<P> = { params: Promise<P> };

export function withOrg<P = Record<string, string>>(
  handler: Handler<P>,
  opts?: { requireRole?: Role[] },
) {
  return async (req: NextRequest, routeParams: RouteParams<P>) => {
    try {
      const session = await auth();
      if (!session?.user) throw ApiError.unauthorized();
      if (opts?.requireRole && !opts.requireRole.includes(session.user.role)) {
        throw ApiError.forbidden();
      }
      const ctx: RouteCtx = {
        orgId: session.user.orgId,
        userId: session.user.id,
        role: session.user.role,
      };
      const params = (await routeParams.params) as P;
      return await handler(req, ctx, params);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add lib/auth/with-org.ts
git commit -m "feat(auth): withOrg wrapper for API routes"
```

---

### Task 10: `proxy.ts` middleware

**Files:**
- Create: `proxy.ts`

Next.js 16 replaces `middleware.ts` with `proxy.ts` at the repo root.

- [ ] **Step 1: Write the middleware**

```ts
// proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { Role } from '@prisma/client';

const PUBLIC_PATHS = ['/', '/login', '/api/auth'];
const STAFF_ROLES: Role[] = ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'];

function isPublic(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith('/api/auth')) return true;
  if (pathname.startsWith('/_next')) return true;
  if (pathname.startsWith('/favicon')) return true;
  return false;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const token = (await getToken({ req, secret: process.env.NEXTAUTH_SECRET })) as
    | { role?: Role }
    | null;

  if (!token) {
    const url = new URL('/login', req.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  const role = token.role;
  const isStaffArea =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/properties') ||
    pathname.startsWith('/units') ||
    pathname.startsWith('/tenants') ||
    pathname.startsWith('/leases') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/profile');
  const isTenantArea = pathname.startsWith('/tenant');
  const isAdminArea = pathname.startsWith('/settings');

  if (isStaffArea && (!role || !STAFF_ROLES.includes(role))) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (isTenantArea && role !== 'TENANT') {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (isAdminArea && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add proxy.ts
git commit -m "feat(auth): proxy middleware enforcing route-group roles"
```

---

## Phase D — Service layer

The service layer owns all business rules. Routes stay thin (auth + Zod parse + delegate). Each service file exports pure functions that take a `RouteCtx` (orgId, userId, role) plus typed input and call Prisma. Derived values (`status`, `occupancy`) are computed here and never re-derived in the UI.

### Task 11: Zod schemas

**Files:**
- Create: `lib/zod/property.ts`, `lib/zod/unit.ts`, `lib/zod/tenant.ts`, `lib/zod/lease.ts`, `lib/zod/document.ts`, `lib/zod/team.ts`

- [ ] **Step 1: Property schemas**

```ts
// lib/zod/property.ts
import { z } from 'zod';

export const provinceEnum = z.enum(['GP','WC','KZN','EC','FS','LP','MP','NW','NC']);

export const createPropertySchema = z.object({
  name: z.string().min(1).max(200),
  addressLine1: z.string().min(1).max(200),
  addressLine2: z.string().max(200).optional().nullable(),
  suburb: z.string().min(1).max(120),
  city: z.string().min(1).max(120),
  province: provinceEnum,
  postalCode: z.string().min(1).max(10),
  notes: z.string().max(2000).optional().nullable(),
  autoCreateMainUnit: z.boolean().default(true),
});

export const updatePropertySchema = createPropertySchema.partial().omit({ autoCreateMainUnit: true });
```

- [ ] **Step 2: Unit schemas**

```ts
// lib/zod/unit.ts
import { z } from 'zod';

export const createUnitSchema = z.object({
  propertyId: z.string().min(1),
  label: z.string().min(1).max(80),
  bedrooms: z.number().int().min(0).max(50).default(0),
  bathrooms: z.number().int().min(0).max(50).default(0),
  sizeSqm: z.number().int().min(1).max(100000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateUnitSchema = createUnitSchema.partial().omit({ propertyId: true });
```

- [ ] **Step 3: Tenant schemas**

```ts
// lib/zod/tenant.ts
import { z } from 'zod';

export const createTenantSchema = z.object({
  firstName: z.string().min(1).max(120),
  lastName: z.string().min(1).max(120),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  idNumber: z.string().max(40).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateTenantSchema = createTenantSchema.partial();
```

- [ ] **Step 4: Lease schemas**

```ts
// lib/zod/lease.ts
import { z } from 'zod';

export const leaseStateEnum = z.enum(['DRAFT','ACTIVE','TERMINATED','RENEWED']);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');

export const createLeaseSchema = z
  .object({
    unitId: z.string().min(1),
    tenantIds: z.array(z.string().min(1)).min(1).max(10),
    primaryTenantId: z.string().min(1),
    startDate: isoDate,
    endDate: isoDate,
    rentAmountCents: z.number().int().min(0),
    depositAmountCents: z.number().int().min(0),
    heldInTrustAccount: z.boolean().default(false),
    paymentDueDay: z.number().int().min(1).max(31),
    notes: z.string().max(2000).optional().nullable(),
  })
  .refine((v) => v.tenantIds.includes(v.primaryTenantId), {
    path: ['primaryTenantId'],
    message: 'primaryTenantId must be in tenantIds',
  })
  .refine((v) => new Date(v.startDate) <= new Date(v.endDate), {
    path: ['endDate'],
    message: 'endDate must be on or after startDate',
  });

export const updateDraftLeaseSchema = z.object({
  tenantIds: z.array(z.string().min(1)).min(1).max(10).optional(),
  primaryTenantId: z.string().min(1).optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  rentAmountCents: z.number().int().min(0).optional(),
  depositAmountCents: z.number().int().min(0).optional(),
  heldInTrustAccount: z.boolean().optional(),
  paymentDueDay: z.number().int().min(1).max(31).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const terminateLeaseSchema = z.object({
  terminatedAt: isoDate,
  terminatedReason: z.string().min(1).max(1000),
});

export const leaseListQuerySchema = z.object({
  status: z.enum(['DRAFT','ACTIVE','EXPIRING','EXPIRED','TERMINATED','RENEWED']).optional(),
  unitId: z.string().optional(),
  propertyId: z.string().optional(),
  expiringWithinDays: z.coerce.number().int().min(1).max(365).optional(),
});
```

- [ ] **Step 5: Document + team schemas**

```ts
// lib/zod/document.ts
import { z } from 'zod';

export const documentKindEnum = z.enum(['LEASE_AGREEMENT']);

export const documentUploadMetaSchema = z.object({
  kind: documentKindEnum,
});
```

```ts
// lib/zod/team.ts
import { z } from 'zod';

export const roleEnum = z.enum(['ADMIN','PROPERTY_MANAGER','FINANCE','TENANT']);

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  role: roleEnum,
  password: z.string().min(8).max(200),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  role: roleEnum.optional(),
  disabled: z.boolean().optional(),
});

export const updateOrgSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  expiringWindowDays: z.number().int().min(1).max(365).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
});
```

- [ ] **Step 6: Commit**

```bash
git add lib/zod
git commit -m "feat(zod): boundary schemas for all Slice 1 resources"
```

---

### Task 12: Properties service

**Files:**
- Create: `lib/services/properties.ts`

- [ ] **Step 1: Write service**

```ts
// lib/services/properties.ts
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import type { RouteCtx } from '@/lib/auth/with-org';
import type { z } from 'zod';
import type { createPropertySchema, updatePropertySchema } from '@/lib/zod/property';

export async function listProperties(ctx: RouteCtx) {
  return db.property.findMany({
    where: { orgId: ctx.orgId, deletedAt: null },
    orderBy: { name: 'asc' },
    include: { _count: { select: { units: true } } },
  });
}

export async function getProperty(ctx: RouteCtx, id: string) {
  const p = await db.property.findFirst({
    where: { id, orgId: ctx.orgId, deletedAt: null },
    include: {
      units: { orderBy: { label: 'asc' } },
    },
  });
  if (!p) throw ApiError.notFound('Property not found');
  return p;
}

export async function createProperty(
  ctx: RouteCtx,
  input: z.infer<typeof createPropertySchema>,
) {
  const { autoCreateMainUnit, ...data } = input;
  return db.$transaction(async (tx) => {
    const property = await tx.property.create({
      data: { ...data, orgId: ctx.orgId },
    });
    if (autoCreateMainUnit) {
      await tx.unit.create({
        data: { orgId: ctx.orgId, propertyId: property.id, label: 'Main' },
      });
    }
    return property;
  });
}

export async function updateProperty(
  ctx: RouteCtx,
  id: string,
  input: z.infer<typeof updatePropertySchema>,
) {
  const existing = await db.property.findFirst({
    where: { id, orgId: ctx.orgId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) throw ApiError.notFound('Property not found');
  return db.property.update({ where: { id }, data: input });
}

export async function softDeleteProperty(ctx: RouteCtx, id: string) {
  const existing = await db.property.findFirst({
    where: { id, orgId: ctx.orgId, deletedAt: null },
    include: {
      units: {
        include: { leases: { where: { state: { in: ['DRAFT', 'ACTIVE'] } }, select: { id: true } } },
      },
    },
  });
  if (!existing) throw ApiError.notFound('Property not found');
  const blockingLeases = existing.units.flatMap((u) => u.leases);
  if (blockingLeases.length > 0) {
    throw ApiError.conflict('Cannot delete: property has active or draft leases', {
      blockingLeaseIds: blockingLeases.map((l) => l.id),
    });
  }
  return db.property.update({ where: { id }, data: { deletedAt: new Date() } });
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npm run typecheck
git add lib/services/properties.ts
git commit -m "feat(services): properties CRUD + soft-delete w/ active-lease guard"
```

---

### Task 13: Units service + `getUnitOccupancy`

**Files:**
- Create: `lib/services/units.ts`

- [ ] **Step 1: Write service**

```ts
// lib/services/units.ts
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import type { RouteCtx } from '@/lib/auth/with-org';
import type { z } from 'zod';
import type { createUnitSchema, updateUnitSchema } from '@/lib/zod/unit';

export type UnitOccupancy = 'VACANT' | 'OCCUPIED' | 'UPCOMING' | 'CONFLICT';

export async function getUnitOccupancy(
  unitId: string,
  orgId: string,
  on: Date = new Date(),
): Promise<{ state: UnitOccupancy; coveringLeaseId: string | null; upcomingLeaseId: string | null }> {
  const leases = await db.lease.findMany({
    where: {
      unitId,
      orgId,
      state: { in: ['ACTIVE', 'DRAFT'] },
    },
    select: { id: true, state: true, startDate: true, endDate: true },
  });
  const today = new Date(Date.UTC(on.getUTCFullYear(), on.getUTCMonth(), on.getUTCDate()));

  const activeCovering = leases.filter(
    (l) => l.state === 'ACTIVE' && l.startDate <= today && l.endDate >= today,
  );
  if (activeCovering.length > 1) {
    return { state: 'CONFLICT', coveringLeaseId: activeCovering[0].id, upcomingLeaseId: null };
  }
  if (activeCovering.length === 1) {
    const upcoming = leases.find((l) => l.startDate > today) ?? null;
    return {
      state: 'OCCUPIED',
      coveringLeaseId: activeCovering[0].id,
      upcomingLeaseId: upcoming?.id ?? null,
    };
  }
  const upcoming = leases.find((l) => l.startDate > today);
  if (upcoming) return { state: 'UPCOMING', coveringLeaseId: null, upcomingLeaseId: upcoming.id };
  return { state: 'VACANT', coveringLeaseId: null, upcomingLeaseId: null };
}

export async function listUnits(ctx: RouteCtx, opts: { propertyId?: string }) {
  return db.unit.findMany({
    where: {
      orgId: ctx.orgId,
      ...(opts.propertyId ? { propertyId: opts.propertyId } : {}),
      property: { deletedAt: null },
    },
    orderBy: [{ propertyId: 'asc' }, { label: 'asc' }],
    include: { property: { select: { id: true, name: true } } },
  });
}

export async function getUnit(ctx: RouteCtx, id: string) {
  const unit = await db.unit.findFirst({
    where: { id, orgId: ctx.orgId, property: { deletedAt: null } },
    include: {
      property: true,
      leases: {
        orderBy: { startDate: 'desc' },
        include: {
          tenants: { include: { tenant: true } },
        },
      },
    },
  });
  if (!unit) throw ApiError.notFound('Unit not found');
  const occupancy = await getUnitOccupancy(unit.id, ctx.orgId);
  return { ...unit, occupancy };
}

export async function createUnit(ctx: RouteCtx, input: z.infer<typeof createUnitSchema>) {
  const property = await db.property.findFirst({
    where: { id: input.propertyId, orgId: ctx.orgId, deletedAt: null },
    select: { id: true },
  });
  if (!property) throw ApiError.notFound('Property not found');
  try {
    return await db.unit.create({ data: { ...input, orgId: ctx.orgId } });
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unique')) {
      throw ApiError.conflict('A unit with that label already exists on this property');
    }
    throw err;
  }
}

export async function updateUnit(ctx: RouteCtx, id: string, input: z.infer<typeof updateUnitSchema>) {
  const existing = await db.unit.findFirst({ where: { id, orgId: ctx.orgId }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Unit not found');
  return db.unit.update({ where: { id }, data: input });
}

export async function deleteUnit(ctx: RouteCtx, id: string) {
  const existing = await db.unit.findFirst({
    where: { id, orgId: ctx.orgId },
    include: { leases: { where: { state: { in: ['DRAFT', 'ACTIVE'] } }, select: { id: true } } },
  });
  if (!existing) throw ApiError.notFound('Unit not found');
  if (existing.leases.length > 0) {
    throw ApiError.conflict('Cannot delete: unit has active or draft leases');
  }
  return db.unit.delete({ where: { id } });
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npm run typecheck
git add lib/services/units.ts
git commit -m "feat(services): units CRUD + getUnitOccupancy"
```

---

### Task 14: Tenants service (soft-duplicate, archive)

**Files:**
- Create: `lib/services/tenants.ts`

- [ ] **Step 1: Write service**

```ts
// lib/services/tenants.ts
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import type { RouteCtx } from '@/lib/auth/with-org';
import type { z } from 'zod';
import type { createTenantSchema, updateTenantSchema } from '@/lib/zod/tenant';

export async function listTenants(
  ctx: RouteCtx,
  opts: { includeArchived?: boolean } = {},
) {
  return db.tenant.findMany({
    where: {
      orgId: ctx.orgId,
      ...(opts.includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    include: {
      _count: { select: { leases: true } },
    },
  });
}

export async function getTenant(ctx: RouteCtx, id: string) {
  const tenant = await db.tenant.findFirst({
    where: { id, orgId: ctx.orgId },
    include: {
      leases: {
        include: {
          lease: {
            include: {
              unit: { include: { property: { select: { id: true, name: true } } } },
            },
          },
        },
      },
    },
  });
  if (!tenant) throw ApiError.notFound('Tenant not found');
  return tenant;
}

export async function detectDuplicates(
  ctx: RouteCtx,
  input: { email?: string | null; idNumber?: string | null; phone?: string | null },
) {
  const or: Array<{ email?: string } | { idNumber?: string } | { phone?: string }> = [];
  if (input.email) or.push({ email: input.email });
  if (input.idNumber) or.push({ idNumber: input.idNumber });
  if (input.phone) or.push({ phone: input.phone });
  if (or.length === 0) return [];
  return db.tenant.findMany({
    where: { orgId: ctx.orgId, OR: or },
    select: { id: true, firstName: true, lastName: true, email: true, idNumber: true, phone: true },
    take: 5,
  });
}

export async function createTenant(ctx: RouteCtx, input: z.infer<typeof createTenantSchema>) {
  return db.tenant.create({ data: { ...input, orgId: ctx.orgId } });
}

export async function updateTenant(
  ctx: RouteCtx,
  id: string,
  input: z.infer<typeof updateTenantSchema>,
) {
  const existing = await db.tenant.findFirst({ where: { id, orgId: ctx.orgId }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Tenant not found');
  return db.tenant.update({ where: { id }, data: input });
}

export async function archiveTenant(ctx: RouteCtx, id: string) {
  const existing = await db.tenant.findFirst({
    where: { id, orgId: ctx.orgId },
    include: {
      leases: {
        include: {
          lease: { select: { state: true, startDate: true, endDate: true } },
        },
      },
    },
  });
  if (!existing) throw ApiError.notFound('Tenant not found');
  const today = new Date();
  const blocking = existing.leases.filter((lt) => {
    const l = lt.lease;
    if (l.state === 'ACTIVE' && l.endDate >= today) return true;
    if (l.state === 'DRAFT') return true;
    return false;
  });
  if (blocking.length > 0) {
    throw ApiError.conflict('Cannot archive tenant with active or draft leases');
  }
  return db.tenant.update({ where: { id }, data: { archivedAt: new Date() } });
}

export async function unarchiveTenant(ctx: RouteCtx, id: string) {
  const existing = await db.tenant.findFirst({ where: { id, orgId: ctx.orgId }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Tenant not found');
  return db.tenant.update({ where: { id }, data: { archivedAt: null } });
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npm run typecheck
git add lib/services/tenants.ts
git commit -m "feat(services): tenants CRUD + soft-duplicate + archive"
```

---

### Task 15: Leases service — state machine, derived status, overlap guard, renewal

**Files:**
- Create: `lib/services/leases.ts`

- [ ] **Step 1: Write service**

```ts
// lib/services/leases.ts
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import type { RouteCtx } from '@/lib/auth/with-org';
import type { Lease, LeaseState, Prisma } from '@prisma/client';
import type { z } from 'zod';
import type {
  createLeaseSchema,
  updateDraftLeaseSchema,
  terminateLeaseSchema,
  leaseListQuerySchema,
} from '@/lib/zod/lease';

export type DerivedStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'EXPIRING'
  | 'EXPIRED'
  | 'TERMINATED'
  | 'RENEWED';

function toDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function parseDate(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

export function deriveStatus(
  lease: Pick<Lease, 'state' | 'endDate'>,
  expiringWindowDays: number,
  now: Date = new Date(),
): DerivedStatus {
  switch (lease.state) {
    case 'DRAFT':
      return 'DRAFT';
    case 'TERMINATED':
      return 'TERMINATED';
    case 'RENEWED':
      return 'RENEWED';
    case 'ACTIVE': {
      const today = toDateOnly(now);
      const end = toDateOnly(lease.endDate);
      if (end < today) return 'EXPIRED';
      const windowEnd = new Date(today);
      windowEnd.setUTCDate(windowEnd.getUTCDate() + expiringWindowDays);
      if (end <= windowEnd) return 'EXPIRING';
      return 'ACTIVE';
    }
  }
}

async function getExpiringWindow(orgId: string): Promise<number> {
  const org = await db.org.findUnique({ where: { id: orgId }, select: { expiringWindowDays: true } });
  return org?.expiringWindowDays ?? Number(process.env.EXPIRING_WINDOW_DAYS ?? 60);
}

async function assertNoOverlap(
  tx: Prisma.TransactionClient,
  orgId: string,
  unitId: string,
  startDate: Date,
  endDate: Date,
  excludeLeaseId?: string,
) {
  const conflicts = await tx.lease.findMany({
    where: {
      orgId,
      unitId,
      state: 'ACTIVE',
      ...(excludeLeaseId ? { NOT: { id: excludeLeaseId } } : {}),
      AND: [
        { startDate: { lte: endDate } },
        { endDate: { gte: startDate } },
      ],
    },
    select: { id: true, startDate: true, endDate: true },
  });
  if (conflicts.length > 0) {
    throw ApiError.conflict('Lease period overlaps an existing active lease', {
      conflictingLeaseIds: conflicts.map((c) => c.id),
      code: 'LEASE_OVERLAP',
    });
  }
}

async function attach(
  ctx: RouteCtx,
  lease: Lease & { tenants: Array<{ tenantId: string; isPrimary: boolean; tenant: { id: string; firstName: string; lastName: string } }> },
): Promise<
  Lease & {
    status: DerivedStatus;
    tenants: typeof lease.tenants;
  }
> {
  const window = await getExpiringWindow(ctx.orgId);
  return { ...lease, status: deriveStatus(lease, window) };
}

export async function listLeases(
  ctx: RouteCtx,
  query: z.infer<typeof leaseListQuerySchema>,
) {
  const window = await getExpiringWindow(ctx.orgId);
  const now = new Date();
  const today = toDateOnly(now);

  const where: Prisma.LeaseWhereInput = { orgId: ctx.orgId };
  if (query.unitId) where.unitId = query.unitId;
  if (query.propertyId) where.unit = { propertyId: query.propertyId };

  if (query.status) {
    switch (query.status) {
      case 'DRAFT':
      case 'TERMINATED':
      case 'RENEWED':
        where.state = query.status;
        break;
      case 'ACTIVE': {
        const cutoff = new Date(today);
        cutoff.setUTCDate(cutoff.getUTCDate() + window);
        where.state = 'ACTIVE';
        where.endDate = { gt: cutoff };
        break;
      }
      case 'EXPIRING': {
        const cutoff = new Date(today);
        cutoff.setUTCDate(cutoff.getUTCDate() + window);
        where.state = 'ACTIVE';
        where.endDate = { gte: today, lte: cutoff };
        break;
      }
      case 'EXPIRED': {
        where.state = 'ACTIVE';
        where.endDate = { lt: today };
        break;
      }
    }
  }

  if (query.expiringWithinDays !== undefined) {
    const cutoff = new Date(today);
    cutoff.setUTCDate(cutoff.getUTCDate() + query.expiringWithinDays);
    where.state = 'ACTIVE';
    where.endDate = { gte: today, lte: cutoff };
  }

  const leases = await db.lease.findMany({
    where,
    orderBy: { startDate: 'desc' },
    include: {
      unit: { include: { property: { select: { id: true, name: true } } } },
      tenants: { include: { tenant: true } },
    },
  });

  return leases.map((l) => ({ ...l, status: deriveStatus(l, window, now) }));
}

export async function getLease(ctx: RouteCtx, id: string) {
  const lease = await db.lease.findFirst({
    where: { id, orgId: ctx.orgId },
    include: {
      unit: { include: { property: true } },
      tenants: { include: { tenant: true } },
      documents: true,
      renewedFrom: true,
      renewedTo: true,
    },
  });
  if (!lease) throw ApiError.notFound('Lease not found');
  const window = await getExpiringWindow(ctx.orgId);
  return { ...lease, status: deriveStatus(lease, window) };
}

export async function createLease(ctx: RouteCtx, input: z.infer<typeof createLeaseSchema>) {
  const start = parseDate(input.startDate);
  const end = parseDate(input.endDate);
  return db.$transaction(async (tx) => {
    const unit = await tx.unit.findFirst({
      where: { id: input.unitId, orgId: ctx.orgId },
      select: { id: true },
    });
    if (!unit) throw ApiError.notFound('Unit not found');

    const tenants = await tx.tenant.findMany({
      where: { id: { in: input.tenantIds }, orgId: ctx.orgId, archivedAt: null },
      select: { id: true },
    });
    if (tenants.length !== input.tenantIds.length) {
      throw ApiError.validation({ tenantIds: 'One or more tenants not found or archived' });
    }

    // Drafts do not block; only ACTIVE overlaps block at create-time.
    await assertNoOverlap(tx, ctx.orgId, input.unitId, start, end);

    const lease = await tx.lease.create({
      data: {
        orgId: ctx.orgId,
        unitId: input.unitId,
        startDate: start,
        endDate: end,
        rentAmountCents: input.rentAmountCents,
        depositAmountCents: input.depositAmountCents,
        heldInTrustAccount: input.heldInTrustAccount,
        paymentDueDay: input.paymentDueDay,
        notes: input.notes ?? null,
        state: 'DRAFT',
        tenants: {
          create: input.tenantIds.map((tid) => ({
            tenantId: tid,
            isPrimary: tid === input.primaryTenantId,
          })),
        },
      },
      include: { tenants: { include: { tenant: true } } },
    });
    return lease;
  });
}

export async function updateDraftLease(
  ctx: RouteCtx,
  id: string,
  input: z.infer<typeof updateDraftLeaseSchema>,
) {
  return db.$transaction(async (tx) => {
    const existing = await tx.lease.findFirst({ where: { id, orgId: ctx.orgId } });
    if (!existing) throw ApiError.notFound('Lease not found');
    if (existing.state !== 'DRAFT') {
      throw ApiError.conflict('Only DRAFT leases may be edited');
    }

    const data: Prisma.LeaseUpdateInput = {};
    if (input.startDate) data.startDate = parseDate(input.startDate);
    if (input.endDate) data.endDate = parseDate(input.endDate);
    if (input.rentAmountCents !== undefined) data.rentAmountCents = input.rentAmountCents;
    if (input.depositAmountCents !== undefined) data.depositAmountCents = input.depositAmountCents;
    if (input.heldInTrustAccount !== undefined) data.heldInTrustAccount = input.heldInTrustAccount;
    if (input.paymentDueDay !== undefined) data.paymentDueDay = input.paymentDueDay;
    if (input.notes !== undefined) data.notes = input.notes;

    await tx.lease.update({ where: { id }, data });

    if (input.tenantIds && input.primaryTenantId) {
      if (!input.tenantIds.includes(input.primaryTenantId)) {
        throw ApiError.validation({ primaryTenantId: 'Must be included in tenantIds' });
      }
      await tx.leaseTenant.deleteMany({ where: { leaseId: id } });
      await tx.leaseTenant.createMany({
        data: input.tenantIds.map((tid) => ({
          leaseId: id,
          tenantId: tid,
          isPrimary: tid === input.primaryTenantId,
        })),
      });
    }

    return tx.lease.findUniqueOrThrow({
      where: { id },
      include: { tenants: { include: { tenant: true } } },
    });
  });
}

export async function activateLease(ctx: RouteCtx, id: string) {
  return db.$transaction(async (tx) => {
    const lease = await tx.lease.findFirst({ where: { id, orgId: ctx.orgId } });
    if (!lease) throw ApiError.notFound('Lease not found');
    if (lease.state !== 'DRAFT') {
      throw ApiError.conflict(`Lease is ${lease.state}, cannot activate`);
    }
    await assertNoOverlap(tx, ctx.orgId, lease.unitId, lease.startDate, lease.endDate, lease.id);
    return tx.lease.update({ where: { id }, data: { state: 'ACTIVE' } });
  });
}

export async function terminateLease(
  ctx: RouteCtx,
  id: string,
  input: z.infer<typeof terminateLeaseSchema>,
) {
  const lease = await db.lease.findFirst({ where: { id, orgId: ctx.orgId } });
  if (!lease) throw ApiError.notFound('Lease not found');
  if (lease.state !== 'ACTIVE') {
    throw ApiError.conflict(`Only ACTIVE leases may be terminated (current: ${lease.state})`);
  }
  return db.lease.update({
    where: { id },
    data: {
      state: 'TERMINATED',
      terminatedAt: parseDate(input.terminatedAt),
      terminatedReason: input.terminatedReason,
    },
  });
}

export async function renewLease(
  ctx: RouteCtx,
  id: string,
  input: z.infer<typeof createLeaseSchema>,
) {
  const start = parseDate(input.startDate);
  const end = parseDate(input.endDate);
  return db.$transaction(async (tx) => {
    const predecessor = await tx.lease.findFirst({
      where: { id, orgId: ctx.orgId },
      include: { tenants: true },
    });
    if (!predecessor) throw ApiError.notFound('Lease not found');
    if (predecessor.state !== 'ACTIVE') {
      throw ApiError.conflict('Only ACTIVE leases can be renewed');
    }
    if (predecessor.unitId !== input.unitId) {
      throw ApiError.validation({ unitId: 'Renewal must stay on the same unit' });
    }

    const tenants = await tx.tenant.findMany({
      where: { id: { in: input.tenantIds }, orgId: ctx.orgId, archivedAt: null },
      select: { id: true },
    });
    if (tenants.length !== input.tenantIds.length) {
      throw ApiError.validation({ tenantIds: 'One or more tenants not found or archived' });
    }

    const successor = await tx.lease.create({
      data: {
        orgId: ctx.orgId,
        unitId: input.unitId,
        startDate: start,
        endDate: end,
        rentAmountCents: input.rentAmountCents,
        depositAmountCents: input.depositAmountCents,
        heldInTrustAccount: input.heldInTrustAccount,
        paymentDueDay: input.paymentDueDay,
        notes: input.notes ?? null,
        state: 'DRAFT',
        renewedFromId: predecessor.id,
        tenants: {
          create: input.tenantIds.map((tid) => ({
            tenantId: tid,
            isPrimary: tid === input.primaryTenantId,
          })),
        },
      },
      include: { tenants: { include: { tenant: true } } },
    });

    await tx.lease.update({ where: { id: predecessor.id }, data: { state: 'RENEWED' } });

    return successor;
  });
}

export async function setPrimaryTenant(ctx: RouteCtx, leaseId: string, tenantId: string) {
  return db.$transaction(async (tx) => {
    const lease = await tx.lease.findFirst({
      where: { id: leaseId, orgId: ctx.orgId },
      include: { tenants: true },
    });
    if (!lease) throw ApiError.notFound('Lease not found');
    if (!lease.tenants.some((t) => t.tenantId === tenantId)) {
      throw ApiError.validation({ tenantId: 'Tenant is not on this lease' });
    }
    await tx.leaseTenant.updateMany({
      where: { leaseId, isPrimary: true },
      data: { isPrimary: false },
    });
    await tx.leaseTenant.update({
      where: { leaseId_tenantId: { leaseId, tenantId } },
      data: { isPrimary: true },
    });
    return tx.lease.findUniqueOrThrow({
      where: { id: leaseId },
      include: { tenants: { include: { tenant: true } } },
    });
  });
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npm run typecheck
git add lib/services/leases.ts
git commit -m "feat(services): lease state machine, derived status, overlap guard, renewal"
```

---

### Task 16: Documents service (Vercel Blob)

**Files:**
- Create: `lib/blob.ts`, `lib/services/documents.ts`

- [ ] **Step 1: Blob helpers**

```ts
// lib/blob.ts
import { put, del } from '@vercel/blob';

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

export function validateFile(file: File) {
  if (file.size > MAX_BYTES) throw new Error('File too large (max 20MB)');
  if (!ALLOWED_MIME.has(file.type)) throw new Error(`Unsupported file type: ${file.type}`);
}

export async function uploadBlob(path: string, file: File) {
  const result = await put(path, file, {
    access: 'public',
    addRandomSuffix: true,
    contentType: file.type,
  });
  return { url: result.url, pathname: result.pathname };
}

export async function deleteBlob(pathname: string) {
  await del(pathname);
}
```

- [ ] **Step 2: Documents service**

```ts
// lib/services/documents.ts
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { uploadBlob, validateFile } from '@/lib/blob';
import type { RouteCtx } from '@/lib/auth/with-org';
import type { DocumentKind } from '@prisma/client';

export async function uploadLeaseAgreement(
  ctx: RouteCtx,
  leaseId: string,
  file: File,
) {
  const lease = await db.lease.findFirst({
    where: { id: leaseId, orgId: ctx.orgId },
    select: { id: true },
  });
  if (!lease) throw ApiError.notFound('Lease not found');
  try {
    validateFile(file);
  } catch (err) {
    throw ApiError.validation({ file: (err as Error).message });
  }
  const { url, pathname } = await uploadBlob(
    `orgs/${ctx.orgId}/leases/${leaseId}/${file.name}`,
    file,
  );
  return db.document.create({
    data: {
      orgId: ctx.orgId,
      kind: 'LEASE_AGREEMENT' as DocumentKind,
      leaseId,
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      storageKey: pathname,
      uploadedById: ctx.userId,
    },
  });
}

export async function getDocumentForDownload(ctx: RouteCtx, id: string) {
  const doc = await db.document.findFirst({ where: { id, orgId: ctx.orgId } });
  if (!doc) throw ApiError.notFound('Document not found');
  // For Vercel Blob public access the pathname converts to a public URL.
  // In Slice 2+ we'll switch to private blobs + signed URLs.
  return doc;
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
npm run typecheck
git add lib/blob.ts lib/services/documents.ts
git commit -m "feat(services): document upload via Vercel Blob"
```

---

### Task 17: Team + Dashboard services

**Files:**
- Create: `lib/services/team.ts`, `lib/services/dashboard.ts`

- [ ] **Step 1: Team service**

```ts
// lib/services/team.ts
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import type { RouteCtx } from '@/lib/auth/with-org';
import type { z } from 'zod';
import type {
  createUserSchema,
  updateUserSchema,
  updateOrgSchema,
  changePasswordSchema,
} from '@/lib/zod/team';

export async function listTeam(ctx: RouteCtx) {
  return db.user.findMany({
    where: { orgId: ctx.orgId },
    orderBy: { email: 'asc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      disabledAt: true,
      createdAt: true,
    },
  });
}

export async function createTeamUser(ctx: RouteCtx, input: z.infer<typeof createUserSchema>) {
  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.conflict('A user with this email already exists');
  const passwordHash = await bcrypt.hash(input.password, 10);
  return db.user.create({
    data: {
      email: input.email,
      name: input.name,
      role: input.role,
      orgId: ctx.orgId,
      passwordHash,
    },
    select: { id: true, email: true, name: true, role: true },
  });
}

export async function updateTeamUser(
  ctx: RouteCtx,
  id: string,
  input: z.infer<typeof updateUserSchema>,
) {
  const existing = await db.user.findFirst({ where: { id, orgId: ctx.orgId } });
  if (!existing) throw ApiError.notFound('User not found');
  return db.user.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.disabled !== undefined
        ? { disabledAt: input.disabled ? new Date() : null }
        : {}),
    },
    select: { id: true, email: true, name: true, role: true, disabledAt: true },
  });
}

export async function getOrg(ctx: RouteCtx) {
  const org = await db.org.findUnique({ where: { id: ctx.orgId } });
  if (!org) throw ApiError.notFound('Org not found');
  return org;
}

export async function updateOrg(ctx: RouteCtx, input: z.infer<typeof updateOrgSchema>) {
  return db.org.update({ where: { id: ctx.orgId }, data: input });
}

export async function changeOwnPassword(
  ctx: RouteCtx,
  input: z.infer<typeof changePasswordSchema>,
) {
  const user = await db.user.findUnique({ where: { id: ctx.userId } });
  if (!user) throw ApiError.notFound('User not found');
  const ok = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!ok) throw ApiError.validation({ currentPassword: 'Incorrect password' });
  const passwordHash = await bcrypt.hash(input.newPassword, 10);
  await db.user.update({ where: { id: ctx.userId }, data: { passwordHash } });
  return { ok: true };
}
```

- [ ] **Step 2: Dashboard service**

```ts
// lib/services/dashboard.ts
import { db } from '@/lib/db';
import type { RouteCtx } from '@/lib/auth/with-org';
import { deriveStatus } from '@/lib/services/leases';
import { getUnitOccupancy } from '@/lib/services/units';

export async function getDashboardSummary(ctx: RouteCtx) {
  const org = await db.org.findUnique({
    where: { id: ctx.orgId },
    select: { expiringWindowDays: true },
  });
  const window = org?.expiringWindowDays ?? 60;
  const now = new Date();

  const [totalProperties, units] = await Promise.all([
    db.property.count({ where: { orgId: ctx.orgId, deletedAt: null } }),
    db.unit.findMany({
      where: { orgId: ctx.orgId, property: { deletedAt: null } },
      select: { id: true },
    }),
  ]);
  const totalUnits = units.length;

  const occupancies = await Promise.all(
    units.map((u) => getUnitOccupancy(u.id, ctx.orgId, now)),
  );
  const occupiedUnits = occupancies.filter((o) => o.state === 'OCCUPIED').length;
  const vacantUnits = occupancies.filter((o) => o.state === 'VACANT').length;
  const upcomingUnits = occupancies.filter((o) => o.state === 'UPCOMING').length;
  const conflictUnits = occupancies.filter((o) => o.state === 'CONFLICT').length;

  const activeLeasesRaw = await db.lease.findMany({
    where: { orgId: ctx.orgId, state: 'ACTIVE' },
    select: { id: true, state: true, endDate: true },
  });
  const withStatus = activeLeasesRaw.map((l) => ({ id: l.id, status: deriveStatus(l, window, now) }));
  const activeLeases = withStatus.filter((l) => l.status === 'ACTIVE' || l.status === 'EXPIRING').length;
  const expiringSoonLeases = withStatus.filter((l) => l.status === 'EXPIRING').length;
  const expiredLeases = withStatus.filter((l) => l.status === 'EXPIRED').length;

  const [recentLeases, expiringList] = await Promise.all([
    db.lease.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        unit: { include: { property: { select: { name: true } } } },
        tenants: {
          where: { isPrimary: true },
          include: { tenant: { select: { firstName: true, lastName: true } } },
        },
      },
    }),
    db.lease.findMany({
      where: { orgId: ctx.orgId, state: 'ACTIVE' },
      include: {
        unit: { include: { property: { select: { name: true } } } },
        tenants: {
          where: { isPrimary: true },
          include: { tenant: { select: { firstName: true, lastName: true } } },
        },
      },
    }),
  ]);

  const expiringSoonList = expiringList
    .map((l) => ({ ...l, status: deriveStatus(l, window, now) }))
    .filter((l) => l.status === 'EXPIRING')
    .sort((a, b) => a.endDate.getTime() - b.endDate.getTime())
    .slice(0, 10)
    .map((l) => {
      const primary = l.tenants[0]?.tenant;
      const daysUntil =
        Math.ceil((l.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: l.id,
        unitLabel: l.unit.label,
        propertyName: l.unit.property.name,
        primaryTenantName: primary ? `${primary.firstName} ${primary.lastName}` : null,
        endDate: l.endDate.toISOString().slice(0, 10),
        daysUntilExpiry: daysUntil,
      };
    });

  return {
    totalProperties,
    totalUnits,
    occupiedUnits,
    vacantUnits,
    upcomingUnits,
    conflictUnits,
    activeLeases,
    expiringSoonLeases,
    expiredLeases,
    recentLeases: recentLeases.map((l) => ({
      id: l.id,
      unitLabel: l.unit.label,
      propertyName: l.unit.property.name,
      primaryTenantName: l.tenants[0]
        ? `${l.tenants[0].tenant.firstName} ${l.tenants[0].tenant.lastName}`
        : null,
      startDate: l.startDate.toISOString().slice(0, 10),
      endDate: l.endDate.toISOString().slice(0, 10),
      state: l.state,
    })),
    expiringSoonList,
  };
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
npm run typecheck
git add lib/services/team.ts lib/services/dashboard.ts
git commit -m "feat(services): team management + dashboard summary"
```

---

## Phase E — API routes

Every handler follows the same shape:

```ts
export const GET = withOrg(async (req, ctx) => {
  const data = await service(ctx, ...);
  return NextResponse.json(data);
});
```

### Task 18: Properties API routes

**Files:**
- Create: `app/api/properties/route.ts`, `app/api/properties/[id]/route.ts`

- [ ] **Step 1: Collection handler**

```ts
// app/api/properties/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { createPropertySchema } from '@/lib/zod/property';
import { listProperties, createProperty } from '@/lib/services/properties';

export const GET = withOrg(async (_req, ctx) => {
  const rows = await listProperties(ctx);
  return NextResponse.json({ data: rows });
});

export const POST = withOrg(async (req, ctx) => {
  const body = await req.json();
  const input = createPropertySchema.parse(body);
  const row = await createProperty(ctx, input);
  return NextResponse.json({ data: row }, { status: 201 });
});
```

- [ ] **Step 2: Item handler**

```ts
// app/api/properties/[id]/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { updatePropertySchema } from '@/lib/zod/property';
import { getProperty, updateProperty, softDeleteProperty } from '@/lib/services/properties';

type Params = { id: string };

export const GET = withOrg<Params>(async (_req, ctx, { id }) => {
  const row = await getProperty(ctx, id);
  return NextResponse.json({ data: row });
});

export const PATCH = withOrg<Params>(async (req, ctx, { id }) => {
  const body = await req.json();
  const input = updatePropertySchema.parse(body);
  const row = await updateProperty(ctx, id, input);
  return NextResponse.json({ data: row });
});

export const DELETE = withOrg<Params>(
  async (_req, ctx, { id }) => {
    await softDeleteProperty(ctx, id);
    return NextResponse.json({ data: { id, deleted: true } });
  },
  { requireRole: ['ADMIN'] },
);
```

- [ ] **Step 3: Commit**

```bash
git add app/api/properties
git commit -m "feat(api): properties routes"
```

---

### Task 19: Units + Tenants API routes

**Files:**
- Create: `app/api/units/route.ts`, `app/api/units/[id]/route.ts`
- Create: `app/api/tenants/route.ts`, `app/api/tenants/[id]/route.ts`, `app/api/tenants/[id]/archive/route.ts`

- [ ] **Step 1: Units routes**

```ts
// app/api/units/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { createUnitSchema } from '@/lib/zod/unit';
import { listUnits, createUnit } from '@/lib/services/units';

export const GET = withOrg(async (req, ctx) => {
  const propertyId = req.nextUrl.searchParams.get('propertyId') ?? undefined;
  const rows = await listUnits(ctx, { propertyId });
  return NextResponse.json({ data: rows });
});

export const POST = withOrg(async (req, ctx) => {
  const input = createUnitSchema.parse(await req.json());
  const row = await createUnit(ctx, input);
  return NextResponse.json({ data: row }, { status: 201 });
});
```

```ts
// app/api/units/[id]/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { updateUnitSchema } from '@/lib/zod/unit';
import { getUnit, updateUnit, deleteUnit } from '@/lib/services/units';

type Params = { id: string };

export const GET = withOrg<Params>(async (_req, ctx, { id }) => {
  const row = await getUnit(ctx, id);
  return NextResponse.json({ data: row });
});

export const PATCH = withOrg<Params>(async (req, ctx, { id }) => {
  const input = updateUnitSchema.parse(await req.json());
  const row = await updateUnit(ctx, id, input);
  return NextResponse.json({ data: row });
});

export const DELETE = withOrg<Params>(async (_req, ctx, { id }) => {
  await deleteUnit(ctx, id);
  return NextResponse.json({ data: { id, deleted: true } });
});
```

- [ ] **Step 2: Tenants routes**

```ts
// app/api/tenants/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { createTenantSchema } from '@/lib/zod/tenant';
import { listTenants, createTenant, detectDuplicates } from '@/lib/services/tenants';

export const GET = withOrg(async (req, ctx) => {
  const includeArchived = req.nextUrl.searchParams.get('includeArchived') === 'true';
  const rows = await listTenants(ctx, { includeArchived });
  return NextResponse.json({ data: rows });
});

export const POST = withOrg(async (req, ctx) => {
  const input = createTenantSchema.parse(await req.json());
  const duplicates = await detectDuplicates(ctx, input);
  const row = await createTenant(ctx, input);
  return NextResponse.json({ data: row, warnings: { duplicates } }, { status: 201 });
});
```

```ts
// app/api/tenants/[id]/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { updateTenantSchema } from '@/lib/zod/tenant';
import { getTenant, updateTenant } from '@/lib/services/tenants';

type Params = { id: string };

export const GET = withOrg<Params>(async (_req, ctx, { id }) => {
  const row = await getTenant(ctx, id);
  return NextResponse.json({ data: row });
});

export const PATCH = withOrg<Params>(async (req, ctx, { id }) => {
  const input = updateTenantSchema.parse(await req.json());
  const row = await updateTenant(ctx, id, input);
  return NextResponse.json({ data: row });
});
```

```ts
// app/api/tenants/[id]/archive/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { archiveTenant, unarchiveTenant } from '@/lib/services/tenants';

type Params = { id: string };

export const POST = withOrg<Params>(async (_req, ctx, { id }) => {
  const row = await archiveTenant(ctx, id);
  return NextResponse.json({ data: row });
});

export const DELETE = withOrg<Params>(async (_req, ctx, { id }) => {
  const row = await unarchiveTenant(ctx, id);
  return NextResponse.json({ data: row });
});
```

- [ ] **Step 3: Commit**

```bash
git add app/api/units app/api/tenants
git commit -m "feat(api): units + tenants routes"
```

---

### Task 20: Leases API routes + actions

**Files:**
- Create: `app/api/leases/route.ts`, `app/api/leases/[id]/route.ts`
- Create: `app/api/leases/[id]/activate/route.ts`, `app/api/leases/[id]/terminate/route.ts`
- Create: `app/api/leases/[id]/renew/route.ts`, `app/api/leases/[id]/primary-tenant/route.ts`
- Create: `app/api/leases/[id]/documents/route.ts`

- [ ] **Step 1: Collection + item**

```ts
// app/api/leases/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { createLeaseSchema, leaseListQuerySchema } from '@/lib/zod/lease';
import { listLeases, createLease } from '@/lib/services/leases';

export const GET = withOrg(async (req, ctx) => {
  const query = leaseListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const rows = await listLeases(ctx, query);
  return NextResponse.json({ data: rows });
});

export const POST = withOrg(async (req, ctx) => {
  const input = createLeaseSchema.parse(await req.json());
  const row = await createLease(ctx, input);
  return NextResponse.json({ data: row }, { status: 201 });
});
```

```ts
// app/api/leases/[id]/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { updateDraftLeaseSchema } from '@/lib/zod/lease';
import { getLease, updateDraftLease } from '@/lib/services/leases';

type Params = { id: string };

export const GET = withOrg<Params>(async (_req, ctx, { id }) => {
  const row = await getLease(ctx, id);
  return NextResponse.json({ data: row });
});

export const PATCH = withOrg<Params>(async (req, ctx, { id }) => {
  const input = updateDraftLeaseSchema.parse(await req.json());
  const row = await updateDraftLease(ctx, id, input);
  return NextResponse.json({ data: row });
});
```

- [ ] **Step 2: Action endpoints**

```ts
// app/api/leases/[id]/activate/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { activateLease } from '@/lib/services/leases';

type Params = { id: string };

export const POST = withOrg<Params>(async (_req, ctx, { id }) => {
  const row = await activateLease(ctx, id);
  return NextResponse.json({ data: row });
});
```

```ts
// app/api/leases/[id]/terminate/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { terminateLeaseSchema } from '@/lib/zod/lease';
import { terminateLease } from '@/lib/services/leases';

type Params = { id: string };

export const POST = withOrg<Params>(async (req, ctx, { id }) => {
  const input = terminateLeaseSchema.parse(await req.json());
  const row = await terminateLease(ctx, id, input);
  return NextResponse.json({ data: row });
});
```

```ts
// app/api/leases/[id]/renew/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { createLeaseSchema } from '@/lib/zod/lease';
import { renewLease } from '@/lib/services/leases';

type Params = { id: string };

export const POST = withOrg<Params>(async (req, ctx, { id }) => {
  const input = createLeaseSchema.parse(await req.json());
  const row = await renewLease(ctx, id, input);
  return NextResponse.json({ data: row }, { status: 201 });
});
```

```ts
// app/api/leases/[id]/primary-tenant/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withOrg } from '@/lib/auth/with-org';
import { setPrimaryTenant } from '@/lib/services/leases';

type Params = { id: string };
const schema = z.object({ tenantId: z.string().min(1) });

export const PATCH = withOrg<Params>(async (req, ctx, { id }) => {
  const { tenantId } = schema.parse(await req.json());
  const row = await setPrimaryTenant(ctx, id, tenantId);
  return NextResponse.json({ data: row });
});
```

- [ ] **Step 3: Document upload endpoint**

```ts
// app/api/leases/[id]/documents/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { ApiError } from '@/lib/errors';
import { uploadLeaseAgreement } from '@/lib/services/documents';

type Params = { id: string };

export const POST = withOrg<Params>(async (req, ctx, { id }) => {
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) throw ApiError.validation({ file: 'Missing file' });
  const row = await uploadLeaseAgreement(ctx, id, file);
  return NextResponse.json({ data: row }, { status: 201 });
});
```

- [ ] **Step 4: Commit**

```bash
git add app/api/leases
git commit -m "feat(api): leases routes + actions (activate/terminate/renew/primary-tenant/documents)"
```

---

### Task 21: Documents download + Settings + Dashboard routes

**Files:**
- Create: `app/api/documents/[id]/download/route.ts`
- Create: `app/api/settings/team/route.ts`, `app/api/settings/team/[id]/route.ts`
- Create: `app/api/settings/org/route.ts`
- Create: `app/api/profile/password/route.ts`
- Create: `app/api/dashboard/summary/route.ts`

- [ ] **Step 1: Document download**

```ts
// app/api/documents/[id]/download/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { getDocumentForDownload } from '@/lib/services/documents';

type Params = { id: string };

export const GET = withOrg<Params>(async (_req, ctx, { id }) => {
  const doc = await getDocumentForDownload(ctx, id);
  const url = `https://${process.env.BLOB_PUBLIC_HOST ?? 'blob.vercel-storage.com'}/${doc.storageKey}`;
  return NextResponse.redirect(url, 302);
});
```

- [ ] **Step 2: Settings — team**

```ts
// app/api/settings/team/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { createUserSchema } from '@/lib/zod/team';
import { listTeam, createTeamUser } from '@/lib/services/team';

export const GET = withOrg(
  async (_req, ctx) => NextResponse.json({ data: await listTeam(ctx) }),
  { requireRole: ['ADMIN'] },
);

export const POST = withOrg(
  async (req, ctx) => {
    const input = createUserSchema.parse(await req.json());
    const row = await createTeamUser(ctx, input);
    return NextResponse.json({ data: row }, { status: 201 });
  },
  { requireRole: ['ADMIN'] },
);
```

```ts
// app/api/settings/team/[id]/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { updateUserSchema } from '@/lib/zod/team';
import { updateTeamUser } from '@/lib/services/team';

type Params = { id: string };

export const PATCH = withOrg<Params>(
  async (req, ctx, { id }) => {
    const input = updateUserSchema.parse(await req.json());
    const row = await updateTeamUser(ctx, id, input);
    return NextResponse.json({ data: row });
  },
  { requireRole: ['ADMIN'] },
);
```

- [ ] **Step 3: Settings — org + profile + dashboard**

```ts
// app/api/settings/org/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { updateOrgSchema } from '@/lib/zod/team';
import { getOrg, updateOrg } from '@/lib/services/team';

export const GET = withOrg(
  async (_req, ctx) => NextResponse.json({ data: await getOrg(ctx) }),
  { requireRole: ['ADMIN'] },
);

export const PATCH = withOrg(
  async (req, ctx) => {
    const input = updateOrgSchema.parse(await req.json());
    return NextResponse.json({ data: await updateOrg(ctx, input) });
  },
  { requireRole: ['ADMIN'] },
);
```

```ts
// app/api/profile/password/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { changePasswordSchema } from '@/lib/zod/team';
import { changeOwnPassword } from '@/lib/services/team';

export const POST = withOrg(async (req, ctx) => {
  const input = changePasswordSchema.parse(await req.json());
  return NextResponse.json({ data: await changeOwnPassword(ctx, input) });
});
```

```ts
// app/api/dashboard/summary/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { getDashboardSummary } from '@/lib/services/dashboard';

export const GET = withOrg(async (_req, ctx) => {
  return NextResponse.json({ data: await getDashboardSummary(ctx) });
});
```

- [ ] **Step 4: Commit**

```bash
git add app/api/documents app/api/settings app/api/profile app/api/dashboard
git commit -m "feat(api): documents download + settings + profile + dashboard"
```

---

## Phase F — UI foundation

UI in Slice 1 is pragmatic, not pretty. Server components fetch directly via services; client components only for forms and interactive bits. All forms use native `<form action={serverAction}>` where possible to avoid a client-side fetch layer.

### Task 22: Tailwind + shadcn/ui init + root layout

**Files:**
- Modify: `app/layout.tsx`, `app/globals.css`
- Create: `components.json`, `components/ui/*` (button, input, label, select, badge, card, dialog, table, textarea)
- Create: `lib/utils.ts`

- [ ] **Step 1: Initialize shadcn/ui**

```bash
npx shadcn@latest init -d
```

When prompted: New York style, Slate base color, CSS variables yes.

- [ ] **Step 2: Add primitives**

```bash
npx shadcn@latest add button input label select badge card dialog table textarea checkbox form
```

- [ ] **Step 3: Root layout**

```tsx
// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Property Management Ops',
  description: 'Portfolio, tenants, and leases',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Root page redirect**

```tsx
// app/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function RootPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if (session.user.role === 'TENANT') redirect('/tenant');
  redirect('/dashboard');
}
```

- [ ] **Step 5: Typecheck + commit**

```bash
npm run typecheck
git add -A
git commit -m "chore(ui): shadcn init + root layout"
```

---

### Task 23: Marketing + login page

**Files:**
- Create: `app/(marketing)/layout.tsx`, `app/(marketing)/page.tsx`, `app/(marketing)/login/page.tsx`
- Create: `components/login-form.tsx`

- [ ] **Step 1: Marketing shell**

```tsx
// app/(marketing)/layout.tsx
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen">{children}</div>;
}
```

```tsx
// app/(marketing)/page.tsx
import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Property Management Ops</h1>
      <p className="text-muted-foreground">Manage properties, units, tenants, and leases.</p>
      <Link
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
        href="/login"
      >
        Sign in
      </Link>
    </main>
  );
}
```

- [ ] **Step 2: Login form (client)**

```tsx
// components/login-form.tsx
'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const from = search.get('from') ?? '/dashboard';
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await signIn('credentials', {
      email: form.get('email'),
      password: form.get('password'),
      redirect: false,
    });
    setPending(false);
    if (res?.error) {
      setError('Invalid email or password');
      return;
    }
    router.push(from);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          name="email"
          type="email"
          required
          className="rounded-md border px-3 py-2"
          autoComplete="email"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Password
        <input
          name="password"
          type="password"
          required
          className="rounded-md border px-3 py-2"
          autoComplete="current-password"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
```

Install the React adapter for NextAuth client helpers:

```bash
npm install next-auth@5.0.0-beta.30
```

(Already installed in Task 1; skip if listed.) Then add the session provider.

```tsx
// app/providers.tsx
'use client';
import { SessionProvider } from 'next-auth/react';
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

Wrap it in the root layout:

```tsx
// app/layout.tsx  (update body)
import { Providers } from './providers';
// ...
<body className="min-h-screen bg-background text-foreground antialiased">
  <Providers>{children}</Providers>
</body>
```

- [ ] **Step 3: Login page**

```tsx
// app/(marketing)/login/page.tsx
import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <LoginForm />
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): marketing landing + login"
```

---

### Task 24: Staff layout + nav + tenant shell + profile

**Files:**
- Create: `app/(staff)/layout.tsx`, `components/nav/staff-nav.tsx`
- Create: `app/(tenant)/layout.tsx`, `app/(tenant)/page.tsx`
- Create: `app/(staff)/profile/page.tsx`, `components/forms/change-password-form.tsx`

- [ ] **Step 1: Staff layout + nav**

```tsx
// app/(staff)/layout.tsx
import { redirect } from 'next/navigation';
import { auth, signOut } from '@/lib/auth';
import { StaffNav } from '@/components/nav/staff-nav';

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');
  if (session.user.role === 'TENANT') redirect('/tenant');

  return (
    <div className="min-h-screen">
      <StaffNav
        email={session.user.email}
        role={session.user.role}
        signOut={async () => {
          'use server';
          await signOut({ redirectTo: '/login' });
        }}
      />
      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}
```

```tsx
// components/nav/staff-nav.tsx
import Link from 'next/link';

type Props = {
  email: string;
  role: string;
  signOut: () => Promise<void>;
};

export function StaffNav({ email, role, signOut }: Props) {
  return (
    <header className="border-b bg-white">
      <nav className="mx-auto flex max-w-6xl items-center gap-6 p-4 text-sm">
        <Link href="/dashboard" className="font-semibold">PMO</Link>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/properties">Properties</Link>
        <Link href="/tenants">Tenants</Link>
        <Link href="/leases">Leases</Link>
        {role === 'ADMIN' && <Link href="/settings/team">Settings</Link>}
        <div className="ml-auto flex items-center gap-4">
          <Link href="/profile" className="text-muted-foreground">{email}</Link>
          <form action={signOut}>
            <button type="submit" className="text-muted-foreground hover:underline">
              Sign out
            </button>
          </form>
        </div>
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: Tenant shell**

```tsx
// app/(tenant)/layout.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== 'TENANT') redirect('/login');
  return <div className="min-h-screen p-8">{children}</div>;
}
```

```tsx
// app/(tenant)/page.tsx
export default function TenantHome() {
  return (
    <main className="mx-auto max-w-md text-center">
      <h1 className="text-2xl font-semibold">Welcome</h1>
      <p className="mt-2 text-muted-foreground">
        The tenant portal is coming soon (Slice 3).
      </p>
    </main>
  );
}
```

- [ ] **Step 3: Profile page + change-password form**

```tsx
// components/forms/change-password-form.tsx
'use client';

import { useState } from 'react';

export function ChangePasswordForm() {
  const [status, setStatus] = useState<null | { ok: boolean; message: string }>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/profile/password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        currentPassword: form.get('currentPassword'),
        newPassword: form.get('newPassword'),
      }),
    });
    const json = await res.json();
    if (res.ok) {
      setStatus({ ok: true, message: 'Password updated' });
      (e.target as HTMLFormElement).reset();
    } else {
      setStatus({ ok: false, message: json.error?.message ?? 'Failed' });
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-sm flex-col gap-3 text-sm">
      <label className="flex flex-col gap-1">
        Current password
        <input name="currentPassword" type="password" required className="rounded-md border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        New password
        <input name="newPassword" type="password" required minLength={8} className="rounded-md border px-3 py-2" />
      </label>
      {status && (
        <p className={status.ok ? 'text-green-600' : 'text-red-600'}>{status.message}</p>
      )}
      <button type="submit" className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
        Change password
      </button>
    </form>
  );
}
```

```tsx
// app/(staff)/profile/page.tsx
import { auth } from '@/lib/auth';
import { ChangePasswordForm } from '@/components/forms/change-password-form';

export default async function ProfilePage() {
  const session = await auth();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My profile</h1>
      <dl className="grid max-w-md grid-cols-[auto,1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Email</dt>
        <dd>{session?.user.email}</dd>
        <dt className="text-muted-foreground">Role</dt>
        <dd>{session?.user.role}</dd>
      </dl>
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Change password</h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): staff layout + nav, tenant shell, profile page"
```

---

## Phase G — Portfolio UI

Shared helpers used by the next several tasks. Create them once here.

### Task 25: Shared UI helpers (badges + formatters)

**Files:**
- Create: `components/lease-status-badge.tsx`, `components/occupancy-badge.tsx`
- Create: `lib/format.ts`

- [ ] **Step 1: Formatters**

```ts
// lib/format.ts
export function formatZar(cents: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}
```

- [ ] **Step 2: Badges**

```tsx
// components/lease-status-badge.tsx
type Status = 'DRAFT' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'TERMINATED' | 'RENEWED';

const STYLES: Record<Status, string> = {
  DRAFT: 'bg-gray-200 text-gray-800',
  ACTIVE: 'bg-green-100 text-green-800',
  EXPIRING: 'bg-yellow-100 text-yellow-800',
  EXPIRED: 'bg-red-100 text-red-800',
  TERMINATED: 'bg-gray-300 text-gray-900',
  RENEWED: 'bg-blue-100 text-blue-800',
};

export function LeaseStatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {status}
    </span>
  );
}
```

```tsx
// components/occupancy-badge.tsx
type Occ = 'VACANT' | 'OCCUPIED' | 'UPCOMING' | 'CONFLICT';

const STYLES: Record<Occ, string> = {
  VACANT: 'bg-gray-200 text-gray-800',
  OCCUPIED: 'bg-green-100 text-green-800',
  UPCOMING: 'bg-blue-100 text-blue-800',
  CONFLICT: 'bg-red-200 text-red-900',
};

export function OccupancyBadge({ state }: { state: Occ }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[state]}`}>
      {state}
    </span>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): shared formatters + lease/occupancy badges"
```

---

### Task 26: Dashboard page

**Files:**
- Create: `app/(staff)/dashboard/page.tsx`

- [ ] **Step 1: Write page**

```tsx
// app/(staff)/dashboard/page.tsx
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { getDashboardSummary } from '@/lib/services/dashboard';

export default async function DashboardPage() {
  const session = await auth();
  const ctx = {
    orgId: session!.user.orgId,
    userId: session!.user.id,
    role: session!.user.role,
  };
  const s = await getDashboardSummary(ctx);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {s.conflictUnits > 0 && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          <strong>{s.conflictUnits}</strong> unit(s) have overlapping active leases. Review
          immediately.
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Properties" value={s.totalProperties} />
        <Stat label="Units" value={s.totalUnits} />
        <Stat label="Occupied" value={s.occupiedUnits} />
        <Stat label="Vacant" value={s.vacantUnits} />
        <Stat label="Upcoming" value={s.upcomingUnits} />
        <Stat label="Active leases" value={s.activeLeases} />
        <Stat label="Expiring soon" value={s.expiringSoonLeases} />
        <Stat label="Expired (not terminated)" value={s.expiredLeases} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Expiring soon</h2>
        {s.expiringSoonList.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing in the window.</p>
        ) : (
          <ul className="divide-y rounded-md border bg-white text-sm">
            {s.expiringSoonList.map((l) => (
              <li key={l.id} className="flex items-center gap-4 p-3">
                <Link href={`/leases/${l.id}`} className="font-medium hover:underline">
                  {l.propertyName} · {l.unitLabel}
                </Link>
                <span className="text-muted-foreground">{l.primaryTenantName ?? '—'}</span>
                <span className="ml-auto">
                  Ends {l.endDate} ({l.daysUntilExpiry}d)
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Recent leases</h2>
        <ul className="divide-y rounded-md border bg-white text-sm">
          {s.recentLeases.map((l) => (
            <li key={l.id} className="flex items-center gap-4 p-3">
              <Link href={`/leases/${l.id}`} className="font-medium hover:underline">
                {l.propertyName} · {l.unitLabel}
              </Link>
              <span className="text-muted-foreground">{l.primaryTenantName ?? '—'}</span>
              <span className="ml-auto text-muted-foreground">
                {l.startDate} → {l.endDate}
              </span>
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs">{l.state}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-white p-4">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(staff)/dashboard
git commit -m "feat(ui): dashboard page"
```

---

### Task 27: Properties list + create + detail + edit + delete

**Files:**
- Create: `app/(staff)/properties/page.tsx`, `app/(staff)/properties/new/page.tsx`
- Create: `app/(staff)/properties/[id]/page.tsx`, `app/(staff)/properties/[id]/edit/page.tsx`
- Create: `components/forms/property-form.tsx`

- [ ] **Step 1: Property form**

```tsx
// components/forms/property-form.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Initial = Partial<{
  id: string;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  notes: string | null;
}>;

const PROVINCES = ['GP', 'WC', 'KZN', 'EC', 'FS', 'LP', 'MP', 'NW', 'NC'] as const;

export function PropertyForm({ mode, initial }: { mode: 'create' | 'edit'; initial?: Initial }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    if (mode === 'create') {
      (payload as Record<string, unknown>).autoCreateMainUnit = form.get('autoCreateMainUnit') === 'on';
    }
    const url = mode === 'create' ? '/api/properties' : `/api/properties/${initial!.id}`;
    const res = await fetch(url, {
      method: mode === 'create' ? 'POST' : 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? 'Failed');
      return;
    }
    router.push(mode === 'create' ? `/properties/${json.data.id}` : `/properties/${initial!.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-xl grid-cols-2 gap-4 text-sm">
      <Field name="name" label="Name" required defaultValue={initial?.name} className="col-span-2" />
      <Field name="addressLine1" label="Address line 1" required defaultValue={initial?.addressLine1} className="col-span-2" />
      <Field name="addressLine2" label="Address line 2" defaultValue={initial?.addressLine2 ?? ''} className="col-span-2" />
      <Field name="suburb" label="Suburb" required defaultValue={initial?.suburb} />
      <Field name="city" label="City" required defaultValue={initial?.city} />
      <label className="flex flex-col gap-1">
        Province
        <select name="province" required defaultValue={initial?.province ?? 'GP'} className="rounded-md border px-3 py-2">
          {PROVINCES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </label>
      <Field name="postalCode" label="Postal code" required defaultValue={initial?.postalCode} />
      <label className="col-span-2 flex flex-col gap-1">
        Notes
        <textarea name="notes" defaultValue={initial?.notes ?? ''} rows={3} className="rounded-md border px-3 py-2" />
      </label>
      {mode === 'create' && (
        <label className="col-span-2 flex items-center gap-2">
          <input type="checkbox" name="autoCreateMainUnit" defaultChecked />
          Auto-create a single "Main" unit (for standalone houses)
        </label>
      )}
      {error && <p className="col-span-2 text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="col-span-2 rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
      >
        {pending ? 'Saving…' : mode === 'create' ? 'Create property' : 'Save changes'}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  required,
  defaultValue,
  className,
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string | null;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ''}`}>
      {label}
      <input
        name={name}
        required={required}
        defaultValue={defaultValue ?? ''}
        className="rounded-md border px-3 py-2"
      />
    </label>
  );
}
```

- [ ] **Step 2: List + new pages**

```tsx
// app/(staff)/properties/page.tsx
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { listProperties } from '@/lib/services/properties';

export default async function PropertiesPage() {
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  const rows = await listProperties(ctx);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Properties</h1>
        <Link href="/properties/new" className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">
          New property
        </Link>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead className="border-b text-left">
          <tr>
            <th className="p-2">Name</th>
            <th className="p-2">City</th>
            <th className="p-2">Units</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-b hover:bg-gray-50">
              <td className="p-2">
                <Link href={`/properties/${p.id}`} className="font-medium hover:underline">
                  {p.name}
                </Link>
              </td>
              <td className="p-2">{p.city}</td>
              <td className="p-2">{p._count.units}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

```tsx
// app/(staff)/properties/new/page.tsx
import { PropertyForm } from '@/components/forms/property-form';

export default function NewPropertyPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New property</h1>
      <PropertyForm mode="create" />
    </div>
  );
}
```

- [ ] **Step 3: Detail + edit + delete**

```tsx
// app/(staff)/properties/[id]/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getProperty } from '@/lib/services/properties';
import { DeletePropertyButton } from './delete-button';

export default async function PropertyDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  let property;
  try {
    property = await getProperty(ctx, id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{property.name}</h1>
          <p className="text-sm text-muted-foreground">
            {property.addressLine1}
            {property.addressLine2 ? `, ${property.addressLine2}` : ''} · {property.suburb},{' '}
            {property.city}, {property.province} {property.postalCode}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/properties/${id}/edit`} className="rounded-md border px-3 py-1.5 text-sm">
            Edit
          </Link>
          {session!.user.role === 'ADMIN' && <DeletePropertyButton id={id} />}
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Units</h2>
          <Link
            href={`/properties/${id}/units/new`}
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
          >
            Add unit
          </Link>
        </div>
        <table className="w-full border-collapse text-sm">
          <thead className="border-b text-left">
            <tr>
              <th className="p-2">Label</th>
              <th className="p-2">Beds</th>
              <th className="p-2">Baths</th>
            </tr>
          </thead>
          <tbody>
            {property.units.map((u) => (
              <tr key={u.id} className="border-b hover:bg-gray-50">
                <td className="p-2">
                  <Link href={`/units/${u.id}`} className="font-medium hover:underline">
                    {u.label}
                  </Link>
                </td>
                <td className="p-2">{u.bedrooms}</td>
                <td className="p-2">{u.bathrooms}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
```

```tsx
// app/(staff)/properties/[id]/delete-button.tsx
'use client';
import { useRouter } from 'next/navigation';

export function DeletePropertyButton({ id }: { id: string }) {
  const router = useRouter();
  async function onClick() {
    if (!confirm('Delete this property? Blocked if it has active or draft leases.')) return;
    const res = await fetch(`/api/properties/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error?.message ?? 'Failed');
      return;
    }
    router.push('/properties');
    router.refresh();
  }
  return (
    <button onClick={onClick} className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700">
      Delete
    </button>
  );
}
```

```tsx
// app/(staff)/properties/[id]/edit/page.tsx
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getProperty } from '@/lib/services/properties';
import { PropertyForm } from '@/components/forms/property-form';

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  let p;
  try {
    p = await getProperty(ctx, id);
  } catch {
    notFound();
  }
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit property</h1>
      <PropertyForm mode="edit" initial={p} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/(staff)/properties components/forms/property-form.tsx
git commit -m "feat(ui): properties list/create/detail/edit/delete"
```

---

### Task 28: Units create + detail

**Files:**
- Create: `app/(staff)/properties/[id]/units/new/page.tsx`
- Create: `app/(staff)/units/[id]/page.tsx`
- Create: `components/forms/unit-form.tsx`

- [ ] **Step 1: Unit form**

```tsx
// components/forms/unit-form.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function UnitForm({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/units', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        propertyId,
        label: form.get('label'),
        bedrooms: Number(form.get('bedrooms') ?? 0),
        bathrooms: Number(form.get('bathrooms') ?? 0),
        sizeSqm: form.get('sizeSqm') ? Number(form.get('sizeSqm')) : null,
        notes: form.get('notes') || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error?.message ?? 'Failed');
      return;
    }
    router.push(`/units/${json.data.id}`);
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="grid max-w-xl grid-cols-2 gap-4 text-sm">
      <label className="col-span-2 flex flex-col gap-1">
        Label
        <input name="label" required className="rounded-md border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        Bedrooms
        <input name="bedrooms" type="number" min={0} defaultValue={0} className="rounded-md border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        Bathrooms
        <input name="bathrooms" type="number" min={0} defaultValue={0} className="rounded-md border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        Size (sqm)
        <input name="sizeSqm" type="number" min={1} className="rounded-md border px-3 py-2" />
      </label>
      <label className="col-span-2 flex flex-col gap-1">
        Notes
        <textarea name="notes" rows={3} className="rounded-md border px-3 py-2" />
      </label>
      {error && <p className="col-span-2 text-red-600">{error}</p>}
      <button className="col-span-2 rounded-md bg-primary px-4 py-2 text-primary-foreground">
        Create unit
      </button>
    </form>
  );
}
```

- [ ] **Step 2: New unit page**

```tsx
// app/(staff)/properties/[id]/units/new/page.tsx
import { UnitForm } from '@/components/forms/unit-form';

export default async function NewUnitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New unit</h1>
      <UnitForm propertyId={id} />
    </div>
  );
}
```

- [ ] **Step 3: Unit detail**

```tsx
// app/(staff)/units/[id]/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getUnit } from '@/lib/services/units';
import { OccupancyBadge } from '@/components/occupancy-badge';
import { LeaseStatusBadge } from '@/components/lease-status-badge';
import { deriveStatus } from '@/lib/services/leases';
import { formatDate, formatZar } from '@/lib/format';

export default async function UnitDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  let unit;
  try {
    unit = await getUnit(ctx, id);
  } catch {
    notFound();
  }

  const leasesWithStatus = unit.leases.map((l) => ({
    ...l,
    status: deriveStatus(l, 60),
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/properties/${unit.property.id}`} className="text-sm text-muted-foreground hover:underline">
          ← {unit.property.name}
        </Link>
        <h1 className="text-2xl font-semibold">{unit.label}</h1>
        <div className="mt-1 flex items-center gap-3 text-sm">
          <OccupancyBadge state={unit.occupancy.state} />
          {unit.bedrooms > 0 && <span>{unit.bedrooms} bed</span>}
          {unit.bathrooms > 0 && <span>{unit.bathrooms} bath</span>}
          {unit.sizeSqm && <span>{unit.sizeSqm} sqm</span>}
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Leases</h2>
        {leasesWithStatus.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leases yet.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="border-b text-left">
              <tr>
                <th className="p-2">Period</th>
                <th className="p-2">Tenants</th>
                <th className="p-2">Rent</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {leasesWithStatus.map((l) => {
                const primary = l.tenants.find((t) => t.isPrimary)?.tenant;
                const others = l.tenants.filter((t) => !t.isPrimary).map((t) => t.tenant);
                return (
                  <tr key={l.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <Link href={`/leases/${l.id}`} className="font-medium hover:underline">
                        {formatDate(l.startDate)} → {formatDate(l.endDate)}
                      </Link>
                    </td>
                    <td className="p-2">
                      {primary && (
                        <span>
                          {primary.firstName} {primary.lastName}
                          <span className="ml-1 text-xs text-muted-foreground">(primary)</span>
                        </span>
                      )}
                      {others.length > 0 && (
                        <span className="ml-2 text-muted-foreground">
                          + {others.map((t) => `${t.firstName} ${t.lastName}`).join(', ')}
                        </span>
                      )}
                    </td>
                    <td className="p-2">{formatZar(l.rentAmountCents)}</td>
                    <td className="p-2">
                      <LeaseStatusBadge status={l.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/(staff)/properties app/(staff)/units components/forms/unit-form.tsx
git commit -m "feat(ui): unit create + detail with occupancy surface"
```

---

## Phase H — Tenants & leases UI

### Task 29: Tenants list + create + detail

**Files:**
- Create: `app/(staff)/tenants/page.tsx`, `app/(staff)/tenants/new/page.tsx`, `app/(staff)/tenants/[id]/page.tsx`
- Create: `components/forms/tenant-form.tsx`

- [ ] **Step 1: Tenant form**

```tsx
// components/forms/tenant-form.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Dup = { id: string; firstName: string; lastName: string; email: string | null; idNumber: string | null; phone: string | null };

export function TenantForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [dupWarn, setDupWarn] = useState<Dup[]>([]);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      firstName: form.get('firstName'),
      lastName: form.get('lastName'),
      email: form.get('email') || null,
      phone: form.get('phone') || null,
      idNumber: form.get('idNumber') || null,
      notes: form.get('notes') || null,
    };
    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? 'Failed');
      return;
    }
    if (json.warnings?.duplicates?.length > 0) {
      setDupWarn(json.warnings.duplicates);
    }
    router.push(`/tenants/${json.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-xl grid-cols-2 gap-4 text-sm">
      <label className="flex flex-col gap-1">
        First name
        <input name="firstName" required className="rounded-md border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        Last name
        <input name="lastName" required className="rounded-md border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        Email (optional)
        <input name="email" type="email" className="rounded-md border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        Phone (optional)
        <input name="phone" className="rounded-md border px-3 py-2" />
      </label>
      <label className="col-span-2 flex flex-col gap-1">
        ID / passport (optional)
        <input name="idNumber" className="rounded-md border px-3 py-2" />
      </label>
      <label className="col-span-2 flex flex-col gap-1">
        Notes
        <textarea name="notes" rows={3} className="rounded-md border px-3 py-2" />
      </label>
      {dupWarn.length > 0 && (
        <div className="col-span-2 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-xs">
          Possible duplicate(s):
          <ul className="mt-1 list-disc pl-5">
            {dupWarn.map((d) => (
              <li key={d.id}>{d.firstName} {d.lastName} — {d.email ?? d.phone ?? d.idNumber}</li>
            ))}
          </ul>
        </div>
      )}
      {error && <p className="col-span-2 text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="col-span-2 rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Create tenant'}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: List + new pages**

```tsx
// app/(staff)/tenants/page.tsx
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { listTenants } from '@/lib/services/tenants';

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const { archived } = await searchParams;
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  const rows = await listTenants(ctx, { includeArchived: archived === 'true' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tenants</h1>
        <div className="flex gap-2">
          <Link
            href={`/tenants?archived=${archived === 'true' ? 'false' : 'true'}`}
            className="rounded-md border px-3 py-1.5 text-sm"
          >
            {archived === 'true' ? 'Hide archived' : 'Show archived'}
          </Link>
          <Link href="/tenants/new" className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">
            New tenant
          </Link>
        </div>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead className="border-b text-left">
          <tr>
            <th className="p-2">Name</th>
            <th className="p-2">Email</th>
            <th className="p-2">Phone</th>
            <th className="p-2">Leases</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} className="border-b hover:bg-gray-50">
              <td className="p-2">
                <Link href={`/tenants/${t.id}`} className="font-medium hover:underline">
                  {t.firstName} {t.lastName}
                </Link>
              </td>
              <td className="p-2">{t.email ?? '—'}</td>
              <td className="p-2">{t.phone ?? '—'}</td>
              <td className="p-2">{t._count.leases}</td>
              <td className="p-2">
                {t.archivedAt ? <span className="text-muted-foreground">archived</span> : 'active'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

```tsx
// app/(staff)/tenants/new/page.tsx
import { TenantForm } from '@/components/forms/tenant-form';

export default function NewTenantPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New tenant</h1>
      <TenantForm />
    </div>
  );
}
```

- [ ] **Step 3: Tenant detail (with lease role annotations)**

```tsx
// app/(staff)/tenants/[id]/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getTenant } from '@/lib/services/tenants';
import { deriveStatus } from '@/lib/services/leases';
import { LeaseStatusBadge } from '@/components/lease-status-badge';
import { formatDate } from '@/lib/format';
import { ArchiveTenantButton } from './archive-button';

export default async function TenantDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  let tenant;
  try {
    tenant = await getTenant(ctx, id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {tenant.firstName} {tenant.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tenant.email ?? 'no email'} · {tenant.phone ?? 'no phone'}
            {tenant.idNumber ? ` · ID ${tenant.idNumber}` : ''}
          </p>
          {tenant.archivedAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              Archived {formatDate(tenant.archivedAt)}
            </p>
          )}
        </div>
        <ArchiveTenantButton id={id} archived={!!tenant.archivedAt} />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Leases</h2>
        {tenant.leases.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not on any leases yet.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="border-b text-left">
              <tr>
                <th className="p-2">Property · Unit</th>
                <th className="p-2">Period</th>
                <th className="p-2">Role</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {tenant.leases.map((lt) => {
                const status = deriveStatus(lt.lease, 60);
                return (
                  <tr key={lt.leaseId} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <Link href={`/leases/${lt.leaseId}`} className="font-medium hover:underline">
                        {lt.lease.unit.property.name} · {lt.lease.unit.label}
                      </Link>
                    </td>
                    <td className="p-2">
                      {formatDate(lt.lease.startDate)} → {formatDate(lt.lease.endDate)}
                    </td>
                    <td className="p-2">{lt.isPrimary ? 'primary' : 'co-tenant'}</td>
                    <td className="p-2"><LeaseStatusBadge status={status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
```

```tsx
// app/(staff)/tenants/[id]/archive-button.tsx
'use client';
import { useRouter } from 'next/navigation';

export function ArchiveTenantButton({ id, archived }: { id: string; archived: boolean }) {
  const router = useRouter();
  async function onClick() {
    const method = archived ? 'DELETE' : 'POST';
    const res = await fetch(`/api/tenants/${id}/archive`, { method });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error?.message ?? 'Failed');
      return;
    }
    router.refresh();
  }
  return (
    <button onClick={onClick} className="rounded-md border px-3 py-1.5 text-sm">
      {archived ? 'Unarchive' : 'Archive'}
    </button>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/(staff)/tenants components/forms/tenant-form.tsx
git commit -m "feat(ui): tenants list/create/detail + archive"
```

---

### Task 30: Lease list + create form

**Files:**
- Create: `app/(staff)/leases/page.tsx`, `app/(staff)/leases/new/page.tsx`
- Create: `components/forms/lease-form.tsx`

- [ ] **Step 1: Lease form**

```tsx
// components/forms/lease-form.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type UnitOption = { id: string; label: string; propertyName: string };
type TenantOption = { id: string; firstName: string; lastName: string };

type Props = {
  mode: 'create' | 'renew';
  units: UnitOption[];
  tenants: TenantOption[];
  initial?: {
    unitId: string;
    tenantIds: string[];
    primaryTenantId: string;
    startDate: string;
    endDate: string;
    rentAmountCents: number;
    depositAmountCents: number;
    heldInTrustAccount: boolean;
    paymentDueDay: number;
    notes?: string | null;
  };
  postUrl: string;
};

export function LeaseForm({ mode, units, tenants, initial, postUrl }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initial?.tenantIds ?? []);
  const [primary, setPrimary] = useState<string>(initial?.primaryTenantId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (!next.includes(primary)) setPrimary(next[0] ?? '');
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      unitId: form.get('unitId'),
      tenantIds: selected,
      primaryTenantId: primary,
      startDate: form.get('startDate'),
      endDate: form.get('endDate'),
      rentAmountCents: Math.round(Number(form.get('rentAmount')) * 100),
      depositAmountCents: Math.round(Number(form.get('depositAmount')) * 100),
      heldInTrustAccount: form.get('heldInTrustAccount') === 'on',
      paymentDueDay: Number(form.get('paymentDueDay')),
      notes: form.get('notes') || null,
    };
    const res = await fetch(postUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? 'Failed');
      return;
    }
    router.push(`/leases/${json.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-2xl grid-cols-2 gap-4 text-sm">
      <label className="col-span-2 flex flex-col gap-1">
        Unit
        <select
          name="unitId"
          required
          defaultValue={initial?.unitId ?? ''}
          disabled={mode === 'renew'}
          className="rounded-md border px-3 py-2"
        >
          <option value="" disabled>— select —</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.propertyName} · {u.label}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="col-span-2 rounded-md border p-3">
        <legend className="px-1 text-xs uppercase text-muted-foreground">Tenants</legend>
        <div className="space-y-1">
          {tenants.map((t) => (
            <label key={t.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.includes(t.id)}
                onChange={() => toggle(t.id)}
              />
              <span>{t.firstName} {t.lastName}</span>
              {selected.includes(t.id) && selected.length > 1 && (
                <label className="ml-auto flex items-center gap-1 text-xs">
                  <input
                    type="radio"
                    name="primary"
                    checked={primary === t.id}
                    onChange={() => setPrimary(t.id)}
                  />
                  primary
                </label>
              )}
            </label>
          ))}
        </div>
        {selected.length === 1 && <p className="mt-2 text-xs text-muted-foreground">Single tenant is primary.</p>}
      </fieldset>

      <label className="flex flex-col gap-1">
        Start date
        <input type="date" name="startDate" required defaultValue={initial?.startDate} className="rounded-md border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        End date
        <input type="date" name="endDate" required defaultValue={initial?.endDate} className="rounded-md border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        Monthly rent (ZAR)
        <input
          name="rentAmount"
          type="number"
          min={0}
          step="0.01"
          required
          defaultValue={initial ? initial.rentAmountCents / 100 : undefined}
          className="rounded-md border px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        Deposit (ZAR)
        <input
          name="depositAmount"
          type="number"
          min={0}
          step="0.01"
          required
          defaultValue={initial ? initial.depositAmountCents / 100 : undefined}
          className="rounded-md border px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        Payment due day (1–31)
        <input
          name="paymentDueDay"
          type="number"
          min={1}
          max={31}
          required
          defaultValue={initial?.paymentDueDay ?? 1}
          className="rounded-md border px-3 py-2"
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="heldInTrustAccount"
          defaultChecked={initial?.heldInTrustAccount ?? false}
        />
        Deposit held in trust account
      </label>
      <label className="col-span-2 flex flex-col gap-1">
        Notes
        <textarea name="notes" rows={3} defaultValue={initial?.notes ?? ''} className="rounded-md border px-3 py-2" />
      </label>
      {selected.length === 0 && <p className="col-span-2 text-xs text-red-600">Select at least one tenant.</p>}
      {error && <p className="col-span-2 text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending || selected.length === 0}
        className="col-span-2 rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
      >
        {pending ? 'Saving…' : mode === 'renew' ? 'Create renewal (DRAFT)' : 'Create lease (DRAFT)'}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Lease list**

```tsx
// app/(staff)/leases/page.tsx
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { listLeases } from '@/lib/services/leases';
import { LeaseStatusBadge } from '@/components/lease-status-badge';
import { formatDate, formatZar } from '@/lib/format';

const STATUSES = ['ALL','DRAFT','ACTIVE','EXPIRING','EXPIRED','TERMINATED','RENEWED'] as const;

export default async function LeasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  const rows = await listLeases(ctx, {
    status: status && status !== 'ALL' ? (status as 'DRAFT') : undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Leases</h1>
        <Link href="/leases/new" className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">
          New lease
        </Link>
      </div>
      <div className="flex gap-2 text-sm">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={s === 'ALL' ? '/leases' : `/leases?status=${s}`}
            className={`rounded-full border px-3 py-1 ${
              (status ?? 'ALL') === s ? 'bg-gray-900 text-white' : ''
            }`}
          >
            {s}
          </Link>
        ))}
      </div>
      <table className="w-full border-collapse text-sm">
        <thead className="border-b text-left">
          <tr>
            <th className="p-2">Property · Unit</th>
            <th className="p-2">Tenants</th>
            <th className="p-2">Period</th>
            <th className="p-2">Rent</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => {
            const primary = l.tenants.find((t) => t.isPrimary)?.tenant;
            return (
              <tr key={l.id} className="border-b hover:bg-gray-50">
                <td className="p-2">
                  <Link href={`/leases/${l.id}`} className="font-medium hover:underline">
                    {l.unit.property.name} · {l.unit.label}
                  </Link>
                </td>
                <td className="p-2">
                  {primary ? `${primary.firstName} ${primary.lastName}` : '—'}
                  {l.tenants.length > 1 && (
                    <span className="ml-1 text-xs text-muted-foreground">+{l.tenants.length - 1}</span>
                  )}
                </td>
                <td className="p-2">{formatDate(l.startDate)} → {formatDate(l.endDate)}</td>
                <td className="p-2">{formatZar(l.rentAmountCents)}</td>
                <td className="p-2"><LeaseStatusBadge status={l.status} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: New lease page**

```tsx
// app/(staff)/leases/new/page.tsx
import { auth } from '@/lib/auth';
import { listUnits } from '@/lib/services/units';
import { listTenants } from '@/lib/services/tenants';
import { LeaseForm } from '@/components/forms/lease-form';

export default async function NewLeasePage() {
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  const [units, tenants] = await Promise.all([listUnits(ctx, {}), listTenants(ctx)]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New lease</h1>
      <LeaseForm
        mode="create"
        units={units.map((u) => ({ id: u.id, label: u.label, propertyName: u.property.name }))}
        tenants={tenants.map((t) => ({ id: t.id, firstName: t.firstName, lastName: t.lastName }))}
        postUrl="/api/leases"
      />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/(staff)/leases components/forms/lease-form.tsx
git commit -m "feat(ui): lease list + create"
```

---

### Task 31: Lease detail + actions + renew form

**Files:**
- Create: `app/(staff)/leases/[id]/page.tsx`
- Create: `app/(staff)/leases/[id]/actions.tsx` (client action bar)
- Create: `app/(staff)/leases/[id]/renew/page.tsx`

- [ ] **Step 1: Action bar (client)**

```tsx
// app/(staff)/leases/[id]/actions.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LeaseActions({
  id,
  state,
}: {
  id: string;
  state: 'DRAFT' | 'ACTIVE' | 'TERMINATED' | 'RENEWED';
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function activate() {
    if (!confirm('Activate this draft lease? Will check for overlaps.')) return;
    setBusy(true);
    const res = await fetch(`/api/leases/${id}/activate`, { method: 'POST' });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return alert(json.error?.message ?? 'Failed');
    router.refresh();
  }

  async function terminate() {
    const reason = prompt('Termination reason');
    if (!reason) return;
    const today = new Date().toISOString().slice(0, 10);
    setBusy(true);
    const res = await fetch(`/api/leases/${id}/terminate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ terminatedAt: today, terminatedReason: reason }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return alert(json.error?.message ?? 'Failed');
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {state === 'DRAFT' && (
        <button
          onClick={activate}
          disabled={busy}
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
        >
          Activate
        </button>
      )}
      {state === 'ACTIVE' && (
        <>
          <button
            onClick={() => router.push(`/leases/${id}/renew`)}
            className="rounded-md border px-3 py-1.5 text-sm"
          >
            Renew
          </button>
          <button
            onClick={terminate}
            disabled={busy}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 disabled:opacity-50"
          >
            Terminate
          </button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Lease detail page with document upload inline**

```tsx
// app/(staff)/leases/[id]/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getLease } from '@/lib/services/leases';
import { LeaseStatusBadge } from '@/components/lease-status-badge';
import { formatDate, formatZar } from '@/lib/format';
import { LeaseActions } from './actions';
import { DocumentUpload } from './document-upload';

export default async function LeaseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  let lease;
  try {
    lease = await getLease(ctx, id);
  } catch {
    notFound();
  }

  const primary = lease.tenants.find((t) => t.isPrimary)?.tenant;
  const coTenants = lease.tenants.filter((t) => !t.isPrimary).map((t) => t.tenant);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Link href={`/units/${lease.unit.id}`} className="text-sm text-muted-foreground hover:underline">
            ← {lease.unit.property.name} · {lease.unit.label}
          </Link>
          <h1 className="text-2xl font-semibold">
            Lease {formatDate(lease.startDate)} → {formatDate(lease.endDate)}
          </h1>
          <LeaseStatusBadge status={lease.status} />
        </div>
        <LeaseActions id={lease.id} state={lease.state} />
      </div>

      <section className="grid grid-cols-2 gap-4 text-sm">
        <Detail label="Rent" value={formatZar(lease.rentAmountCents)} />
        <Detail label="Deposit" value={`${formatZar(lease.depositAmountCents)}${lease.heldInTrustAccount ? ' (trust)' : ''}`} />
        <Detail label="Due day" value={`${lease.paymentDueDay}`} />
        {lease.terminatedAt && <Detail label="Terminated" value={`${formatDate(lease.terminatedAt)} — ${lease.terminatedReason ?? ''}`} />}
        {lease.renewedFrom && (
          <Detail
            label="Renewed from"
            value={<Link href={`/leases/${lease.renewedFrom.id}`} className="hover:underline">{formatDate(lease.renewedFrom.startDate)} → {formatDate(lease.renewedFrom.endDate)}</Link>}
          />
        )}
        {lease.renewedTo && (
          <Detail
            label="Renewed to"
            value={<Link href={`/leases/${lease.renewedTo.id}`} className="hover:underline">{formatDate(lease.renewedTo.startDate)} → {formatDate(lease.renewedTo.endDate)}</Link>}
          />
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Tenants</h2>
        <ul className="space-y-1 text-sm">
          {primary && (
            <li>
              <Link href={`/tenants/${primary.id}`} className="font-medium hover:underline">
                {primary.firstName} {primary.lastName}
              </Link>
              <span className="ml-2 text-xs text-muted-foreground">(primary)</span>
            </li>
          )}
          {coTenants.map((t) => (
            <li key={t.id}>
              <Link href={`/tenants/${t.id}`} className="hover:underline">
                {t.firstName} {t.lastName}
              </Link>
              <span className="ml-2 text-xs text-muted-foreground">(co-tenant)</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Lease agreement</h2>
        {lease.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No agreement uploaded.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {lease.documents.map((d) => (
              <li key={d.id}>
                <a href={`/api/documents/${d.id}/download`} className="hover:underline">
                  {d.filename}
                </a>
                <span className="ml-2 text-xs text-muted-foreground">
                  ({(d.sizeBytes / 1024).toFixed(0)} KB)
                </span>
              </li>
            ))}
          </ul>
        )}
        <DocumentUpload leaseId={lease.id} />
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}
```

```tsx
// app/(staff)/leases/[id]/document-upload.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DocumentUpload({ leaseId }: { leaseId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setPending(true);
    setError(null);
    const res = await fetch(`/api/leases/${leaseId}/documents`, {
      method: 'POST',
      body: fd,
    });
    const json = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? 'Failed');
      return;
    }
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-3 text-sm">
      <input name="file" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" required />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground disabled:opacity-50"
      >
        {pending ? 'Uploading…' : 'Upload'}
      </button>
      {error && <span className="text-red-600">{error}</span>}
    </form>
  );
}
```

- [ ] **Step 3: Renew page**

```tsx
// app/(staff)/leases/[id]/renew/page.tsx
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getLease } from '@/lib/services/leases';
import { listTenants } from '@/lib/services/tenants';
import { LeaseForm } from '@/components/forms/lease-form';
import { formatDate } from '@/lib/format';

export default async function RenewLeasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  let lease;
  try {
    lease = await getLease(ctx, id);
  } catch {
    notFound();
  }
  const tenants = await listTenants(ctx);

  const defaultStart = new Date(lease.endDate);
  defaultStart.setUTCDate(defaultStart.getUTCDate() + 1);
  const defaultEnd = new Date(defaultStart);
  defaultEnd.setUTCFullYear(defaultEnd.getUTCFullYear() + 1);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Renew lease</h1>
      <p className="text-sm text-muted-foreground">
        Renewing {formatDate(lease.startDate)} → {formatDate(lease.endDate)} on {lease.unit.property.name} · {lease.unit.label}.
      </p>
      <LeaseForm
        mode="renew"
        units={[{ id: lease.unit.id, label: lease.unit.label, propertyName: lease.unit.property.name }]}
        tenants={tenants.map((t) => ({ id: t.id, firstName: t.firstName, lastName: t.lastName }))}
        initial={{
          unitId: lease.unit.id,
          tenantIds: lease.tenants.map((t) => t.tenantId),
          primaryTenantId: lease.tenants.find((t) => t.isPrimary)?.tenantId ?? lease.tenants[0].tenantId,
          startDate: formatDate(defaultStart),
          endDate: formatDate(defaultEnd),
          rentAmountCents: lease.rentAmountCents,
          depositAmountCents: lease.depositAmountCents,
          heldInTrustAccount: lease.heldInTrustAccount,
          paymentDueDay: lease.paymentDueDay,
          notes: lease.notes,
        }}
        postUrl={`/api/leases/${id}/renew`}
      />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/(staff)/leases
git commit -m "feat(ui): lease detail, actions, renew, document upload"
```

---

## Phase I — Settings + seed

### Task 32: Settings pages (team + org)

**Files:**
- Create: `app/(staff)/settings/team/page.tsx`, `app/(staff)/settings/team/new-user-form.tsx`, `app/(staff)/settings/team/team-row.tsx`
- Create: `app/(staff)/settings/org/page.tsx`, `app/(staff)/settings/org/org-form.tsx`

- [ ] **Step 1: New user + row components**

```tsx
// app/(staff)/settings/team/new-user-form.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function NewUserForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/settings/team', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: form.get('email'),
        name: form.get('name'),
        role: form.get('role'),
        password: form.get('password'),
      }),
    });
    const json = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? 'Failed');
      return;
    }
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-2xl grid-cols-2 gap-3 text-sm">
      <input name="email" type="email" placeholder="Email" required className="rounded-md border px-3 py-2" />
      <input name="name" placeholder="Name" required className="rounded-md border px-3 py-2" />
      <select name="role" required defaultValue="PROPERTY_MANAGER" className="rounded-md border px-3 py-2">
        <option value="ADMIN">ADMIN</option>
        <option value="PROPERTY_MANAGER">PROPERTY_MANAGER</option>
        <option value="FINANCE">FINANCE</option>
        <option value="TENANT">TENANT</option>
      </select>
      <input name="password" type="password" placeholder="Temporary password" minLength={8} required className="rounded-md border px-3 py-2" />
      {error && <p className="col-span-2 text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="col-span-2 rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
      >
        {pending ? 'Creating…' : 'Create user'}
      </button>
    </form>
  );
}
```

```tsx
// app/(staff)/settings/team/team-row.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Row = {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'PROPERTY_MANAGER' | 'FINANCE' | 'TENANT';
  disabledAt: Date | null;
};

export function TeamRow({ row }: { row: Row }) {
  const router = useRouter();
  const [role, setRole] = useState(row.role);
  const [busy, setBusy] = useState(false);

  async function save(changes: Partial<{ role: string; disabled: boolean }>) {
    setBusy(true);
    const res = await fetch(`/api/settings/team/${row.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(changes),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return alert(json.error?.message ?? 'Failed');
    router.refresh();
  }

  return (
    <tr className="border-b">
      <td className="p-2">{row.email}</td>
      <td className="p-2">{row.name ?? '—'}</td>
      <td className="p-2">
        <select
          value={role}
          disabled={busy}
          onChange={(e) => {
            setRole(e.target.value as Row['role']);
            save({ role: e.target.value });
          }}
          className="rounded-md border px-2 py-1"
        >
          <option value="ADMIN">ADMIN</option>
          <option value="PROPERTY_MANAGER">PROPERTY_MANAGER</option>
          <option value="FINANCE">FINANCE</option>
          <option value="TENANT">TENANT</option>
        </select>
      </td>
      <td className="p-2">
        <button
          onClick={() => save({ disabled: !row.disabledAt })}
          disabled={busy}
          className="rounded-md border px-2 py-1 text-xs"
        >
          {row.disabledAt ? 'Enable' : 'Disable'}
        </button>
      </td>
    </tr>
  );
}
```

- [ ] **Step 2: Team page**

```tsx
// app/(staff)/settings/team/page.tsx
import { auth } from '@/lib/auth';
import { listTeam } from '@/lib/services/team';
import { NewUserForm } from './new-user-form';
import { TeamRow } from './team-row';

export default async function TeamSettingsPage() {
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  const users = await listTeam(ctx);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Team</h1>
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Create staff account</h2>
        <p className="text-xs text-muted-foreground">
          No email invitation flow in Slice 1. Enter a temporary password; the user can change it after first login.
        </p>
        <NewUserForm />
      </section>
      <section>
        <table className="w-full border-collapse text-sm">
          <thead className="border-b text-left">
            <tr>
              <th className="p-2">Email</th>
              <th className="p-2">Name</th>
              <th className="p-2">Role</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <TeamRow key={u.id} row={u} />
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Org page**

```tsx
// app/(staff)/settings/org/org-form.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function OrgForm({ initial }: { initial: { name: string; expiringWindowDays: number } }) {
  const router = useRouter();
  const [status, setStatus] = useState<null | string>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/settings/org', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: form.get('name'),
        expiringWindowDays: Number(form.get('expiringWindowDays')),
      }),
    });
    const json = await res.json();
    if (!res.ok) return setStatus(json.error?.message ?? 'Failed');
    setStatus('Saved');
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="grid max-w-md grid-cols-1 gap-3 text-sm">
      <label className="flex flex-col gap-1">
        Org name
        <input name="name" defaultValue={initial.name} required className="rounded-md border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        Expiring window (days)
        <input
          name="expiringWindowDays"
          type="number"
          min={1}
          max={365}
          defaultValue={initial.expiringWindowDays}
          required
          className="rounded-md border px-3 py-2"
        />
      </label>
      {status && <p className="text-green-700">{status}</p>}
      <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground">Save</button>
    </form>
  );
}
```

```tsx
// app/(staff)/settings/org/page.tsx
import { auth } from '@/lib/auth';
import { getOrg } from '@/lib/services/team';
import { OrgForm } from './org-form';

export default async function OrgSettingsPage() {
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  const org = await getOrg(ctx);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Organization</h1>
      <OrgForm initial={{ name: org.name, expiringWindowDays: org.expiringWindowDays }} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/(staff)/settings
git commit -m "feat(ui): settings team + org pages"
```

---

### Task 33: Seed script

**Files:**
- Create: `prisma/seed.ts`

- [ ] **Step 1: Write seed**

```ts
// prisma/seed.ts
import 'dotenv/config';
import { PrismaClient, Role, LeaseState, SAProvince, DocumentKind } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { put } from '@vercel/blob';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const ORG_SLUG = 'acme';

async function main() {
  // Wipe demo org only (never touch other orgs).
  const existing = await db.org.findUnique({ where: { slug: ORG_SLUG } });
  if (existing) {
    await db.document.deleteMany({ where: { orgId: existing.id } });
    await db.leaseTenant.deleteMany({ where: { lease: { orgId: existing.id } } });
    await db.lease.deleteMany({ where: { orgId: existing.id } });
    await db.tenant.deleteMany({ where: { orgId: existing.id } });
    await db.unit.deleteMany({ where: { orgId: existing.id } });
    await db.property.deleteMany({ where: { orgId: existing.id } });
    await db.user.deleteMany({ where: { orgId: existing.id } });
    await db.org.delete({ where: { id: existing.id } });
  }

  const org = await db.org.create({
    data: { name: 'Acme Property Co', slug: ORG_SLUG, expiringWindowDays: 60 },
  });

  const passwordHash = await bcrypt.hash('demo1234', 10);
  await db.user.createMany({
    data: [
      { email: 'admin@acme.test',   name: 'Alice Admin',    role: Role.ADMIN,            orgId: org.id, passwordHash },
      { email: 'pm@acme.test',      name: 'Priya Manager',  role: Role.PROPERTY_MANAGER, orgId: org.id, passwordHash },
      { email: 'finance@acme.test', name: 'Frank Finance',  role: Role.FINANCE,          orgId: org.id, passwordHash },
      { email: 'tenant@acme.test',  name: 'Thandi Tenant',  role: Role.TENANT,           orgId: org.id, passwordHash },
    ],
  });
  const adminUser = await db.user.findUniqueOrThrow({ where: { email: 'admin@acme.test' } });

  // Properties: block of flats (8 units), townhouse complex (4), standalone house (1 auto "Main").
  const block = await db.property.create({
    data: {
      orgId: org.id,
      name: 'Rose Court',
      addressLine1: '12 Main Road',
      suburb: 'Observatory',
      city: 'Cape Town',
      province: SAProvince.WC,
      postalCode: '7925',
    },
  });
  for (let i = 1; i <= 8; i++) {
    await db.unit.create({
      data: { orgId: org.id, propertyId: block.id, label: `Flat ${i}`, bedrooms: 1, bathrooms: 1 },
    });
  }

  const townhouse = await db.property.create({
    data: {
      orgId: org.id,
      name: 'Oak Village',
      addressLine1: '5 Oak Street',
      suburb: 'Rondebosch',
      city: 'Cape Town',
      province: SAProvince.WC,
      postalCode: '7700',
    },
  });
  for (let i = 1; i <= 4; i++) {
    await db.unit.create({
      data: { orgId: org.id, propertyId: townhouse.id, label: `Unit ${i}`, bedrooms: 2, bathrooms: 2 },
    });
  }

  const house = await db.property.create({
    data: {
      orgId: org.id,
      name: '17 Willow Lane',
      addressLine1: '17 Willow Lane',
      suburb: 'Claremont',
      city: 'Cape Town',
      province: SAProvince.WC,
      postalCode: '7708',
    },
  });
  await db.unit.create({
    data: { orgId: org.id, propertyId: house.id, label: 'Main', bedrooms: 3, bathrooms: 2 },
  });

  const units = await db.unit.findMany({ where: { orgId: org.id }, orderBy: { createdAt: 'asc' } });

  const tenantNames: Array<[string, string]> = [
    ['Noah', 'Adams'], ['Lerato', 'Botha'], ['Sipho', 'Dlamini'], ['Anya', 'Fourie'],
    ['Tariq', 'Hassan'], ['Mia', 'Johnson'], ['Kabelo', 'Khumalo'], ['Zara', 'Naidoo'],
  ];
  const tenants = await Promise.all(
    tenantNames.map(([f, l], i) =>
      db.tenant.create({
        data: {
          orgId: org.id,
          firstName: f,
          lastName: l,
          email: `${f.toLowerCase()}@example.test`,
          phone: `+27 82 000 000${i}`,
        },
      }),
    ),
  );

  const today = new Date();
  const d = (monthsFromNow: number, day = 1): Date => {
    const x = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + monthsFromNow, day));
    return x;
  };

  type LeaseSpec = {
    unitIdx: number;
    tenantIdxs: number[];
    primary: number;
    start: Date;
    end: Date;
    rent: number;
    deposit: number;
    state: LeaseState;
    note?: string;
  };

  const leaseSpecs: LeaseSpec[] = [
    // 5 ACTIVE well inside window
    { unitIdx: 0, tenantIdxs: [0], primary: 0, start: d(-6), end: d(18), rent: 850000, deposit: 850000, state: LeaseState.ACTIVE },
    { unitIdx: 1, tenantIdxs: [1], primary: 1, start: d(-3), end: d(21), rent: 780000, deposit: 780000, state: LeaseState.ACTIVE },
    { unitIdx: 2, tenantIdxs: [2], primary: 2, start: d(-1), end: d(23), rent: 860000, deposit: 860000, state: LeaseState.ACTIVE },
    { unitIdx: 8, tenantIdxs: [3], primary: 3, start: d(-2), end: d(22), rent: 1500000, deposit: 1500000, state: LeaseState.ACTIVE },
    // Joint ACTIVE lease on the standalone house (unit 12), Mia primary, Tariq co-tenant
    { unitIdx: 12, tenantIdxs: [5, 4], primary: 5, start: d(-4), end: d(20), rent: 2200000, deposit: 2200000, state: LeaseState.ACTIVE, note: 'Joint lease' },
    // 2 EXPIRING (end within ~60 days)
    { unitIdx: 3, tenantIdxs: [6], primary: 6, start: d(-11), end: d(1, 20), rent: 800000, deposit: 800000, state: LeaseState.ACTIVE },
    { unitIdx: 4, tenantIdxs: [7], primary: 7, start: d(-11), end: d(2, 5), rent: 820000, deposit: 820000, state: LeaseState.ACTIVE },
    // 1 EXPIRED (endDate past, never terminated)
    { unitIdx: 5, tenantIdxs: [0], primary: 0, start: d(-15), end: d(-1, 15), rent: 790000, deposit: 790000, state: LeaseState.ACTIVE },
    // 1 DRAFT (future-dated, makes unit 6 UPCOMING)
    { unitIdx: 6, tenantIdxs: [1], primary: 1, start: d(1, 1), end: d(13, 1), rent: 880000, deposit: 880000, state: LeaseState.DRAFT },
    // 1 TERMINATED
    { unitIdx: 9, tenantIdxs: [2], primary: 2, start: d(-10), end: d(2), rent: 1400000, deposit: 1400000, state: LeaseState.TERMINATED },
    // 1 RENEWED + its successor ACTIVE lease (same unit 10)
    { unitIdx: 10, tenantIdxs: [3], primary: 3, start: d(-14), end: d(-2), rent: 1450000, deposit: 1450000, state: LeaseState.RENEWED },
  ];

  const leaseIds: string[] = [];
  for (const spec of leaseSpecs) {
    const lease = await db.lease.create({
      data: {
        orgId: org.id,
        unitId: units[spec.unitIdx].id,
        startDate: spec.start,
        endDate: spec.end,
        rentAmountCents: spec.rent,
        depositAmountCents: spec.deposit,
        paymentDueDay: 1,
        state: spec.state,
        notes: spec.note ?? null,
        ...(spec.state === LeaseState.TERMINATED
          ? { terminatedAt: today, terminatedReason: 'Tenant relocated' }
          : {}),
        tenants: {
          create: spec.tenantIdxs.map((ti) => ({
            tenantId: tenants[ti].id,
            isPrimary: ti === spec.primary,
          })),
        },
      },
    });
    leaseIds.push(lease.id);
  }

  // Successor to the RENEWED lease (same unit, starts the day after predecessor end)
  const renewedPredecessor = await db.lease.findUniqueOrThrow({
    where: { id: leaseIds[leaseIds.length - 1] },
  });
  const successorStart = new Date(renewedPredecessor.endDate);
  successorStart.setUTCDate(successorStart.getUTCDate() + 1);
  const successorEnd = new Date(successorStart);
  successorEnd.setUTCFullYear(successorEnd.getUTCFullYear() + 1);
  await db.lease.create({
    data: {
      orgId: org.id,
      unitId: units[10].id,
      startDate: successorStart,
      endDate: successorEnd,
      rentAmountCents: 1500000,
      depositAmountCents: 1500000,
      paymentDueDay: 1,
      state: LeaseState.ACTIVE,
      renewedFromId: renewedPredecessor.id,
      tenants: {
        create: [{ tenantId: tenants[3].id, isPrimary: true }],
      },
    },
  });

  // 2 seeded lease-agreement documents via Vercel Blob (same code path as production)
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const activeLeaseIds = leaseIds.slice(0, 2);
    for (const lid of activeLeaseIds) {
      const dummy = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], `agreement-${lid}.pdf`, {
        type: 'application/pdf',
      });
      const result = await put(`orgs/${org.id}/leases/${lid}/${dummy.name}`, dummy, {
        access: 'public',
        addRandomSuffix: true,
      });
      await db.document.create({
        data: {
          orgId: org.id,
          kind: DocumentKind.LEASE_AGREEMENT,
          leaseId: lid,
          filename: dummy.name,
          mimeType: 'application/pdf',
          sizeBytes: 4,
          storageKey: result.pathname,
          uploadedById: adminUser.id,
        },
      });
    }
  } else {
    console.warn('BLOB_READ_WRITE_TOKEN not set — skipping seeded documents');
  }

  console.log('Seed complete.');
  console.log('  admin@acme.test / demo1234 (ADMIN)');
  console.log('  pm@acme.test / demo1234 (PROPERTY_MANAGER)');
  console.log('  finance@acme.test / demo1234 (FINANCE)');
  console.log('  tenant@acme.test / demo1234 (TENANT)');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
```

- [ ] **Step 2: Run seed**

```bash
npm run db:seed
```

Expected: prints "Seed complete." and the four login lines.

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat(db): idempotent demo seed exercising every lease status + occupancy"
```

---

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

- [ ] **Check 7: Overlap guard**

1. `/leases/new` → pick the same "Test Villa · Main"
2. Use dates that overlap step 6 (e.g. today+30 → today+200)
3. Submit → server accepts (DRAFT leases don't block on create)
4. Click **Activate** → expect `409 CONFLICT` with message about overlap

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










