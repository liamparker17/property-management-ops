import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PaymentCsvImportForm } from '@/components/forms/payment-csv-import-form';

export default async function PaymentsImportPage() {
  const session = await auth();
  if (!session) redirect('/login');
  const role = session.user.role;
  if (role !== 'ADMIN' && role !== 'PROPERTY_MANAGER' && role !== 'FINANCE') {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Payments"
        title="Import receipts"
        description="Upload a CSV export from your bank to record incoming payments when QuickBooks is unavailable."
      />
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle className="text-base">CSV upload</CardTitle>
          <CardDescription>
            Preview the first rows before committing. Generic dialect is supported; bank-specific dialects land in M4.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentCsvImportForm />
        </CardContent>
      </Card>
    </div>
  );
}
