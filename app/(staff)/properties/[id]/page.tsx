import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Plus, MapPin, Building2, Bed, Bath, ArrowUpRight } from 'lucide-react';

import { auth } from '@/lib/auth';
import { getProperty } from '@/lib/services/properties';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { cn } from '@/lib/utils';

import { DeletePropertyButton } from './delete-button';

export default async function PropertyDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  let property;
  try {
    property = await getProperty(ctx, id);
  } catch {
    notFound();
  }

  const fullAddress = [
    property.addressLine1,
    property.addressLine2,
    `${property.suburb}, ${property.city}, ${property.province} ${property.postalCode}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Property"
        title={property.name}
        description={
          <span className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {fullAddress}
          </span>
        }
        actions={
          <>
            <Link href={`/properties/${id}/edit`} className={cn(buttonVariants({ variant: 'outline' }))}>
              Edit
            </Link>
            {session!.user.role === 'ADMIN' && <DeletePropertyButton id={id} />}
          </>
        }
      />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Units</h2>
            <p className="text-sm text-muted-foreground">
              {property.units.length} {property.units.length === 1 ? 'unit' : 'units'} in this property.
            </p>
          </div>
          <Link
            href={`/properties/${id}/units/new`}
            className={cn(buttonVariants(), 'gap-1.5')}
          >
            <Plus className="h-4 w-4" />
            Add unit
          </Link>
        </div>

        {property.units.length === 0 ? (
          <EmptyState
            icon={<Building2 className="size-5" />}
            title="No units yet"
            description="Add a unit to this property to start tracking leases."
            action={
              <Link href={`/properties/${id}/units/new`} className={cn(buttonVariants(), 'gap-1.5')}>
                <Plus className="h-4 w-4" />
                Add unit
              </Link>
            }
          />
        ) : (
          <Card className="overflow-hidden p-0">
            <CardHeader className="border-b border-border/60 bg-muted/30 px-4 py-3 [.border-b]:pb-3">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Label · Beds · Baths
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <ul className="divide-y divide-border/60">
                {property.units.map((u) => (
                  <li key={u.id}>
                    <Link
                      href={`/units/${u.id}`}
                      className="group flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-foreground transition-colors group-hover:text-primary">
                          {u.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Bed className="h-3.5 w-3.5" />
                          {u.bedrooms}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Bath className="h-3.5 w-3.5" />
                          {u.bathrooms}
                        </span>
                        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/60 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
