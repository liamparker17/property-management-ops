import { VendorForm } from '@/components/forms/vendor-form';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';

export default function NewVendorPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Vendors" title="Add vendor" description="Register a new maintenance contractor." />
      <Card className="max-w-3xl">
        <CardContent className="p-6">
          <VendorForm />
        </CardContent>
      </Card>
    </div>
  );
}
