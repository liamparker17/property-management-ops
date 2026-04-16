import { redirect } from 'next/navigation';
import { auth, signOut } from '@/lib/auth';
import { StaffNav } from '@/components/nav/staff-nav';

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');
  if (session.user.role === 'TENANT') redirect('/tenant');

  return (
    <div className="min-h-screen">
      <StaffNav
        email={session.user.email ?? ''}
        role={session.user.role}
        signOut={async () => {
          'use server';
          await signOut({ redirectTo: '/login' });
        }}
      />
      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}
