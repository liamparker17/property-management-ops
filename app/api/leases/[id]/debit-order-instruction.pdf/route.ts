import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { renderDebitOrderInstruction } from '@/lib/reports/debit-order-instruction-pdf';

export const GET = withOrg<{ id: string }>(async (_req, ctx, params) => {
  const lease = await db.lease.findFirst({
    where: { id: params.id, orgId: ctx.orgId },
    include: {
      org: { select: { name: true } },
      unit: { include: { property: true } },
      tenants: { include: { tenant: true } },
    },
  });
  if (!lease) throw ApiError.notFound('Lease not found');

  // Tenant role may only download PDFs for leases they are on.
  if (ctx.role === 'TENANT') {
    const me = await db.tenant.findFirst({
      where: { userId: ctx.userId, orgId: ctx.orgId },
      select: { id: true },
    });
    const onLease = me ? lease.tenants.some((t) => t.tenantId === me.id) : false;
    if (!onLease) throw ApiError.forbidden('Not your lease');
  }

  const primary = lease.tenants.find((t) => t.isPrimary) ?? lease.tenants[0];
  const tenantDisplay = primary
    ? `${primary.tenant.firstName} ${primary.tenant.lastName}`.trim()
    : 'Tenant';

  const pdf = renderDebitOrderInstruction({
    org: { name: lease.org.name },
    lease: {
      id: lease.id,
      rentAmountCents: lease.rentAmountCents,
      paymentDueDay: lease.paymentDueDay,
      tenantDisplay,
      unitLabel: lease.unit.label,
      propertyName: lease.unit.property.name,
    },
    bankDetails: {
      bankName: process.env.BANK_NAME?.trim() || 'First National Bank',
      accountName: process.env.BANK_ACCOUNT_NAME?.trim() || lease.org.name,
      accountNumber: process.env.BANK_ACCOUNT_NUMBER?.trim() || 'TBC',
      branchCode: process.env.BANK_BRANCH_CODE?.trim() || '250655',
    },
  });

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="debit-order-${lease.id}.pdf"`,
    },
  });
});
