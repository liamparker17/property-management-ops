import { Mail, ShieldCheck, KeyRound } from 'lucide-react';

import { auth } from '@/lib/auth';
import { ChangePasswordForm } from '@/components/forms/change-password-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';

function initials(email: string) {
  return email.split('@')[0]?.slice(0, 2).toUpperCase() || 'PM';
}

export default async function ProfilePage() {
  const session = await auth();
  const email = session?.user.email ?? '';
  const role = session?.user.role ?? '';

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Account" title="My profile" description="Your account details and security." />

      <Card className="max-w-2xl">
        <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-xl font-semibold text-primary-foreground shadow-md">
            {initials(email)}
          </div>
          <div className="grid flex-1 gap-3 text-sm sm:grid-cols-2">
            <Detail icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={email} />
            <Detail icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Role" value={role} />
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

function Detail({
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
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}
