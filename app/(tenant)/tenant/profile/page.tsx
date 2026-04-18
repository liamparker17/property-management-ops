import { Mail, Phone, User, KeyRound, IdCard } from 'lucide-react';

import { auth } from '@/lib/auth';
import { getTenantProfile } from '@/lib/services/tenant-portal';
import { ChangePasswordForm } from '@/components/forms/change-password-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export default async function TenantProfilePage() {
  const session = await auth();
  const tenant = await getTenantProfile(session!.user.id);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Your account details and security settings."
      />

      <Card>
        <CardHeader className="flex-row items-center gap-2.5 space-y-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <IdCard className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">Contact information</CardTitle>
            <p className="text-xs text-muted-foreground">
              Managed by your property manager. Contact them to request changes.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-xl font-semibold text-primary-foreground shadow-md">
              {initials(tenant.firstName, tenant.lastName)}
            </div>
            <dl className="grid flex-1 gap-3 sm:grid-cols-3">
              <InfoItem icon={<User className="h-3.5 w-3.5" />} label="Name" value={`${tenant.firstName} ${tenant.lastName}`} />
              <InfoItem icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={tenant.email ?? '—'} />
              <InfoItem icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={tenant.phone ?? '—'} />
            </dl>
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-md">
        <CardHeader className="flex-row items-center gap-2.5 space-y-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">Change password</CardTitle>
            <p className="text-xs text-muted-foreground">Use a strong password you don&rsquo;t reuse.</p>
          </div>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
