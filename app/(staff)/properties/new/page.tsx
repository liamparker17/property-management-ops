import { PropertyForm } from '@/components/forms/property-form';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';

export default function NewPropertyPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Properties" title="New property" description="Add a property to your portfolio." />
      <Card className="max-w-3xl">
        <CardContent className="p-6">
          <PropertyForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
