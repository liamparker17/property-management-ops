import Link from 'next/link';

import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { listNotificationsForUser } from '@/lib/services/notifications';

export default async function TenantNoticesPage() {
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  const rows = (await listNotificationsForUser(ctx)).filter((row) => row.type === 'AREA_NOTICE');

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Tenant Portal" title="Notices" description="Your inbox of property and area notices." />
      <Card className="overflow-hidden border border-border p-0">
        <div className="divide-y divide-border/60">
          {rows.map((row) => (
            <Link key={row.id} href={`/tenant/notices/${row.id}`} className="block px-5 py-4 hover:bg-[color:var(--muted)]/35">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-foreground">{row.subject}</div>
                  <div className="text-sm text-muted-foreground">{row.body}</div>
                </div>
                {!row.readAt ? <span className="text-xs uppercase tracking-[0.16em] text-[color:var(--accent)]">Unread</span> : null}
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
