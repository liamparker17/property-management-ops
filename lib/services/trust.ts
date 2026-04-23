import type { Prisma, TrustAccount, TrustLedgerEntry } from '@prisma/client';
import type { z } from 'zod';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import type { RouteCtx } from '@/lib/auth/with-org';
import { writeAudit } from '@/lib/services/audit';
import { stitchPayoutsAdapter } from '@/lib/integrations/stitch/payouts-adapter';
import type {
  disburseToLandlordSchema,
  recordManualLedgerEntrySchema,
} from '@/lib/zod/trust';

type TxClient = Prisma.TransactionClient;
type DbLike = TxClient | typeof db;

async function findLandlordInOrg(client: DbLike, orgId: string, landlordId: string) {
  const landlord = await client.landlord.findFirst({
    where: { id: landlordId, orgId },
    select: { id: true, name: true, archivedAt: true },
  });
  if (!landlord) throw ApiError.notFound('Landlord not found');
  return landlord;
}

export async function ensureTrustAccount(
  ctx: RouteCtx,
  landlordId: string,
  client: DbLike = db,
): Promise<TrustAccount> {
  const landlord = await findLandlordInOrg(client, ctx.orgId, landlordId);
  const existing = await client.trustAccount.findUnique({
    where: { orgId_landlordId: { orgId: ctx.orgId, landlordId } },
  });
  if (existing) return existing;
  return client.trustAccount.create({
    data: {
      orgId: ctx.orgId,
      landlordId: landlord.id,
      name: `${landlord.name} Trust`,
    },
  });
}

function assertLandlordMatch(account: { landlordId: string }, entryLandlordId: string) {
  if (account.landlordId !== entryLandlordId) {
    throw ApiError.conflict('Ledger entry landlordId does not match trust account landlordId');
  }
}

type WriteEntryInput = {
  landlordId: string;
  occurredAt?: Date;
  type: TrustLedgerEntry['type'];
  amountCents: number;
  tenantId?: string | null;
  leaseId?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  note?: string | null;
};

export async function writeLedgerEntry(
  ctx: RouteCtx,
  input: WriteEntryInput,
  client: DbLike = db,
): Promise<TrustLedgerEntry> {
  const account = await ensureTrustAccount(ctx, input.landlordId, client);
  assertLandlordMatch(account, input.landlordId);
  return client.trustLedgerEntry.create({
    data: {
      trustAccountId: account.id,
      landlordId: input.landlordId,
      occurredAt: input.occurredAt ?? new Date(),
      type: input.type,
      amountCents: input.amountCents,
      tenantId: input.tenantId ?? null,
      leaseId: input.leaseId ?? null,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      note: input.note ?? null,
    },
  });
}

async function summariseEntries(entries: { type: string; amountCents: number }[]) {
  let totalCents = 0;
  let depositsCents = 0;
  let allocatedCents = 0;
  let receiptsCents = 0;
  for (const e of entries) {
    totalCents += e.amountCents;
    if (e.type === 'DEPOSIT_IN' || e.type === 'DEPOSIT_OUT') depositsCents += e.amountCents;
    if (e.type === 'RECEIPT') receiptsCents += e.amountCents;
    if (e.type === 'ALLOCATION' || e.type === 'REVERSAL') allocatedCents += e.amountCents;
  }
  return { totalCents, depositsCents, receiptsCents, allocatedCents };
}

export async function getTrustBalance(ctx: RouteCtx, landlordId: string) {
  await findLandlordInOrg(db, ctx.orgId, landlordId);
  const entries = await db.trustLedgerEntry.findMany({
    where: { landlordId, trustAccount: { orgId: ctx.orgId } },
    select: { type: true, amountCents: true },
  });
  const { totalCents, depositsCents, receiptsCents, allocatedCents } =
    await summariseEntries(entries);
  // Unapplied = receipts received but not yet allocated against an invoice line / deposit.
  const unappliedCents = receiptsCents + allocatedCents;
  return { totalCents, depositsCents, unappliedCents };
}

export async function getPortfolioTrustBalance(ctx: RouteCtx) {
  const accounts = await db.trustAccount.findMany({
    where: { orgId: ctx.orgId },
    include: { landlord: { select: { id: true, name: true } } },
  });
  const perLandlord: { landlordId: string; name: string; totalCents: number }[] = [];
  let totalCents = 0;
  for (const acc of accounts) {
    const sum = await db.trustLedgerEntry.aggregate({
      where: { trustAccountId: acc.id },
      _sum: { amountCents: true },
    });
    const t = sum._sum.amountCents ?? 0;
    totalCents += t;
    perLandlord.push({ landlordId: acc.landlordId, name: acc.landlord.name, totalCents: t });
  }
  return { totalCents, perLandlord };
}

export async function getTenantTrustPosition(ctx: RouteCtx, tenantId: string) {
  const tenant = await db.tenant.findFirst({
    where: { id: tenantId, orgId: ctx.orgId },
    select: { id: true },
  });
  if (!tenant) throw ApiError.notFound('Tenant not found');

  const activeLeaseLink = await db.leaseTenant.findFirst({
    where: {
      tenantId,
      lease: { state: { in: ['ACTIVE', 'RENEWED'] }, orgId: ctx.orgId },
    },
    include: {
      lease: {
        include: { unit: { include: { property: { select: { landlordId: true } } } } },
      },
    },
  });

  const landlordId = activeLeaseLink?.lease.unit.property.landlordId ?? null;

  const entries = await db.trustLedgerEntry.findMany({
    where: { tenantId, trustAccount: { orgId: ctx.orgId } },
    select: { type: true, amountCents: true },
  });
  let receiptsCents = 0;
  let allocatedCents = 0;
  let depositsCents = 0;
  for (const e of entries) {
    if (e.type === 'RECEIPT') receiptsCents += e.amountCents;
    if (e.type === 'ALLOCATION' || e.type === 'REVERSAL') allocatedCents += e.amountCents;
    if (e.type === 'DEPOSIT_IN' || e.type === 'DEPOSIT_OUT') depositsCents += e.amountCents;
  }
  const unappliedCents = receiptsCents + allocatedCents;
  return { receiptsCents, allocatedCents, unappliedCents, depositsCents, landlordId };
}

export async function recordManualLedgerEntry(
  ctx: RouteCtx,
  landlordId: string,
  input: z.infer<typeof recordManualLedgerEntrySchema>,
): Promise<TrustLedgerEntry> {
  const entry = await db.$transaction(async (tx) =>
    writeLedgerEntry(
      ctx,
      {
        landlordId,
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
        type: input.type,
        amountCents: input.amountCents,
        tenantId: input.tenantId ?? null,
        leaseId: input.leaseId ?? null,
        sourceType: input.sourceType ?? 'Manual',
        sourceId: input.sourceId ?? null,
        note: input.note ?? null,
      },
      tx,
    ),
  );
  await writeAudit(ctx, {
    entityType: 'TrustLedgerEntry',
    entityId: entry.id,
    action: 'manualLedgerEntry',
    payload: { landlordId, type: input.type, amountCents: input.amountCents },
  });
  return entry;
}

export async function disburseToLandlord(
  ctx: RouteCtx,
  input: z.infer<typeof disburseToLandlordSchema>,
): Promise<TrustLedgerEntry> {
  const entry = await db.$transaction(async (tx) =>
    writeLedgerEntry(
      ctx,
      {
        landlordId: input.landlordId,
        type: 'DISBURSEMENT',
        amountCents: -Math.abs(input.amountCents),
        sourceType: 'Disbursement',
        note: input.note ?? null,
      },
      tx,
    ),
  );

  // Payouts adapter is credential-gated; if the org has no STITCH_PAYOUTS connection the ledger entry
  // stands alone as a manual record and the webhook path is unused.
  let payoutExternalId: string | null = null;
  try {
    const payout = await stitchPayoutsAdapter.initiatePayout(ctx, {
      landlordId: input.landlordId,
      amountCents: Math.abs(input.amountCents),
      externalRef: entry.id,
    });
    payoutExternalId = payout.payoutExternalId;
    await db.trustLedgerEntry.update({
      where: { id: entry.id },
      data: { sourceId: payoutExternalId },
    });
  } catch (err) {
    if (!(err instanceof ApiError && err.code === 'CONFLICT')) throw err;
  }

  await writeAudit(ctx, {
    entityType: 'TrustLedgerEntry',
    entityId: entry.id,
    action: 'disburseToLandlord',
    payload: { landlordId: input.landlordId, amountCents: input.amountCents, payoutExternalId },
  });
  return entry;
}
