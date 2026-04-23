'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  applicationId: string;
  defaults: { requestedMoveIn: string | null };
};

export function ConvertApplicationDialog({ applicationId, defaults }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const rentRands = Number(form.get('rentAmountRands') ?? 0);
    const depositRands = Number(form.get('depositAmountRands') ?? 0);
    const payload = {
      startDate: String(form.get('startDate') ?? ''),
      endDate: String(form.get('endDate') ?? ''),
      rentAmountCents: Math.round(rentRands * 100),
      depositAmountCents: Math.round(depositRands * 100),
      createPortalUser: form.get('createPortalUser') === 'on',
    };

    try {
      const res = await fetch(`/api/applications/${applicationId}/convert`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPending(false);
        setError(json?.error?.message ?? 'Conversion failed');
        return;
      }
      const tenantId: string | undefined = json?.data?.tenant?.id;
      const returnedTemp: string | null = json?.data?.tempPassword ?? null;
      if (returnedTemp && payload.createPortalUser) {
        setTempPassword(returnedTemp);
        setPending(false);
        // defer navigation so the PM can copy the temp password
        return;
      }
      if (tenantId) {
        router.push(`/tenants/${tenantId}`);
      } else {
        setPending(false);
        setOpen(false);
        router.refresh();
      }
    } catch (err) {
      setPending(false);
      setError((err as Error).message ?? 'Network error');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Convert to tenant</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert application to tenant</DialogTitle>
        </DialogHeader>
        {tempPassword ? (
          <div className="space-y-4">
            <p className="text-sm text-foreground">
              Portal account created. Share this temporary password with the tenant — it will not be shown again.
            </p>
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-sm">
              {tempPassword}
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  setTempPassword(null);
                  setOpen(false);
                  router.refresh();
                }}
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Start date</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  defaultValue={defaults.requestedMoveIn ?? undefined}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">End date</Label>
                <Input id="endDate" name="endDate" type="date" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rentAmountRands">Rent (ZAR)</Label>
                <Input
                  id="rentAmountRands"
                  name="rentAmountRands"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="depositAmountRands">Deposit (ZAR)</Label>
                <Input
                  id="depositAmountRands"
                  name="depositAmountRands"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="createPortalUser" className="mt-0.5" />
              <span>Create portal login and generate a temporary password.</span>
            </label>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Convert
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
