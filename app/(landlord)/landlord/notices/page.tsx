import Link from 'next/link';
import { Bell } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { listNotificationsForUser } from '@/lib/services/notifications';

export default async function LandlordNoticesPage() {
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  const notices = (await listNotificationsForUser(ctx)).filter((row) => row.type === 'AREA_NOTICE');

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Landlord Portal" title="Notices" description="Property and area notices that currently apply to your portfolio." />
      <Card className="overflow-hidden border border-border p-0">
        {notices.length === 0 ? (
          <EmptyState
            icon={<Bell className="size-5" />}
            title="No notices yet"
            description="Area notices that target your portfolio will appear here as they are published."
          />
        ) : (
          <div className="divide-y divide-border/60">
            {notices.map((row) => (
              <Link key={row.id} href={`/landlord/notices#${row.id}`} className="block px-5 py-4 hover:bg-[color:var(--muted)]/35">
                <div className="font-medium text-foreground">{row.subject}</div>
                <div className="mt-1 text-sm text-muted-foreground">{row.body}</div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
