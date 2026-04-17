import { Mail, Phone, User } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getTenantProfile } from '@/lib/services/tenant-portal';
import { ChangePasswordForm } from '@/components/forms/change-password-form';

export default async function TenantProfilePage() {
  const session = await auth();
  const tenant = await getTenantProfile(session!.user.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your account details and security settings.
        </p>
      </div>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold">Contact information</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Managed by your property manager. Contact them to request changes.
        </p>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <InfoItem
            icon={User}
            label="Name"
            value={`${tenant.firstName} ${tenant.lastName}`}
          />
          <InfoItem icon={Mail} label="Email" value={tenant.email ?? '—'} />
          <InfoItem icon={Phone} label="Phone" value={tenant.phone ?? '—'} />
        </dl>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold">Change password</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Use a strong password that you don&rsquo;t use anywhere else.
        </p>
        <div className="mt-5 max-w-md">
          <ChangePasswordForm />
        </div>
      </section>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </dt>
      <dd className="mt-1.5 text-sm font-medium">{value}</dd>
    </div>
  );
}
