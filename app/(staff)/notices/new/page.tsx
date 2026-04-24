import { redirect } from 'next/navigation';
import type { AreaNoticeType, LeaseState, Role } from '@prisma/client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { db } from '@/lib/db';
import { createNotice } from '@/lib/services/area-notices';

const NOTICE_TYPES: AreaNoticeType[] = ['OUTAGE', 'ESTATE', 'SECURITY', 'WATER', 'POWER', 'GENERAL'];
const LEASE_STATES: LeaseState[] = ['ACTIVE', 'DRAFT', 'RENEWED', 'TERMINATED'];
const ROLES: Role[] = ['TENANT', 'LANDLORD', 'MANAGING_AGENT'];

function stringList(value: FormDataEntryValue | null) {
  return String(value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export default async function NewNoticePage() {
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  const properties = await db.property.findMany({
    where: { orgId: ctx.orgId, deletedAt: null },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  async function createNoticeAction(formData: FormData) {
    'use server';
    const freshSession = await auth();
    const freshCtx = userToRouteCtx(freshSession!.user);
    const propertyIds = formData.getAll('propertyIds').map(String).filter(Boolean);
    const leaseStates = formData.getAll('leaseStates').map(String).filter(Boolean) as LeaseState[];
    const roles = formData.getAll('roles').map(String).filter(Boolean) as Role[];
    const notice = await createNotice(freshCtx, {
      type: String(formData.get('type')) as AreaNoticeType,
      title: String(formData.get('title') ?? ''),
      body: String(formData.get('body') ?? ''),
      startsAt: formData.get('startsAt') ? String(formData.get('startsAt')) : undefined,
      endsAt: formData.get('endsAt') ? String(formData.get('endsAt')) : undefined,
      audienceQuery: {
        propertyIds,
        leaseStates,
        roles,
        unitTypes: stringList(formData.get('unitTypes')),
      },
    });
    redirect(`/notices/${notice.id}`);
  }

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Operations" title="Compose notice" description="Draft a notice and define the audience filters that should resolve at delivery time." />
      <Card className="border border-border p-6">
        <form action={createNoticeAction} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select id="type" name="type" className="h-10 w-full border border-input bg-background px-3 text-sm">
                {NOTICE_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Body</Label>
            <Textarea id="body" name="body" required rows={8} />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startsAt">Starts at</Label>
              <Input id="startsAt" name="startsAt" type="datetime-local" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endsAt">Ends at</Label>
              <Input id="endsAt" name="endsAt" type="datetime-local" />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Properties</Label>
              <select name="propertyIds" multiple className="min-h-40 w-full border border-input bg-background px-3 py-2 text-sm">
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>{property.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Lease states</Label>
              <select name="leaseStates" multiple className="min-h-40 w-full border border-input bg-background px-3 py-2 text-sm">
                {LEASE_STATES.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Roles</Label>
              <select name="roles" multiple className="min-h-40 w-full border border-input bg-background px-3 py-2 text-sm">
                {ROLES.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unitTypes">Unit labels or types (comma-separated)</Label>
            <Input id="unitTypes" name="unitTypes" placeholder="Studio, 1 Bed, 2 Bed" />
          </div>

          <Button type="submit">Save draft</Button>
        </form>
      </Card>
    </div>
  );
}
