import type { UtilityType } from '@prisma/client';
import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { db } from '@/lib/db';
import { listRules, upsertRule } from '@/lib/services/usage-alerts';

const UTILITY_TYPES: UtilityType[] = ['WATER', 'ELECTRICITY', 'GAS', 'SEWER', 'REFUSE', 'OTHER'];

export default async function UsageAlertsPage() {
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  const [rules, events] = await Promise.all([
    listRules(ctx),
    db.usageAlertEvent.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        meter: true,
        lease: { include: { unit: { include: { property: { select: { name: true } } } } } },
      },
    }),
  ]);

  async function saveRuleAction(formData: FormData) {
    'use server';
    const freshSession = await auth();
    const freshCtx = userToRouteCtx(freshSession!.user);
    await upsertRule(freshCtx, {
      utilityType: String(formData.get('utilityType')) as UtilityType,
      thresholdPct: Number(formData.get('thresholdPct') ?? 50),
      enabled: Boolean(formData.get('enabled')),
    });
    redirect('/alerts/usage');
  }

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Alerts" title="Usage alerts" description="Rolling baseline anomaly events and rule thresholds." />
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border border-border p-5">
          <h2 className="font-serif text-[26px] font-light text-foreground">Rule editor</h2>
          <div className="mt-4 space-y-4">
            {UTILITY_TYPES.map((utilityType) => {
              const current = rules.find((rule) => rule.utilityType === utilityType);
              return (
                <form key={utilityType} action={saveRuleAction} className="grid gap-3 border border-border/70 p-4">
                  <input type="hidden" name="utilityType" value={utilityType} />
                  <div className="font-medium text-foreground">{utilityType}</div>
                  <div className="space-y-2">
                    <Label htmlFor={`threshold-${utilityType}`}>Threshold %</Label>
                    <Input id={`threshold-${utilityType}`} name="thresholdPct" type="number" defaultValue={current?.thresholdPct ?? 50} />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input type="checkbox" name="enabled" defaultChecked={current?.enabled ?? true} />
                    Enabled
                  </label>
                  <Button type="submit" variant="outline">Save</Button>
                </form>
              );
            })}
          </div>
        </Card>
        <Card className="overflow-hidden border border-border p-0">
          <div className="border-b border-border/70 px-5 py-4">
            <h2 className="font-serif text-[26px] font-light text-foreground">Recent events</h2>
          </div>
          {events.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              No usage anomalies detected yet. Rules fire when meter readings exceed the configured baseline threshold.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {events.map((event) => (
                <div key={event.id} className="px-5 py-4">
                  <div className="font-medium text-foreground">
                    {event.lease.unit.property.name} / {event.lease.unit.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {event.deltaPct}% above baseline · {event.meter?.type ?? 'Meter'} · {event.periodStart.toISOString().slice(0, 10)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
