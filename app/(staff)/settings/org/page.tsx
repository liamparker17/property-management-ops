import { Building2 } from 'lucide-react';

import { auth } from '@/lib/auth';
import { getOrg } from '@/lib/services/team';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';

import { OrgForm } from './org-form';

export default async function OrgSettingsPage() {
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  const org = await getOrg(ctx);
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Settings" title="Organisation" description="Workspace name and lease defaults." />

      <Card className="max-w-xl">
        <CardHeader className="flex-row items-center gap-2.5 space-y-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <CardTitle className="text-base">Organisation details</CardTitle>
        </CardHeader>
        <CardContent>
          <OrgForm
            initial={{
              name: org.name,
              expiringWindowDays: org.expiringWindowDays,
              ownerType: org.ownerType,
              landlordApprovalThresholdCents: org.landlordApprovalThresholdCents,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
