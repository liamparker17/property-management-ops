import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { formatDate } from '@/lib/format';

type Params = { id: string };

export const GET = withOrg<Params>(
  async (_req, ctx, { id }) => {
    const statement = await db.statement.findFirst({
      where: { id, orgId: ctx.orgId },
      select: {
        id: true,
        storageKey: true,
        periodStart: true,
        periodEnd: true,
        subjectType: true,
        subjectId: true,
      },
    });
    if (!statement) throw ApiError.notFound('Statement not found');
    if (!statement.storageKey) throw ApiError.notFound('Statement PDF not generated');

    if (ctx.role === 'LANDLORD') {
      const user = await db.user.findUnique({ where: { id: ctx.userId }, select: { landlordId: true } });
      const landlordScope = user?.landlordId;
      if (!landlordScope) throw ApiError.forbidden('Landlord account is not linked');
      if (statement.subjectType !== 'Landlord' || statement.subjectId !== landlordScope) {
        throw ApiError.forbidden('Statement is not available to this account');
      }
    } else if (ctx.role === 'TENANT') {
      const tenant = await db.tenant.findFirst({ where: { userId: ctx.userId, orgId: ctx.orgId }, select: { id: true } });
      if (!tenant) throw ApiError.forbidden('Tenant account is not linked');
      if (statement.subjectType !== 'Tenant' || statement.subjectId !== tenant.id) {
        throw ApiError.forbidden('Statement is not available to this account');
      }
    }

    const blobUrl = statement.storageKey.startsWith('http')
      ? statement.storageKey
      : `https://blob.vercel-storage.com/${statement.storageKey}`;
    const res = await fetch(blobUrl);
    if (!res.ok) throw ApiError.internal('Failed to fetch statement PDF');
    const body = await res.arrayBuffer();
    const filename = `statement-${formatDate(statement.periodStart)}_${formatDate(statement.periodEnd)}.pdf`;
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE', 'LANDLORD', 'TENANT'] },
);
