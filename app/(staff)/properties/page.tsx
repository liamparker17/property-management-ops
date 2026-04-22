import Link from 'next/link';
import { ArrowUpRight, Building2, Home as HomeIcon, MapPin, Plus } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { listProperties } from '@/lib/services/properties';
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
          <Link
            href="/properties/new"
            className={cn(buttonVariants(), 'gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em]')}
          >
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
            <Link
              href="/properties/new"
              className={cn(buttonVariants(), 'gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em]')}
            >
              <Plus className="h-4 w-4" />
              New property
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((property) => (
            <Link key={property.id} href={`/properties/${property.id}`} className="group block">
              <Card className="relative h-full overflow-hidden border border-border p-0 transition-colors duration-200 hover:bg-[color:var(--muted)]/40">
                <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-[color:var(--accent)] opacity-70" />
                <div className="flex items-start justify-between p-5">
                  <div className="flex h-11 w-11 items-center justify-center border border-[color:var(--accent)]/25 text-[color:var(--accent)]">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground/55 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[color:var(--accent)]" />
                </div>
                <div className="space-y-3 px-5 pb-5">
                  <h3 className="font-serif text-[28px] font-light leading-[1.05] tracking-[-0.01em] text-foreground transition-colors group-hover:text-[color:var(--accent)]">
                    {property.name}
                  </h3>
                  <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {property.city}
                  </div>
                  <div className="flex items-center gap-1.5 border-t border-border/70 pt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    <HomeIcon className="h-3.5 w-3.5" />
                    <span className="text-foreground">{property._count.units}</span>
                    {property._count.units === 1 ? 'unit' : 'units'}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
