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
      landlordId: string | null;
      managingAgentId: string | null;
      smsOptIn: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    role: Role;
    orgId: string;
    landlordId: string | null;
    managingAgentId: string | null;
    smsOptIn: boolean;
  }
}
