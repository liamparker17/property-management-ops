import { auth } from '@/lib/auth';
import { ChangePasswordForm } from '@/components/forms/change-password-form';

export default async function ProfilePage() {
  const session = await auth();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My profile</h1>
      <dl className="grid max-w-md grid-cols-[auto,1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Email</dt>
        <dd>{session?.user.email}</dd>
        <dt className="text-muted-foreground">Role</dt>
        <dd>{session?.user.role}</dd>
      </dl>
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Change password</h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
