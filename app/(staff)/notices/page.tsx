import Link from 'next/link';

import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { listNotices } from '@/lib/services/area-notices';
import { cn } from '@/lib/utils';

export default async function StaffNoticesPage() {
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  const rows = await listNotices(ctx);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Notices"
        description="Draft and published area notices, with audience and delivery visibility."
        actions={
          <Link
            href="/notices/new"
            className={cn(buttonVariants({ variant: 'outline' }), 'font-mono text-[10px] uppercase tracking-[0.16em]')}
          >
            Compose notice
          </Link>
        }
      />

      <Card className="overflow-hidden border border-border p-0">
        <div className="divide-y divide-border/60">
          {rows.map((row) => (
            <Link key={row.id} href={`/notices/${row.id}`} className="block px-5 py-4 hover:bg-[color:var(--muted)]/35">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-foreground">{row.title}</div>
                  <div className="text-sm text-muted-foreground">{row.type} · {row.body.slice(0, 140)}</div>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--accent)]">
                  {row.publishedAt ? 'Published' : 'Draft'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
