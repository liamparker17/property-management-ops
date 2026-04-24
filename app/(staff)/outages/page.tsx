import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { db } from '@/lib/db';
import { createPmOutage, listUpcomingOutages } from '@/lib/services/outages';

export default async function StaffOutagesPage() {
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  const [properties, outages] = await Promise.all([
    db.property.findMany({
      where: { orgId: ctx.orgId, deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, eskomAreaCode: true },
    }),
    listUpcomingOutages(ctx),
  ]);

  async function createOutageAction(formData: FormData) {
    'use server';
    const freshSession = await auth();
    const freshCtx = userToRouteCtx(freshSession!.user);
    await createPmOutage(freshCtx, {
      propertyId: String(formData.get('propertyId') || '') || undefined,
      eskomAreaCode: String(formData.get('eskomAreaCode') || '') || undefined,
      startsAt: String(formData.get('startsAt')),
      endsAt: String(formData.get('endsAt')),
      stage: formData.get('stage') ? Number(formData.get('stage')) : undefined,
      note: String(formData.get('note') || '') || undefined,
    });
    redirect('/outages');
  }

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Operations" title="Outages" description="PM-created and Eskom-synced outages across the organisation." />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border border-border p-5">
          <h2 className="font-serif text-[26px] font-light text-foreground">Add outage</h2>
          <form action={createOutageAction} className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="propertyId">Property</Label>
              <select id="propertyId" name="propertyId" className="h-10 w-full border border-input bg-background px-3 text-sm">
                <option value="">Organisation-wide / area-only</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>{property.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startsAt">Starts at</Label>
                <Input id="startsAt" name="startsAt" type="datetime-local" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endsAt">Ends at</Label>
                <Input id="endsAt" name="endsAt" type="datetime-local" required />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="stage">Stage</Label>
                <Input id="stage" name="stage" type="number" min="1" max="8" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eskomAreaCode">Eskom area code</Label>
                <Input id="eskomAreaCode" name="eskomAreaCode" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Textarea id="note" name="note" rows={4} />
            </div>
            <Button type="submit">Create outage</Button>
          </form>
        </Card>

        <Card className="overflow-hidden border border-border p-0">
          <div className="border-b border-border/70 px-5 py-4">
            <h2 className="font-serif text-[26px] font-light text-foreground">Upcoming outages</h2>
          </div>
          <div className="divide-y divide-border/60">
            {outages.map((row) => (
              <div key={row.id} className="px-5 py-4">
                <div className="font-medium text-foreground">{row.source}{row.stage ? ` · Stage ${row.stage}` : ''}</div>
                <div className="text-xs text-muted-foreground">
                  {row.startsAt.toISOString().slice(0, 16).replace('T', ' ')} to {row.endsAt.toISOString().slice(0, 16).replace('T', ' ')}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
