import { notFound } from 'next/navigation';

import { auth } from '@/lib/auth';
import { getProperty } from '@/lib/services/properties';
import { PropertyForm } from '@/components/forms/property-form';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';

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
      <PageHeader eyebrow="Property" title={`Edit ${p.name}`} description="Update the property details." />
      <Card className="max-w-3xl">
        <CardContent className="p-6">
          <PropertyForm mode="edit" initial={p} />
        </CardContent>
      </Card>
    </div>
  );
}
