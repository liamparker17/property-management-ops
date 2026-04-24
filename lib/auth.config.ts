import type { NextAuthConfig } from 'next-auth';
import type { Role } from '@prisma/client';

/**
 * Edge-compatible NextAuth config (no Node.js deps like bcrypt/prisma).
 * Used by middleware.ts for JWT verification and route protection.
 * Full provider config lives in auth.ts.
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: 'jwt' as const },
  pages: { signIn: '/login' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = (user as { id: string }).id;
        token.role = (user as { id: string; role: Role }).role;
        token.orgId = (user as { orgId: string }).orgId;
        token.landlordId = (user as { landlordId?: string | null }).landlordId ?? null;
        token.managingAgentId = (user as { managingAgentId?: string | null }).managingAgentId ?? null;
        token.smsOptIn = (user as { smsOptIn?: boolean | null }).smsOptIn ?? false;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.userId;
        session.user.role = token.role;
        session.user.orgId = token.orgId;
        session.user.landlordId = token.landlordId ?? null;
        session.user.managingAgentId = token.managingAgentId ?? null;
        session.user.smsOptIn = token.smsOptIn ?? false;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
