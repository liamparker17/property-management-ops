import Link from 'next/link';
import { auth } from '@/lib/auth';
import { listProperties } from '@/lib/services/properties';

export default async function PropertiesPage() {
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  const rows = await listProperties(ctx);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Properties</h1>
        <Link href="/properties/new" className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">
          New property
        </Link>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead className="border-b text-left">
          <tr>
            <th className="p-2">Name</th>
            <th className="p-2">City</th>
            <th className="p-2">Units</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-b hover:bg-gray-50">
              <td className="p-2">
                <Link href={`/properties/${p.id}`} className="font-medium hover:underline">
                  {p.name}
                </Link>
              </td>
              <td className="p-2">{p.city}</td>
              <td className="p-2">{p._count.units}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
