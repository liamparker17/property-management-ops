import { PropertyForm } from '@/components/forms/property-form';

export default function NewPropertyPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New property</h1>
      <PropertyForm mode="create" />
    </div>
  );
}
