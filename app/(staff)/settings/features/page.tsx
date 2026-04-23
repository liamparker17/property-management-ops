import { SlidersHorizontal } from 'lucide-react';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { FeatureFlagsForm } from './feature-flags-form';

export default async function FeatureSettingsPage() {
  const session = await auth();

  if (!session) redirect('/login');
  if (session.user.role !== 'ADMIN') redirect('/dashboard');

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Features"
        description="Enable workspace modules when the operational workflows behind them are ready to go live."
      />

      <Card className="max-w-4xl">
        <CardHeader className="flex-row items-center gap-2.5 space-y-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">Workspace modules</CardTitle>
            <CardDescription>
              Feature flags stay off by default and can be switched on as each module is rolled out.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <FeatureFlagsForm />
        </CardContent>
      </Card>
    </div>
  );
}
