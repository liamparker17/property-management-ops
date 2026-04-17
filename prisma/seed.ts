import { config } from 'dotenv';
config({ path: '.env.local' });
config();
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
      { email: 'tenant2@acme.test', name: 'Daniel Newman',  role: Role.TENANT,           orgId: org.id, passwordHash },
    ],
  });
  const adminUser = await db.user.findUniqueOrThrow({ where: { email: 'admin@acme.test' } });
  const tenantUser = await db.user.findUniqueOrThrow({ where: { email: 'tenant@acme.test' } });
  const tenant2User = await db.user.findUniqueOrThrow({ where: { email: 'tenant2@acme.test' } });

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

  // Demo tenant user linked to an actual Tenant record so the tenant portal works end-to-end.
  const thandi = await db.tenant.create({
    data: {
      orgId: org.id,
      firstName: 'Thandi',
      lastName: 'Tenant',
      email: 'tenant@acme.test',
      phone: '+27 82 555 0100',
      userId: tenantUser.id,
    },
  });
  tenants.push(thandi);

  const daniel = await db.tenant.create({
    data: {
      orgId: org.id,
      firstName: 'Daniel',
      lastName: 'Newman',
      email: 'tenant2@acme.test',
      phone: '+27 82 555 0101',
      userId: tenant2User.id,
    },
  });
  tenants.push(daniel);

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
    // 1 ACTIVE future-dated (makes unit 6 UPCOMING — drafts are invisible to occupancy)
    { unitIdx: 6, tenantIdxs: [1], primary: 1, start: d(1, 1), end: d(13, 1), rent: 880000, deposit: 880000, state: LeaseState.ACTIVE },
    // Daniel (tenant2) — DRAFT lease awaiting signature, demos the onboarding/signing flow
    { unitIdx: 7, tenantIdxs: [9], primary: 9, start: d(1, 1), end: d(13, 1), rent: 820000, deposit: 820000, state: LeaseState.DRAFT, note: 'Pending tenant signature — standard residential lease.' },
    // 1 TERMINATED
    { unitIdx: 9, tenantIdxs: [2], primary: 2, start: d(-10), end: d(2), rent: 1400000, deposit: 1400000, state: LeaseState.TERMINATED },
    // 1 RENEWED + its successor ACTIVE lease (same unit 10)
    { unitIdx: 10, tenantIdxs: [3], primary: 3, start: d(-14), end: d(-2), rent: 1450000, deposit: 1450000, state: LeaseState.RENEWED },
    // Thandi (demo tenant user) on unit 11 — EXPIRING in ~45 days so the renewal banner demos nicely
    { unitIdx: 11, tenantIdxs: [8], primary: 8, start: d(-10), end: d(1, 15), rent: 1800000, deposit: 1800000, state: LeaseState.ACTIVE, note: 'Demo tenant lease for the tenant portal walkthrough.' },
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

  // Seeded lease-agreement documents via Vercel Blob (same code path as production).
  // Include Thandi's lease (last in leaseIds) so the tenant portal shows real documents.
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const thandiLeaseId = leaseIds[leaseIds.length - 1];
    // Daniel's DRAFT lease (index 9 in leaseSpecs) so the onboarding/signing demo has a document to view.
    const danielLeaseId = leaseIds[9];
    const activeLeaseIds = [leaseIds[0], leaseIds[1], thandiLeaseId, danielLeaseId];
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
  console.log('  tenant2@acme.test / demo1234 (TENANT — pending signature demo)');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
