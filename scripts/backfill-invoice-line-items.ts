import { db } from '../lib/db';

function log(line = '') {
  process.stderr.write(`${line}\n`);
}

async function main() {
  const shouldWrite = process.argv.includes('--write');

  const invoices = await db.invoice.findMany({
    select: {
      id: true,
      orgId: true,
      amountCents: true,
      subtotalCents: true,
      totalCents: true,
      lineItems: { select: { id: true }, take: 1 },
    },
    orderBy: { createdAt: 'asc' },
  });

  const pending = invoices.filter((inv) => inv.lineItems.length === 0);
  log(`Invoice line-item backfill report`);
  log(`mode: ${shouldWrite ? 'write' : 'dry-run'}`);
  log(`invoices scanned: ${invoices.length}`);
  log(`invoices requiring backfill: ${pending.length}`);

  if (pending.length === 0 || !shouldWrite) {
    return;
  }

  let applied = 0;
  for (const invoice of pending) {
    await db.$transaction(async (tx) => {
      await tx.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          kind: 'RENT',
          description: 'Monthly rent (backfilled)',
          amountCents: invoice.amountCents,
          sourceType: 'Lease',
        },
      });
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          subtotalCents: invoice.amountCents,
          taxCents: 0,
          totalCents: invoice.amountCents,
        },
      });
    });
    applied += 1;
  }

  log(`invoices backfilled: ${applied}`);
}

main()
  .catch((err) => {
    console.error('Invoice line-item backfill failed.');
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
