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
      const code = json.error?.code;
      const blockingIds: string[] | undefined = json.error?.details?.blockingLeaseIds;
      if (code === 'CONFLICT' && blockingIds?.length) {
        alert(
          `Cannot delete: ${blockingIds.length} active or draft lease(s) still attached.\n\n` +
            `Blocking lease IDs:\n${blockingIds.join('\n')}\n\n` +
            `Terminate or remove those leases first.`,
        );
      } else {
        alert(json.error?.message ?? 'Failed');
      }
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

