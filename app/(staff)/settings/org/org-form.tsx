'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function OrgForm({
  initial,
}: {
  initial: {
    name: string;
    expiringWindowDays: number;
    ownerType: 'PM_AGENCY' | 'LANDLORD_DIRECT';
    landlordApprovalThresholdCents: number;
  };
}) {
  const router = useRouter();
  const [status, setStatus] = useState<null | { ok: boolean; message: string }>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setStatus(null);
    const form = new FormData(e.currentTarget);
    const thresholdRand = Number(form.get('landlordApprovalThresholdRand'));
    const res = await fetch('/api/settings/org', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: form.get('name'),
        expiringWindowDays: Number(form.get('expiringWindowDays')),
        ownerType: form.get('ownerType'),
        landlordApprovalThresholdCents: Math.round(thresholdRand * 100),
      }),
    });
    const json = await res.json();
    setPending(false);
    if (!res.ok) {
      setStatus({ ok: false, message: json.error?.message ?? 'Failed' });
      return;
    }
    setStatus({ ok: true, message: 'Saved' });
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 text-sm">
      <div className="space-y-2">
        <Label htmlFor="name">Org name<span className="text-destructive">*</span></Label>
        <Input id="name" name="name" defaultValue={initial.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="expiringWindowDays">Expiring window (days)<span className="text-destructive">*</span></Label>
        <Input
          id="expiringWindowDays"
          name="expiringWindowDays"
          type="number"
          min={1}
          max={365}
          defaultValue={initial.expiringWindowDays}
          required
        />
        <p className="text-xs text-muted-foreground">Leases ending within this many days are flagged as expiring soon.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ownerType">Workspace type<span className="text-destructive">*</span></Label>
        <select
          id="ownerType"
          name="ownerType"
          defaultValue={initial.ownerType}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        >
          <option value="PM_AGENCY">Property management agency</option>
          <option value="LANDLORD_DIRECT">Landlord-owned</option>
        </select>
        <p className="text-xs text-muted-foreground">
          Determines whether landlords sign off on PM actions (agency) or act as the primary decision-maker (landlord-owned).
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="landlordApprovalThresholdRand">Landlord approval threshold (R)<span className="text-destructive">*</span></Label>
        <Input
          id="landlordApprovalThresholdRand"
          name="landlordApprovalThresholdRand"
          type="number"
          min={0}
          step="0.01"
          defaultValue={(initial.landlordApprovalThresholdCents / 100).toFixed(2)}
          required
        />
        <p className="text-xs text-muted-foreground">Maintenance jobs at or above this cost require landlord approval (agency workspaces only).</p>
      </div>
      {status && (
        <div
          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
            status.ok
              ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
              : 'border-destructive/20 bg-destructive/5 text-destructive'
          }`}
        >
          {status.ok && <CheckCircle2 className="h-4 w-4" />}
          {status.message}
        </div>
      )}
      <div>
        <Button type="submit" disabled={pending} className="gap-2">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
