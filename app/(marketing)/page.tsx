import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Property Management Ops</h1>
      <p className="text-muted-foreground">Manage properties, units, tenants, and leases.</p>
      <Link
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
        href="/login"
      >
        Sign in
      </Link>
    </main>
  );
}
