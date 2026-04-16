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
