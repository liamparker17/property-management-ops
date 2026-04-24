import { loadEnvConfig } from '@next/env';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

loadEnvConfig(process.cwd());

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DIRECT_URL or DATABASE_URL must be set');
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
  log: ['error'],
});

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const count = await db.document.count({
    where: { encryptionNote: null },
  });

  if (dryRun) {
    console.log(`Would update ${count} document rows.`);
    return;
  }

  const result = await db.document.updateMany({
    where: { encryptionNote: null },
    data: { encryptionNote: 'provider-default' },
  });

  console.log(`Updated ${result.count} document rows.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
