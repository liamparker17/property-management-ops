import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { listNotificationsForUser } from '@/lib/services/notifications';

export default async function AgentNoticesPage() {
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  const rows = (await listNotificationsForUser(ctx)).filter((row) => row.type === 'AREA_NOTICE');

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Agent Portal" title="Notices" description="Area notices routed to your assigned properties and teams." />
      <Card className="overflow-hidden border border-border p-0">
        <div className="divide-y divide-border/60">
          {rows.map((row) => (
            <div key={row.id} className="px-5 py-4">
              <div className="font-medium text-foreground">{row.subject}</div>
              <div className="text-sm text-muted-foreground">{row.body}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
