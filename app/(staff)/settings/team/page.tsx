import { auth } from '@/lib/auth';
import { listTeam } from '@/lib/services/team';
import { NewUserForm } from './new-user-form';
import { TeamRow } from './team-row';

export default async function TeamSettingsPage() {
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  const users = await listTeam(ctx);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Team</h1>
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Create staff account</h2>
        <p className="text-xs text-muted-foreground">
          No email invitation flow in Slice 1. Enter a temporary password; the user can change it after first login.
        </p>
        <NewUserForm />
      </section>
      <section>
        <table className="w-full border-collapse text-sm">
          <thead className="border-b text-left">
            <tr>
              <th className="p-2">Email</th>
              <th className="p-2">Name</th>
              <th className="p-2">Role</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <TeamRow key={u.id} row={u} />
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
