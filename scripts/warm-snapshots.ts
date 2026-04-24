import { config } from 'dotenv';
config({ path: '.env.local' });

// Force the shared db client (lib/db.ts) to use the direct endpoint.
// Neon's pooled endpoint refuses connections during compute cold-start,
// which blocks the snapshot service. The direct endpoint waits for wake.
// Must happen BEFORE importing anything from @/lib.
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

async function main() {
  const { PrismaClient } = await import('@prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const { db } = await import('@/lib/db');
  const {
    monthFloor,
    recomputeOrgSnapshot,
    recomputePropertySnapshot,
    recomputeLandlordSnapshot,
    recomputeAgentSnapshot,
  } = await import('@/lib/services/snapshots');
  type RouteCtx = import('@/lib/auth/with-org').RouteCtx;

  const connStr = process.env.DATABASE_URL!;
  console.log('Host:', connStr.replace(/^postgres.*?@/, '').replace(/[/?].*$/, ''));

  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      await db.$queryRaw`SELECT 1`;
      console.log(`Neon compute awake (attempt ${attempt})`);
      break;
    } catch {
      console.log(`Warm-up attempt ${attempt} failed — retrying in 5s`);
      await new Promise((r) => setTimeout(r, 5_000));
      if (attempt === 6) throw new Error('Failed to wake Neon compute after 6 attempts');
    }
  }

  const slug = process.argv[2] ?? 'acme';
  const org = await db.org.findUnique({ where: { slug }, select: { id: true, name: true } });
  if (!org) {
    console.error(`No org with slug "${slug}"`);
    process.exit(1);
  }
  const ctx: RouteCtx = { orgId: org.id, userId: 'warm-snapshots-cli', role: 'ADMIN' };
  const current = monthFloor(new Date());
  // Warm the current month plus the previous 11 so the 12-month trend chart
  // on /dashboard and /dashboard/finance has data for every bar.
  const months: Date[] = [];
  for (let offset = 11; offset >= 0; offset -= 1) {
    const d = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - offset, 1));
    months.push(d);
  }
  console.log(`Warming snapshots for "${org.name}" (orgId=${org.id}) across ${months.length} months`);

  const properties = await db.property.findMany({
    where: { orgId: org.id, deletedAt: null },
    select: { id: true },
  });
  const landlords = await db.landlord.findMany({
    where: { orgId: org.id, archivedAt: null },
    select: { id: true },
  });
  const agents = await db.managingAgent.findMany({
    where: { orgId: org.id, archivedAt: null },
    select: { id: true },
  });

  for (const periodStart of months) {
    const label = periodStart.toISOString().slice(0, 7);
    console.log(`[${label}] org + ${properties.length} props + ${landlords.length} landlords + ${agents.length} agents`);
    await recomputeOrgSnapshot(ctx, periodStart);
    for (const p of properties) await recomputePropertySnapshot(ctx, p.id, periodStart);
    for (const l of landlords) await recomputeLandlordSnapshot(ctx, l.id, periodStart);
    for (const a of agents) await recomputeAgentSnapshot(ctx, a.id, periodStart);
  }

  const check = await db.orgMonthlySnapshot.findMany({
    where: { orgId: org.id },
    orderBy: { periodStart: 'asc' },
    select: { periodStart: true, billedCents: true, collectedCents: true },
  });
  console.log(`\nOrg snapshots written: ${check.length}`);
  for (const s of check) {
    console.log(`  ${s.periodStart.toISOString().slice(0, 7)}  billed=${s.billedCents}  collected=${s.collectedCents}`);
  }
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
