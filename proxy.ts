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
