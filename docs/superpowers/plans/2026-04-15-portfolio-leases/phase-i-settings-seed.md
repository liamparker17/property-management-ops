## Phase I — Settings + seed

**Per-task convention:** run `npm run typecheck` after each task, then commit with the message noted at the end of the task.

### Task 32: Settings pages (team + org)

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

**Commit:** `feat(ui): settings team + org pages`

---

### Task 33: Seed script

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
    // 1 ACTIVE future-dated (makes unit 6 UPCOMING — drafts are invisible to occupancy)
    { unitIdx: 6, tenantIdxs: [1], primary: 1, start: d(1, 1), end: d(13, 1), rent: 880000, deposit: 880000, state: LeaseState.ACTIVE },
    // 1 DRAFT on a different unit (doesn't affect occupancy; unit stays VACANT)
    { unitIdx: 7, tenantIdxs: [6], primary: 6, start: d(2, 1), end: d(14, 1), rent: 820000, deposit: 820000, state: LeaseState.DRAFT },
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

```bash
npm run db:seed
```

Expected: prints "Seed complete." and the four login lines.

**Commit:** `feat(db): idempotent demo seed exercising every lease status + occupancy`

---
