import { auth } from '@/lib/auth';
import { getOrg } from '@/lib/services/team';
import { OrgForm } from './org-form';

export default async function OrgSettingsPage() {
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  const org = await getOrg(ctx);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Organization</h1>
      <OrgForm initial={{ name: org.name, expiringWindowDays: org.expiringWindowDays }} />
    </div>
  );
}
