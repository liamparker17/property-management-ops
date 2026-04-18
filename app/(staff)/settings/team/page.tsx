import { UserPlus, Users } from 'lucide-react';

import { auth } from '@/lib/auth';
import { listTeam } from '@/lib/services/team';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';

import { NewUserForm } from './new-user-form';
import { TeamRow } from './team-row';

export default async function TeamSettingsPage() {
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  const users = await listTeam(ctx);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Team"
        description="Add staff and manage their access to the workspace."
      />

      <Card className="max-w-3xl">
        <CardHeader className="flex-row items-center gap-2.5 space-y-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UserPlus className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">Create staff account</CardTitle>
            <p className="text-xs text-muted-foreground">
              Set a temporary password — the user can change it after first login.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <NewUserForm />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Members</h2>
          <p className="text-sm text-muted-foreground">
            {users.length} {users.length === 1 ? 'member' : 'members'} in your workspace.
          </p>
        </div>
        {users.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" />}
            title="No team members yet"
            description="Create your first staff account above."
          />
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {users.map((u) => (
                    <TeamRow key={u.id} row={u} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
