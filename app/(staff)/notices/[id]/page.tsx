import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { dispatchNotice, getNotice, publishNotice } from '@/lib/services/area-notices';

export default async function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  const notice = await getNotice(ctx, id);

  async function publishAction() {
    'use server';
    const freshSession = await auth();
    const freshCtx = userToRouteCtx(freshSession!.user);
    await publishNotice(freshCtx, id);
    redirect(`/notices/${id}`);
  }

  async function dispatchAction() {
    'use server';
    const freshSession = await auth();
    const freshCtx = userToRouteCtx(freshSession!.user);
    await dispatchNotice(freshCtx, id);
    redirect(`/notices/${id}`);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title={notice.title}
        description={`${notice.type} notice`}
        actions={
          <>
            {!notice.publishedAt ? (
              <form action={publishAction}>
                <Button type="submit">Publish</Button>
              </form>
            ) : null}
            <form action={dispatchAction}>
              <Button type="submit" variant="outline">Dispatch again</Button>
            </form>
          </>
        }
      />

      <Card className="border border-border p-5">
        <div className="prose prose-sm max-w-none text-muted-foreground">
          <p>{notice.body}</p>
        </div>
      </Card>

      <Card className="overflow-hidden border border-border p-0">
        <div className="border-b border-border/70 px-5 py-4">
          <h2 className="font-serif text-[26px] font-light text-foreground">Delivery audit</h2>
        </div>
        {notice.deliveries.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            {notice.publishedAt
              ? 'No deliveries recorded yet. Use "Dispatch again" above to fan out to the resolved audience.'
              : 'No deliveries yet — publish the notice to fan it out to the resolved audience.'}
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {notice.deliveries.map((row) => (
              <div key={row.id} className="px-5 py-4">
                <div className="font-medium text-foreground">{row.user.email ?? row.user.id}</div>
                <div className="text-xs text-muted-foreground">{row.channel} · {row.status}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
