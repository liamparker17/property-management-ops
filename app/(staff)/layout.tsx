import { auth, signOut } from '@/lib/auth';
import { Sidebar } from '@/components/nav/sidebar';
import { TopBar } from '@/components/nav/top-bar';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');
  if (session.user.role === 'TENANT') redirect('/tenant');

  return (
    <div className="flex min-h-screen">
      <Sidebar role={session.user.role} />
      <div className="flex flex-1 flex-col">
        <TopBar
          email={session.user.email ?? ''}
          signOut={async () => {
            'use server';
            await signOut({ redirectTo: '/login' });
          }}
        />
        <main className="flex-1 overflow-auto p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
