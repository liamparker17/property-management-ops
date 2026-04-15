## Phase H — Tenants & leases UI

**Per-task convention:** run `npm run typecheck` after each task, then commit with the message noted at the end of the task.

---

### Task 29: Tenants list + create + detail

**Step 1: Tenant form**

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

**Step 2: List + new pages**

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

**Step 3: Tenant detail (with lease role annotations)**

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

**Commit:** `feat(ui): tenants list/create/detail + archive`

---

### Task 30: Lease list + create form

**Step 1: Lease form**

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

**Step 2: Lease list**

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

**Step 3: New lease page**

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

**Commit:** `feat(ui): lease list + create`

---

### Task 31: Lease detail + actions + renew form

**Step 1: Action bar (client)**

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

**Step 2: Lease detail page with document upload inline**

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

**Step 3: Renew page**

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

**Commit:** `feat(ui): lease detail, actions, renew, document upload`
