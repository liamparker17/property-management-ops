import { config } from 'dotenv';
config({ path: '.env.local' });

// Prefer direct endpoint — same SA→us-east-1 latency concern as other scripts.
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const UA = 'property-management-ops/1.0 (one-time geocoding backfill)';

type Hit = { lat: string; lon: string; display_name: string };

async function geocode(query: string): Promise<Hit | null> {
  const url = `${NOMINATIM}?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=za`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const arr = (await res.json()) as Hit[];
  return arr[0] ?? null;
}

async function main() {
  const { db } = await import('@/lib/db');

  const slug = process.argv[2] ?? 'acme';
  const org = await db.org.findUnique({ where: { slug }, select: { id: true, name: true } });
  if (!org) {
    console.error(`No org with slug "${slug}"`);
    process.exit(1);
  }

  // Only geocode properties that don't have coords or that have a stale geocodedAt (null).
  const force = process.argv.includes('--force');
  const properties = await db.property.findMany({
    where: {
      orgId: org.id,
      deletedAt: null,
      ...(force ? {} : { OR: [{ latitude: null }, { longitude: null }] }),
    },
    select: {
      id: true, name: true, addressLine1: true, addressLine2: true,
      suburb: true, city: true, province: true, postalCode: true,
    },
    orderBy: { name: 'asc' },
  });
  console.log(`Geocoding ${properties.length} properties (rate-limit 1 req/sec, polite to Nominatim)…`);

  let hit = 0, miss = 0;
  for (const p of properties) {
    // Try increasingly loose queries until we get a hit.
    const queries = [
      `${p.addressLine1}, ${p.suburb}, ${p.city}, ${p.postalCode}, South Africa`,
      `${p.addressLine1}, ${p.suburb}, ${p.city}, South Africa`,
      `${p.addressLine1}, ${p.city}, South Africa`,
      `${p.suburb}, ${p.city}, South Africa`,
    ];
    let found: Hit | null = null;
    let usedQuery = '';
    for (const q of queries) {
      found = await geocode(q);
      usedQuery = q;
      // Nominatim rate limit — 1 req/sec is the documented max.
      await new Promise((r) => setTimeout(r, 1100));
      if (found) break;
    }

    if (found) {
      await db.property.update({
        where: { id: p.id },
        data: {
          latitude: Number(found.lat),
          longitude: Number(found.lon),
          geocodedAt: new Date(),
        },
      });
      hit += 1;
      console.log(`  ✓ ${p.name.padEnd(32)} → ${Number(found.lat).toFixed(5)}, ${Number(found.lon).toFixed(5)}`);
    } else {
      miss += 1;
      console.log(`  ✗ ${p.name.padEnd(32)}   (no result for "${usedQuery}")`);
    }
  }

  console.log(`\nDone. ${hit} geocoded, ${miss} unresolved.`);
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
