import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { BillingRunPeriodForm } from './period-form';

export default async function NewBillingRunPage() {
  const session = await auth();
  if (!session) redirect('/login');
  const role = session.user.role;
  if (role === 'TENANT' || role === 'LANDLORD' || role === 'MANAGING_AGENT') {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Finance"
        title="Generate billing run"
        description="Pick the month you want to bill. Active leases will be charged rent plus any metered utility line items."
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Period</CardTitle>
          <CardDescription>Invoices are created in DRAFT and grouped under the run until published.</CardDescription>
        </CardHeader>
        <CardContent>
          <BillingRunPeriodForm />
        </CardContent>
      </Card>
    </div>
  );
}
