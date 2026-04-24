import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { db } from '@/lib/db';
import { getNotice } from '@/lib/services/area-notices';
import { markNotificationRead } from '@/lib/services/notifications';

export default async function TenantNoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  const notification = await db.notification.findFirst({
    where: { id, orgId: ctx.orgId, userId: ctx.user!.id },
  });
  if (!notification) notFound();
  await markNotificationRead(ctx, id);
  const payload = (notification.payload ?? {}) as { noticeId?: string };
  const notice = payload.noticeId ? await getNotice(ctx, payload.noticeId) : null;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Tenant Portal" title={notification.subject} description="Full notice detail and delivery context." />
      <Card className="border border-border p-5">
        <div className="prose prose-sm max-w-none text-muted-foreground">
          <p>{notice?.body ?? notification.body}</p>
        </div>
      </Card>
    </div>
  );
}
