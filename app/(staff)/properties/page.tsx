import Link from 'next/link';
import { Building2, Plus } from 'lucide-react';
import { auth } from '@/lib/auth';
import { listProperties } from '@/lib/services/properties';

export default async function PropertiesPage() {
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  const rows = await listProperties(ctx);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Properties</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} {rows.length === 1 ? 'property' : 'properties'} in your portfolio.
          </p>
        </div>
        <Link
          href="/properties/new"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New property
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 p-12 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No properties yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add your first property to get started.</p>
          <Link
            href="/properties/new"
            className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New property
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Units</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <Link href={`/properties/${p.id}`} className="font-medium hover:text-primary">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.city}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p._count.units}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
