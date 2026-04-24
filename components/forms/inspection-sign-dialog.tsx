'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function InspectionSignDialog({
  inspectionId,
  defaultRole,
}: {
  inspectionId: string;
  defaultRole: 'ADMIN' | 'PROPERTY_MANAGER' | 'LANDLORD' | 'TENANT' | 'MANAGING_AGENT' | 'FINANCE';
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(defaultRole);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/inspections/${inspectionId}/sign`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ signerRole: role, signedName: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'Failed to sign');
        return;
      }
      setOpen(false);
      setName('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Sign inspection</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign inspection</DialogTitle>
          <DialogDescription>Recorded with your role and signed name.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>Signer role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="PROPERTY_MANAGER">Property manager</SelectItem>
                <SelectItem value="LANDLORD">Landlord</SelectItem>
                <SelectItem value="TENANT">Tenant</SelectItem>
                <SelectItem value="MANAGING_AGENT">Managing agent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Signed name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={busy || name.trim().length === 0}>
              {busy ? 'Signing…' : 'Sign'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
