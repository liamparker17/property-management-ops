import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getProperty } from '@/lib/services/properties';
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{property.name}</h1>
          <p className="text-sm text-muted-foreground">
            {property.addressLine1}
            {property.addressLine2 ? `, ${property.addressLine2}` : ''} · {property.suburb},{' '}
            {property.city}, {property.province} {property.postalCode}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/properties/${id}/edit`} className="rounded-md border px-3 py-1.5 text-sm">
            Edit
          </Link>
          {session!.user.role === 'ADMIN' && <DeletePropertyButton id={id} />}
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Units</h2>
          <Link
            href={`/properties/${id}/units/new`}
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
          >
            Add unit
          </Link>
        </div>
        <table className="w-full border-collapse text-sm">
          <thead className="border-b text-left">
            <tr>
              <th className="p-2">Label</th>
              <th className="p-2">Beds</th>
              <th className="p-2">Baths</th>
            </tr>
          </thead>
          <tbody>
            {property.units.map((u) => (
              <tr key={u.id} className="border-b hover:bg-gray-50">
                <td className="p-2">
                  <Link href={`/units/${u.id}`} className="font-medium hover:underline">
                    {u.label}
                  </Link>
                </td>
                <td className="p-2">{u.bedrooms}</td>
                <td className="p-2">{u.bathrooms}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
