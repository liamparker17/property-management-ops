import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== 'TENANT') redirect('/login');
  return <div className="min-h-screen p-8">{children}</div>;
}
