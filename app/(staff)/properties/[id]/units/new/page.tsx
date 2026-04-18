import { UnitForm } from '@/components/forms/unit-form';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';

export default async function NewUnitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Property" title="New unit" description="Add a unit to this property." />
      <Card className="max-w-3xl">
        <CardContent className="p-6">
          <UnitForm propertyId={id} />
        </CardContent>
      </Card>
    </div>
  );
}
