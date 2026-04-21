'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

type Row = {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'PROPERTY_MANAGER' | 'FINANCE' | 'TENANT' | 'LANDLORD' | 'MANAGING_AGENT';
  disabledAt: Date | null;
};

const NATIVE_SELECT =
  'flex h-7 w-full rounded-lg border border-input bg-transparent px-2 py-0.5 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';

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
    <tr className="transition-colors duration-150 hover:bg-muted/40">
      <td className="px-4 py-3 font-medium text-foreground">{row.email}</td>
      <td className="px-4 py-3 text-muted-foreground">{row.name ?? '—'}</td>
      <td className="px-4 py-3">
        <select
          value={role}
          disabled={busy}
          onChange={(e) => {
            setRole(e.target.value as Row['role']);
            save({ role: e.target.value });
          }}
          className={NATIVE_SELECT}
        >
          <option value="ADMIN">Admin</option>
          <option value="PROPERTY_MANAGER">Property manager</option>
          <option value="FINANCE">Finance</option>
          <option value="TENANT">Tenant</option>
          <option value="LANDLORD">Landlord</option>
          <option value="MANAGING_AGENT">Managing Agent</option>
        </select>
      </td>
      <td className="px-4 py-3">
        {row.disabledAt ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20 dark:text-slate-300">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            Disabled
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Active
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => save({ disabled: !row.disabledAt })}
          disabled={busy}
        >
          {row.disabledAt ? 'Enable' : 'Disable'}
        </Button>
      </td>
    </tr>
  );
}
