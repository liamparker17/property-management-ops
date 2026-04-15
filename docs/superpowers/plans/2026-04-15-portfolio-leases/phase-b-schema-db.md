## Phase B — Schema & DB

**Per-task convention:** run `npm run typecheck` after each task, then commit with the message noted at the end of the task.

### Task 4: Prisma setup + full schema

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

**Commit:** `feat(db): Prisma schema — org, auth, portfolio, leases, documents`

---

### Task 5: First migration + CHECK/partial-unique constraints

Prisma cannot express the Document "exactly one parent FK" CHECK constraint or the "one primary per lease" partial unique. Both land via a raw-SQL follow-up migration right after the initial baseline.

```bash
npm run db:migrate -- --name init
```

Expected: creates `prisma/migrations/<ts>_init/` with `migration.sql` and applies it against Neon. Prisma Client is generated.

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

```bash
npm run db:migrate -- --name constraints
```

Expected: Prisma records the migration and the constraints are applied.

**Commit:** `feat(db): init migration + document & primary-tenant constraints`

---

### Task 6: Prisma client singleton

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

**Commit:** `feat(db): Prisma client singleton with pg adapter`

---
