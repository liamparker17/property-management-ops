## Phase C — Auth & infra

**Per-task convention:** run `npm run typecheck` after each task, then commit with the message noted at the end of the task.

### Task 7: Error contract + shared helpers

```ts
// lib/errors.ts
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'INTERNAL';

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }

  static unauthorized(message = 'Not authenticated') {
    return new ApiError('UNAUTHORIZED', message, 401);
  }
  static forbidden(message = 'Forbidden') {
    return new ApiError('FORBIDDEN', message, 403);
  }
  static notFound(message = 'Not found') {
    return new ApiError('NOT_FOUND', message, 404);
  }
  static validation(details: unknown, message = 'Validation failed') {
    return new ApiError('VALIDATION_ERROR', message, 422, details);
  }
  static conflict(message: string, details?: unknown) {
    return new ApiError('CONFLICT', message, 409, details);
  }
  static internal(message = 'Internal error') {
    return new ApiError('INTERNAL', message, 500);
  }
}

export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, details: err.details ?? undefined } },
      { status: err.status },
    );
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: err.flatten() } },
      { status: 422 },
    );
  }
  console.error('[api] unhandled error', err);
  return NextResponse.json(
    { error: { code: 'INTERNAL', message: 'Internal error' } },
    { status: 500 },
  );
}
```

**Commit:** `feat(api): error contract helpers`

---

### Task 8: NextAuth v5 config + session types

- [ ] **Step 1: Augment NextAuth types**

```ts
// types/next-auth.d.ts
import type { Role } from '@prisma/client';
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      role: Role;
      orgId: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    role: Role;
    orgId: string;
  }
}
```

- [ ] **Step 2: NextAuth config**

```ts
// lib/auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const user = await db.user.findUnique({ where: { email } });
        if (!user || user.disabledAt) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          orgId: user.orgId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = (user as { id: string }).id;
        token.role = (user as { role: 'ADMIN' | 'PROPERTY_MANAGER' | 'FINANCE' | 'TENANT' }).role;
        token.orgId = (user as { orgId: string }).orgId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.userId;
        session.user.role = token.role;
        session.user.orgId = token.orgId;
      }
      return session;
    },
  },
});
```

- [ ] **Step 3: Route handler**

```ts
// app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
```

**Commit:** `feat(auth): NextAuth v5 credentials + JWT session w/ orgId+role`

---

### Task 9: `withOrg` API wrapper

```ts
// lib/auth/with-org.ts
import type { NextRequest, NextResponse } from 'next/server';
import type { Role } from '@prisma/client';
import { auth } from '@/lib/auth';
import { ApiError, toErrorResponse } from '@/lib/errors';

export type RouteCtx = {
  orgId: string;
  userId: string;
  role: Role;
};

type Handler<P> = (
  req: NextRequest,
  ctx: RouteCtx,
  params: P,
) => Promise<NextResponse> | NextResponse;

type RouteParams<P> = { params: Promise<P> };

export function withOrg<P = Record<string, string>>(
  handler: Handler<P>,
  opts?: { requireRole?: Role[] },
) {
  return async (req: NextRequest, routeParams: RouteParams<P>) => {
    try {
      const session = await auth();
      if (!session?.user) throw ApiError.unauthorized();
      if (opts?.requireRole && !opts.requireRole.includes(session.user.role)) {
        throw ApiError.forbidden();
      }
      const ctx: RouteCtx = {
        orgId: session.user.orgId,
        userId: session.user.id,
        role: session.user.role,
      };
      const params = (await routeParams.params) as P;
      return await handler(req, ctx, params);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}
```

**Commit:** `feat(auth): withOrg wrapper for API routes`

---

### Task 10: `proxy.ts` middleware

Next.js 16 replaces `middleware.ts` with `proxy.ts` at the repo root.

```ts
// proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { Role } from '@prisma/client';

const PUBLIC_PATHS = ['/', '/login', '/api/auth'];
const STAFF_ROLES: Role[] = ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'];

function isPublic(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith('/api/auth')) return true;
  if (pathname.startsWith('/_next')) return true;
  if (pathname.startsWith('/favicon')) return true;
  return false;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const token = (await getToken({ req, secret: process.env.NEXTAUTH_SECRET })) as
    | { role?: Role }
    | null;

  if (!token) {
    const url = new URL('/login', req.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  const role = token.role;
  const isStaffArea =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/properties') ||
    pathname.startsWith('/units') ||
    pathname.startsWith('/tenants') ||
    pathname.startsWith('/leases') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/profile');
  const isTenantArea = pathname.startsWith('/tenant');
  const isAdminArea = pathname.startsWith('/settings');

  if (isStaffArea && (!role || !STAFF_ROLES.includes(role))) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (isTenantArea && role !== 'TENANT') {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (isAdminArea && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

**Commit:** `feat(auth): proxy middleware enforcing route-group roles`

---
