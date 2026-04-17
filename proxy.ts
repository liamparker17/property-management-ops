import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import type { Role } from '@prisma/client';
import { authConfig } from './lib/auth.config';

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ['/', '/login'];
const STAFF_ROLES: Role[] = ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'];

function isPublic(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith('/api/auth')) return true;
  if (pathname.startsWith('/_next')) return true;
  if (pathname.startsWith('/favicon')) return true;
  return false;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const session = req.auth;
  if (!session) {
    const url = new URL('/login', req.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  const role = session.user?.role as Role | undefined;
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
    return NextResponse.redirect(new URL('/tenant', req.url));
  }
  if (isTenantArea && role !== 'TENANT') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  if (isAdminArea && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
