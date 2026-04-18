import { auth, signOut } from '@/lib/auth';
import { DesktopTenantSidebar } from '@/components/nav/tenant-sidebar';
import { TopBar } from '@/components/nav/top-bar';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== 'TENANT') redirect('/login');

  const email = session.user.email ?? '';

  return (
    <div className="flex min-h-screen bg-background">
      <DesktopTenantSidebar email={email} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          email={email}
          variant="tenant"
          signOut={async () => {
            'use server';
            await signOut({ redirectTo: '/login' });
          }}
        />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-5xl animate-fade-in-up px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
