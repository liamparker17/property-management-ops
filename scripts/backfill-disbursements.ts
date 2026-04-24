import { config } from 'dotenv';
config({ path: '.env.local' });

// Force the shared db client (lib/db.ts) to use the direct endpoint.
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

async function main() {
  const { db } = await import('@/lib/db');

  const slug = process.argv[2] ?? 'acme';
  const org = await db.org.findUnique({ where: { slug }, select: { id: true, name: true } });
  if (!org) {
    console.error(`No org with slug "${slug}"`);
    process.exit(1);
  }

  // Figure out which months need backfill. The seed creates one DISBURSEMENT
  // per landlord (for "previous month receipts") — we want one per landlord
  // per month the book has receipts, so trust balance doesn't pile up forever.
  const landlords = await db.landlord.findMany({
    where: { orgId: org.id, archivedAt: null },
    select: { id: true },
  });

  const ledger = await db.trustLedgerEntry.findMany({
    where: { landlordId: { in: landlords.map((l) => l.id) } },
    select: { landlordId: true, type: true, amountCents: true, occurredAt: true },
  });

  // Group entries by landlord + month
  const key = (lid: string, d: Date) => `${lid}:${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  const receiptsByLandlordMonth = new Map<string, number>();
  const feesByLandlordMonth = new Map<string, number>();
  const disbsByLandlordMonth = new Map<string, number>();
  for (const e of ledger) {
    const k = key(e.landlordId!, e.occurredAt);
    if (e.type === 'RECEIPT') receiptsByLandlordMonth.set(k, (receiptsByLandlordMonth.get(k) ?? 0) + e.amountCents);
    else if (e.type === 'FEE') feesByLandlordMonth.set(k, (feesByLandlordMonth.get(k) ?? 0) + Math.abs(e.amountCents));
    else if (e.type === 'DISBURSEMENT') disbsByLandlordMonth.set(k, (disbsByLandlordMonth.get(k) ?? 0) + Math.abs(e.amountCents));
  }

  const trustAccounts = await db.trustAccount.findMany({
    where: { orgId: org.id },
    select: { id: true, landlordId: true },
  });
  const trustAccountByLandlord = new Map(trustAccounts.map((t) => [t.landlordId, t.id]));

  let created = 0;
  let totalDisbursedCents = 0;

  // For each month that has receipts but no disbursement on that landlord,
  // post a catch-up disbursement = receipts × 0.74 - fees × 0.45 (same
  // reserve retention the seed uses).
  for (const k of receiptsByLandlordMonth.keys()) {
    if (disbsByLandlordMonth.has(k)) continue; // already has one

    const [landlordId, ym] = k.split(':');
    const [y, m] = ym.split('-').map(Number);
    const monthStart = new Date(Date.UTC(y, m - 1, 1));
    const monthEnd = new Date(Date.UTC(y, m, 0)); // last day of month
    const receipts = receiptsByLandlordMonth.get(k)!;
    const fees = feesByLandlordMonth.get(k) ?? 0;
    const amount = Math.max(0, Math.round(receipts * 0.74) - Math.round(fees * 0.45));
    if (amount === 0) continue;

    const trustAccountId = trustAccountByLandlord.get(landlordId)!;
    // Post the disbursement on the last day of the month
    const occurredAt = new Date(Math.min(monthEnd.getTime(), Date.now() - 1));

    await db.trustLedgerEntry.create({
      data: {
        trustAccountId,
        landlordId,
        occurredAt,
        type: 'DISBURSEMENT',
        amountCents: -amount,
        sourceType: 'seed.backfill.disbursement',
        sourceId: landlordId,
        note: `Catch-up monthly owner draw for ${ym}.`,
      },
    });
    created += 1;
    totalDisbursedCents += amount;
  }

  console.log(`Created ${created} catch-up disbursements totalling R${(totalDisbursedCents / 100).toFixed(2)}`);

  // Re-warm current-month org snapshot so trust balance reflects backfill
  const { recomputeOrgSnapshot, monthFloor } = await import('@/lib/services/snapshots');
  const { RouteCtx } = await import('@/lib/auth/with-org').catch(() => ({ RouteCtx: null as any }));
  void RouteCtx;
  const ctx: any = { orgId: org.id, userId: 'backfill-cli', role: 'ADMIN' };
  await recomputeOrgSnapshot(ctx, monthFloor(new Date()));

  const snap = await db.orgMonthlySnapshot.findFirst({
    where: { orgId: org.id },
    orderBy: { periodStart: 'desc' },
    select: { periodStart: true, trustBalanceCents: true, unallocatedCents: true },
  });
  console.log('Current org snapshot:', snap?.periodStart?.toISOString().slice(0, 7), 'trustBalance=R' + ((snap?.trustBalanceCents ?? 0) / 100).toFixed(2), 'unallocated=R' + ((snap?.unallocatedCents ?? 0) / 100).toFixed(2));

  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
