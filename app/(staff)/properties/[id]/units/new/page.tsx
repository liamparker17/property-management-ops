import { UnitForm } from '@/components/forms/unit-form';

export default async function NewUnitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New unit</h1>
      <UnitForm propertyId={id} />
    </div>
  );
}
