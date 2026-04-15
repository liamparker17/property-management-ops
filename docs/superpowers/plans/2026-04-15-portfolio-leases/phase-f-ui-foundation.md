## Phase F — UI foundation

**Per-task convention:** run `npm run typecheck` after each task, then commit with the message noted at the end of the task.

UI in Slice 1 is pragmatic, not pretty. Server components fetch directly via services; client components only for forms and interactive bits. All forms use native `<form action={serverAction}>` where possible to avoid a client-side fetch layer.

### Task 22: Tailwind + shadcn/ui init + root layout

- [ ] **Step 1: Initialize shadcn/ui**

```bash
npx shadcn@latest init -d
```

When prompted: New York style, Slate base color, CSS variables yes.

```bash
npx shadcn@latest add button input label select badge card dialog table textarea checkbox form
```

- [ ] **Step 3: Root layout**

```tsx
// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Property Management Ops',
  description: 'Portfolio, tenants, and leases',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Root page redirect**

```tsx
// app/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function RootPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if (session.user.role === 'TENANT') redirect('/tenant');
  redirect('/dashboard');
}
```

**Commit:** `chore(ui): shadcn init + root layout`

---

### Task 23: Marketing + login page

- [ ] **Step 1: Marketing shell**

```tsx
// app/(marketing)/layout.tsx
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen">{children}</div>;
}
```

```tsx
// app/(marketing)/page.tsx
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
```

- [ ] **Step 2: Login form (client)**

```tsx
// components/login-form.tsx
'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const from = search.get('from') ?? '/dashboard';
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await signIn('credentials', {
      email: form.get('email'),
      password: form.get('password'),
      redirect: false,
    });
    setPending(false);
    if (res?.error) {
      setError('Invalid email or password');
      return;
    }
    router.push(from);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          name="email"
          type="email"
          required
          className="rounded-md border px-3 py-2"
          autoComplete="email"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Password
        <input
          name="password"
          type="password"
          required
          className="rounded-md border px-3 py-2"
          autoComplete="current-password"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
```

Install the React adapter for NextAuth client helpers:

```bash
npm install next-auth@5.0.0-beta.30
```

(Already installed in Task 1; skip if listed.) Then add the session provider.

```tsx
// app/providers.tsx
'use client';
import { SessionProvider } from 'next-auth/react';
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

Wrap it in the root layout:

```tsx
// app/layout.tsx  (update body)
import { Providers } from './providers';
// ...
<body className="min-h-screen bg-background text-foreground antialiased">
  <Providers>{children}</Providers>
</body>
```

- [ ] **Step 3: Login page**

```tsx
// app/(marketing)/login/page.tsx
import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <LoginForm />
    </main>
  );
}
```

**Commit:** `feat(ui): marketing landing + login`

---

### Task 24: Staff layout + nav + tenant shell + profile

- [ ] **Step 1: Staff layout + nav**

```tsx
// app/(staff)/layout.tsx
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
        email={session.user.email}
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
```

```tsx
// components/nav/staff-nav.tsx
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
```

- [ ] **Step 2: Tenant shell**

```tsx
// app/(tenant)/layout.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== 'TENANT') redirect('/login');
  return <div className="min-h-screen p-8">{children}</div>;
}
```

```tsx
// app/(tenant)/page.tsx
export default function TenantHome() {
  return (
    <main className="mx-auto max-w-md text-center">
      <h1 className="text-2xl font-semibold">Welcome</h1>
      <p className="mt-2 text-muted-foreground">
        The tenant portal is coming soon (Slice 3).
      </p>
    </main>
  );
}
```

- [ ] **Step 3: Profile page + change-password form**

```tsx
// components/forms/change-password-form.tsx
'use client';

import { useState } from 'react';

export function ChangePasswordForm() {
  const [status, setStatus] = useState<null | { ok: boolean; message: string }>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/profile/password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        currentPassword: form.get('currentPassword'),
        newPassword: form.get('newPassword'),
      }),
    });
    const json = await res.json();
    if (res.ok) {
      setStatus({ ok: true, message: 'Password updated' });
      (e.target as HTMLFormElement).reset();
    } else {
      setStatus({ ok: false, message: json.error?.message ?? 'Failed' });
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-sm flex-col gap-3 text-sm">
      <label className="flex flex-col gap-1">
        Current password
        <input name="currentPassword" type="password" required className="rounded-md border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        New password
        <input name="newPassword" type="password" required minLength={8} className="rounded-md border px-3 py-2" />
      </label>
      {status && (
        <p className={status.ok ? 'text-green-600' : 'text-red-600'}>{status.message}</p>
      )}
      <button type="submit" className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
        Change password
      </button>
    </form>
  );
}
```

```tsx
// app/(staff)/profile/page.tsx
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
```

**Commit:** `feat(ui): staff layout + nav, tenant shell, profile page`

---
