import Link from 'next/link';
import { Building2, Plus, MapPin, Home as HomeIcon, ArrowUpRight } from 'lucide-react';

import { auth } from '@/lib/auth';
import { listProperties } from '@/lib/services/properties';
import { Card } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { cn } from '@/lib/utils';

export default async function PropertiesPage() {
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  const rows = await listProperties(ctx);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Portfolio"
        title="Properties"
        description={`${rows.length} ${rows.length === 1 ? 'property' : 'properties'} in your portfolio.`}
        actions={
          <Link href="/properties/new" className={cn(buttonVariants(), 'gap-1.5')}>
            <Plus className="h-4 w-4" />
            New property
          </Link>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-5" />}
          title="No properties yet"
          description="Add your first property to start tracking units and tenants."
          action={
            <Link href="/properties/new" className={cn(buttonVariants(), 'gap-1.5')}>
              <Plus className="h-4 w-4" />
              New property
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p) => (
            <Link key={p.id} href={`/properties/${p.id}`} className="group block">
              <Card className="relative h-full overflow-hidden p-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated">
                <div className="flex items-start justify-between p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground/60 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
                </div>
                <div className="space-y-2 px-5 pb-5">
                  <h3 className="text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                    {p.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {p.city}
                  </div>
                  <div className="flex items-center gap-1.5 pt-1.5 text-xs text-muted-foreground">
                    <HomeIcon className="h-3.5 w-3.5" />
                    <span className="font-medium text-foreground">{p._count.units}</span>
                    {p._count.units === 1 ? 'unit' : 'units'}
                  </div>
                </div>
                <div
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
                />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
