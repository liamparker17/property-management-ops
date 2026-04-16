import Link from 'next/link';

type Props = {
  email: string;
  role: string;
  signOut: () => Promise<void>;
};

export function StaffNav({ email, role, signOut }: Props) {
  return (
    <header className="border-b bg-white">
      <nav className="mx-auto flex max-w-6xl items-center gap-6 p-4 text-sm">
        <Link href="/dashboard" className="font-semibold">PMO</Link>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/properties">Properties</Link>
        <Link href="/tenants">Tenants</Link>
        <Link href="/leases">Leases</Link>
        {role === 'ADMIN' && <Link href="/settings/team">Settings</Link>}
        <div className="ml-auto flex items-center gap-4">
          <Link href="/profile" className="text-muted-foreground">{email}</Link>
          <form action={signOut}>
            <button type="submit" className="text-muted-foreground hover:underline">
              Sign out
            </button>
          </form>
        </div>
      </nav>
    </header>
  );
}
