import { TenantForm } from '@/components/forms/tenant-form';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';

export default function NewTenantPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Tenants" title="New tenant" description="Add a tenant record without creating a lease." />
      <Card className="max-w-3xl">
        <CardContent className="p-6">
          <TenantForm />
        </CardContent>
      </Card>
    </div>
  );
}
