## Phase D — Service layer

The service layer owns all business rules. Routes stay thin (auth + Zod parse + delegate). Each service file exports pure functions that take a `RouteCtx` (orgId, userId, role) plus typed input and call Prisma. Derived values (`status`, `occupancy`) are computed here, never re-derived in the UI.

**Per-task convention:** write the file(s), run `npm run typecheck`, then commit with the message noted at the end of each task. All commits on `master`.

---

### Task 11: Zod schemas

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

```ts
// lib/zod/lease.ts
import { z } from 'zod';

export const leaseStateEnum = z.enum(['DRAFT','ACTIVE','TERMINATED','RENEWED']);

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');

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

```ts
// lib/zod/document.ts
import { z } from 'zod';

export const documentKindEnum = z.enum(['LEASE_AGREEMENT']);
export const documentUploadMetaSchema = z.object({ kind: documentKindEnum });
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

**Commit:** `feat(zod): boundary schemas for all Slice 1 resources`

---

### Task 12: Properties service

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
    include: { units: { orderBy: { label: 'asc' } } },
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
    const property = await tx.property.create({ data: { ...data, orgId: ctx.orgId } });
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

**Commit:** `feat(services): properties CRUD + soft-delete w/ active-lease guard`

---

### Task 13: Units service + `getUnitOccupancy`

`getUnitOccupancy` ignores DRAFT leases — drafts are proposals, not commitments, and must never mark a unit occupied or reserved. Only `ACTIVE` counts.

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
    where: { unitId, orgId, state: 'ACTIVE' },
    select: { id: true, startDate: true, endDate: true },
    orderBy: { startDate: 'asc' },
  });
  const today = new Date(Date.UTC(on.getUTCFullYear(), on.getUTCMonth(), on.getUTCDate()));

  const covering = leases.filter((l) => l.startDate <= today && l.endDate >= today);
  if (covering.length > 1) {
    return { state: 'CONFLICT', coveringLeaseId: covering[0].id, upcomingLeaseId: null };
  }
  if (covering.length === 1) {
    const upcoming = leases.find((l) => l.startDate > today) ?? null;
    return { state: 'OCCUPIED', coveringLeaseId: covering[0].id, upcomingLeaseId: upcoming?.id ?? null };
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
        include: { tenants: { include: { tenant: true } } },
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

**Commit:** `feat(services): units CRUD + getUnitOccupancy`

---

### Task 14: Tenants service (soft-duplicate, archive)

```ts
// lib/services/tenants.ts
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import type { RouteCtx } from '@/lib/auth/with-org';
import type { z } from 'zod';
import type { createTenantSchema, updateTenantSchema } from '@/lib/zod/tenant';

export async function listTenants(ctx: RouteCtx, opts: { includeArchived?: boolean } = {}) {
  return db.tenant.findMany({
    where: {
      orgId: ctx.orgId,
      ...(opts.includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    include: { _count: { select: { leases: true } } },
  });
}

export async function getTenant(ctx: RouteCtx, id: string) {
  const tenant = await db.tenant.findFirst({
    where: { id, orgId: ctx.orgId },
    include: {
      leases: {
        include: {
          lease: {
            include: { unit: { include: { property: { select: { id: true, name: true } } } } },
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
        include: { lease: { select: { state: true, startDate: true, endDate: true } } },
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

**Commit:** `feat(services): tenants CRUD + soft-duplicate + archive`

---

### Task 15: Leases — state machine, derived status, overlap guard, renewal

Key invariants: DRAFT leases are free (no overlap check at create); **activation** is the overlap gate. Activation also requires ≥1 tenant and exactly one primary. Exactly-one-primary is enforced at the DB by the partial-unique index from Phase B.

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

export type DerivedStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'TERMINATED' | 'RENEWED';

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
    case 'DRAFT': return 'DRAFT';
    case 'TERMINATED': return 'TERMINATED';
    case 'RENEWED': return 'RENEWED';
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
      AND: [{ startDate: { lte: endDate } }, { endDate: { gte: startDate } }],
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

export async function listLeases(ctx: RouteCtx, query: z.infer<typeof leaseListQuerySchema>) {
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

    return tx.lease.create({
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
    if (existing.state !== 'DRAFT') throw ApiError.conflict('Only DRAFT leases may be edited');

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
    const lease = await tx.lease.findFirst({
      where: { id, orgId: ctx.orgId },
      include: { tenants: true },
    });
    if (!lease) throw ApiError.notFound('Lease not found');
    if (lease.state !== 'DRAFT') throw ApiError.conflict(`Lease is ${lease.state}, cannot activate`);
    if (lease.tenants.length === 0) throw ApiError.conflict('Cannot activate a lease with no tenants');
    const primaryCount = lease.tenants.filter((t) => t.isPrimary).length;
    if (primaryCount !== 1) {
      throw ApiError.conflict('Lease must have exactly one primary tenant to activate');
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
    if (predecessor.state !== 'ACTIVE') throw ApiError.conflict('Only ACTIVE leases can be renewed');
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
    await tx.leaseTenant.updateMany({ where: { leaseId, isPrimary: true }, data: { isPrimary: false } });
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

**Commit:** `feat(services): lease state machine, derived status, overlap guard, renewal`

---

### Task 16: Documents service (Vercel Blob)

```ts
// lib/blob.ts
import { put, del } from '@vercel/blob';

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

export function validateFile(file: File) {
  if (file.size > MAX_BYTES) throw new Error('File too large (max 20MB)');
  if (!ALLOWED_MIME.has(file.type)) throw new Error(`Unsupported file type: ${file.type}`);
}

export async function uploadBlob(path: string, file: File) {
  const result = await put(path, file, { access: 'public', addRandomSuffix: true, contentType: file.type });
  return { url: result.url, pathname: result.pathname };
}

export async function deleteBlob(pathname: string) {
  await del(pathname);
}
```

```ts
// lib/services/documents.ts
// Slice 1 uses public Vercel Blob URLs. Slice 2+ will move to private blobs + signed URLs.
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { uploadBlob, validateFile } from '@/lib/blob';
import type { RouteCtx } from '@/lib/auth/with-org';
import type { DocumentKind } from '@prisma/client';

export async function uploadLeaseAgreement(ctx: RouteCtx, leaseId: string, file: File) {
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
  const { pathname } = await uploadBlob(`orgs/${ctx.orgId}/leases/${leaseId}/${file.name}`, file);
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
  return doc;
}
```

**Commit:** `feat(services): document upload via Vercel Blob`

---

### Task 17: Team + Dashboard services

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
    select: { id: true, email: true, name: true, role: true, disabledAt: true, createdAt: true },
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

export async function changeOwnPassword(ctx: RouteCtx, input: z.infer<typeof changePasswordSchema>) {
  const user = await db.user.findUnique({ where: { id: ctx.userId } });
  if (!user) throw ApiError.notFound('User not found');
  const ok = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!ok) throw ApiError.validation({ currentPassword: 'Incorrect password' });
  const passwordHash = await bcrypt.hash(input.newPassword, 10);
  await db.user.update({ where: { id: ctx.userId }, data: { passwordHash } });
  return { ok: true };
}
```

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

  const occupancies = await Promise.all(units.map((u) => getUnitOccupancy(u.id, ctx.orgId, now)));
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
      const daysUntil = Math.ceil((l.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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

**Commit:** `feat(services): team management + dashboard summary`
