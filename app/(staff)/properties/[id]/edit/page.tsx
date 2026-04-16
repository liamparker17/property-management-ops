import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getProperty } from '@/lib/services/properties';
import { PropertyForm } from '@/components/forms/property-form';

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  let p;
  try {
    p = await getProperty(ctx, id);
  } catch {
    notFound();
  }
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit property</h1>
      <PropertyForm mode="edit" initial={p} />
    </div>
  );
}
