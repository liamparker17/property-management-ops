import Link from 'next/link';

import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { db } from '@/lib/db';
import { formatZar } from '@/lib/format';

function bucketLabel(daysPastDue: number) {
  if (daysPastDue >= 30) return '30d final';
  if (daysPastDue >= 14) return '14d overdue';
  return '7d reminder';
}

export default async function PaymentAlertsPage() {
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  const invoices = await db.invoice.findMany({
    where: { orgId: ctx.orgId, paidAt: null, status: { in: ['DUE', 'OVERDUE'] } },
    include: {
      lease: {
        include: {
          unit: { include: { property: { select: { name: true } } } },
          tenants: { where: { isPrimary: true }, include: { tenant: true } },
        },
      },
    },
    orderBy: { dueDate: 'asc' },
  });

  const rows = invoices
    .map((invoice) => ({
      ...invoice,
      daysPastDue: Math.floor((Date.now() - invoice.dueDate.getTime()) / 86400000),
    }))
    .filter((invoice) => invoice.daysPastDue >= -7);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Alerts" title="Payment alerts" description="Invoices currently inside reminder, overdue, and final-notice windows." />
      <Card className="overflow-hidden border border-border p-0">
        <div className="divide-y divide-border/60">
          {rows.map((row) => (
            <Link key={row.id} href={`/leases/${row.leaseId}#invoices`} className="block px-5 py-4 hover:bg-[color:var(--muted)]/35">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-foreground">
                    {row.lease.unit.property.name} / {row.lease.unit.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {row.lease.tenants[0]?.tenant ? `${row.lease.tenants[0].tenant.firstName} ${row.lease.tenants[0].tenant.lastName}` : 'Primary tenant missing'} · {bucketLabel(row.daysPastDue)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-foreground">{formatZar(row.totalCents)}</div>
                  <div className="text-xs text-muted-foreground">Due {row.dueDate.toISOString().slice(0, 10)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
