import { auth, signOut } from '@/lib/auth';
import { TenantSidebar } from '@/components/nav/tenant-sidebar';
import { TopBar } from '@/components/nav/top-bar';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== 'TENANT') redirect('/login');

  return (
    <div className="flex min-h-screen">
      <TenantSidebar />
      <div className="flex flex-1 flex-col">
        <TopBar
          email={session.user.email ?? ''}
          signOut={async () => {
            'use server';
            await signOut({ redirectTo: '/login' });
          }}
        />
        <main className="flex-1 overflow-auto p-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
