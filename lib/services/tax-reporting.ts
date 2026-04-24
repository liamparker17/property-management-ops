import { Prisma } from '@prisma/client';
import type {
  FinancialYear,
  InvoiceLineItemKind,
  Org,
  TaxPack,
  TaxPackLine,
} from '@prisma/client';

import type { RouteCtx } from '@/lib/auth/with-org';
import { uploadBlob } from '@/lib/blob';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { renderTaxPackCsv } from '@/lib/reports/tax-pack-csv';
import { renderTaxPackPdf } from '@/lib/reports/tax-pack-pdf';
import { formatFinancialYearLabel } from '@/lib/financial-year';
import { writeAudit } from '@/lib/services/audit';
import { getYearOrThrow } from '@/lib/services/year-end';

export type TaxPackTotals = {
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  depositMovementCents: number;
  vatCents?: number;
};

export type TaxPackEvidenceRef = {
  type: 'RECEIPT' | 'BANK_TX' | 'ALLOCATION' | 'LEDGER';
  id: string;
  occurredAt?: string;
  amountCents?: number;
  label?: string;
};

export type TransmissionAdapter = {
  name: string;
  submit(pack: TaxPack): Promise<unknown>;
};

export type TaxPackWithLines = TaxPack & { lines: TaxPackLine[] };
export type TaxPackSummary = Pick<
  TaxPack,
  | 'id'
  | 'yearId'
  | 'subjectType'
  | 'subjectId'
  | 'totalsJson'
  | 'generatedAt'
  | 'regeneratedAt'
  | 'storageKey'
  | 'csvKey'
  | 'regenerationCount'
>;

type UploadFn = (path: string, file: File) => Promise<{ url: string; pathname: string }>;
type SubjectScope = {
  subjectType: 'Landlord' | 'Tenant';
  subjectId: string;
  subjectLabel: string;
  year: FinancialYear;
  org: Pick<Org, 'id' | 'name'>;
  leaseIds: string[];
  landlordIds: string[];
};

type InvoiceLineWithInvoice = {
  id: string;
  kind: InvoiceLineItemKind;
  description: string;
  amountCents: number;
  invoice: {
    id: string;
    periodStart: Date;
    leaseId: string;
  };
};

type ReceiptWithAllocations = {
  id: string;
  receivedAt: Date;
  amountCents: number;
  externalRef: string | null;
  method: string;
  leaseId: string | null;
  allocations: Array<{
    id: string;
    amountCents: number;
    createdAt: Date;
    target: string;
  }>;
};

type LedgerEntryRecord = {
  id: string;
  occurredAt: Date;
  amountCents: number;
  type: string;
  note: string | null;
  leaseId: string | null;
  tenantId: string | null;
};

const transmissionAdapters = new Map<string, TransmissionAdapter>();

function resolveUploader(): UploadFn {
  const override = (globalThis as { __PMOPS_UPLOAD_BLOB__?: UploadFn }).__PMOPS_UPLOAD_BLOB__;
  return override ?? uploadBlob;
}

function asJsonArray(value: Prisma.JsonValue | null): string[] {
  return Array.isArray(value) ? (value as string[]) : [];
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function endOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function labelForInvoiceKind(kind: InvoiceLineItemKind): string {
  switch (kind) {
    case 'RENT':
      return 'Rental charges';
    case 'UTILITY_WATER':
      return 'Water charges';
    case 'UTILITY_ELECTRICITY':
      return 'Electricity charges';
    case 'UTILITY_GAS':
      return 'Gas charges';
    case 'UTILITY_SEWER':
      return 'Sewer charges';
    case 'UTILITY_REFUSE':
      return 'Refuse charges';
    case 'LATE_FEE':
      return 'Late fees';
    case 'DEPOSIT_CHARGE':
      return 'Deposit charges';
    case 'ADJUSTMENT':
    default:
      return 'Adjustments';
  }
}

function incomeKinds(): InvoiceLineItemKind[] {
  return [
    'RENT',
    'UTILITY_WATER',
    'UTILITY_ELECTRICITY',
    'UTILITY_GAS',
    'UTILITY_SEWER',
    'UTILITY_REFUSE',
    'ADJUSTMENT',
    'LATE_FEE',
    'DEPOSIT_CHARGE',
  ];
}

function serialiseEvidence(refs: TaxPackEvidenceRef[]): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (refs.length === 0) return Prisma.JsonNull;
  return refs.map((ref) => ({
    type: ref.type,
    id: ref.id,
    occurredAt: ref.occurredAt ?? null,
    amountCents: ref.amountCents ?? null,
    label: ref.label ?? null,
  })) as Prisma.InputJsonValue;
}

export const recordOnlyAdapter: TransmissionAdapter = {
  name: 'recordOnly',
  async submit(pack: TaxPack) {
    return { recorded: true, packId: pack.id, at: pack.generatedAt.toISOString() };
  },
};

export function registerTransmissionAdapter(name: string, adapter: TransmissionAdapter): void {
  transmissionAdapters.set(name, adapter);
}

registerTransmissionAdapter(recordOnlyAdapter.name, recordOnlyAdapter);

function requireTransmissionAdapter(name?: string): TransmissionAdapter {
  const resolved = transmissionAdapters.get(name ?? 'recordOnly');
  if (!resolved) {
    throw ApiError.badRequest(`Unknown transmission adapter: ${name}`);
  }
  return resolved;
}

async function uploadArtifact(
  orgId: string,
  path: string,
  filename: string,
  contentType: string,
  content: Buffer | string,
): Promise<string> {
  const file = new File([typeof content === 'string' ? content : new Uint8Array(content)], filename, {
    type: contentType,
  });
  const { pathname } = await resolveUploader()(path, file);
  return pathname;
}

async function loadOrg(ctx: RouteCtx): Promise<Pick<Org, 'id' | 'name'>> {
  const org = await db.org.findUnique({
    where: { id: ctx.orgId },
    select: { id: true, name: true },
  });
  if (!org) throw ApiError.notFound('Organisation not found');
  return org;
}

async function getLandlordScope(ctx: RouteCtx, landlordId: string, yearId: string): Promise<SubjectScope> {
  const [landlord, org, year, properties] = await Promise.all([
    db.landlord.findFirst({
      where: { id: landlordId, orgId: ctx.orgId, archivedAt: null },
      select: { id: true, name: true },
    }),
    loadOrg(ctx),
    getYearOrThrow(ctx, yearId),
    db.property.findMany({
      where: { orgId: ctx.orgId, landlordId, deletedAt: null },
      select: { id: true, units: { select: { id: true, leases: { select: { id: true } } } } },
    }),
  ]);

  if (!landlord) throw ApiError.notFound('Landlord not found');

  return {
    subjectType: 'Landlord',
    subjectId: landlord.id,
    subjectLabel: landlord.name,
    year,
    org,
    leaseIds: properties.flatMap((property) => property.units.flatMap((unit) => unit.leases.map((lease) => lease.id))),
    landlordIds: [landlord.id],
  };
}

async function getTenantScope(ctx: RouteCtx, tenantId: string, yearId: string): Promise<SubjectScope> {
  const [tenant, org, year, leaseLinks] = await Promise.all([
    db.tenant.findFirst({
      where: { id: tenantId, orgId: ctx.orgId, archivedAt: null },
      select: { id: true, firstName: true, lastName: true },
    }),
    loadOrg(ctx),
    getYearOrThrow(ctx, yearId),
    db.leaseTenant.findMany({
      where: { tenantId },
      select: {
        leaseId: true,
        lease: {
          select: {
            unit: {
              select: {
                property: {
                  select: {
                    landlordId: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  if (!tenant) throw ApiError.notFound('Tenant not found');

  const landlordIds = leaseLinks
    .map((link) => link.lease.unit.property.landlordId)
    .filter((value): value is string => Boolean(value));

  return {
    subjectType: 'Tenant',
    subjectId: tenant.id,
    subjectLabel: `${tenant.firstName} ${tenant.lastName}`.trim(),
    year,
    org,
    leaseIds: leaseLinks.map((link) => link.leaseId),
    landlordIds: [...new Set(landlordIds)],
  };
}

async function loadPackData(
  ctx: RouteCtx,
  scope: SubjectScope,
): Promise<{
  invoiceLines: InvoiceLineWithInvoice[];
  receipts: ReceiptWithAllocations[];
  ledgerEntries: LedgerEntryRecord[];
}> {
  const periodStart = startOfDay(scope.year.startDate);
  const periodEnd = endOfDay(scope.year.endDate);

  const [invoiceLines, receipts, ledgerEntries] = await Promise.all([
    db.invoiceLineItem.findMany({
      where: {
        invoice: {
          orgId: ctx.orgId,
          leaseId: { in: scope.leaseIds.length ? scope.leaseIds : ['__none__'] },
          periodStart: { gte: periodStart, lte: periodEnd },
        },
      },
      include: {
        invoice: {
          select: {
            id: true,
            periodStart: true,
            leaseId: true,
          },
        },
      },
      orderBy: [{ invoice: { periodStart: 'asc' } }, { id: 'asc' }],
    }),
    db.paymentReceipt.findMany({
      where: {
        orgId: ctx.orgId,
        leaseId: { in: scope.leaseIds.length ? scope.leaseIds : ['__none__'] },
        receivedAt: { gte: periodStart, lte: periodEnd },
      },
      include: {
        allocations: {
          where: { reversedAt: null },
          select: { id: true, amountCents: true, createdAt: true, target: true },
        },
      },
      orderBy: [{ receivedAt: 'asc' }, { id: 'asc' }],
    }),
    db.trustLedgerEntry.findMany({
      where: {
        trustAccount: { orgId: ctx.orgId },
        occurredAt: { gte: periodStart, lte: periodEnd },
        ...(scope.subjectType === 'Landlord'
          ? { landlordId: scope.subjectId }
          : { tenantId: scope.subjectId }),
      },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        occurredAt: true,
        amountCents: true,
        type: true,
        note: true,
        leaseId: true,
        tenantId: true,
      },
    }),
  ]);

  return { invoiceLines, receipts, ledgerEntries };
}

function buildTotals(
  scope: SubjectScope,
  invoiceLines: InvoiceLineWithInvoice[],
  receipts: ReceiptWithAllocations[],
  ledgerEntries: LedgerEntryRecord[],
): TaxPackTotals {
  const chargesCents = invoiceLines
    .filter((line) => incomeKinds().includes(line.kind))
    .reduce((total, line) => total + line.amountCents, 0);
  const paymentCents = receipts.reduce((total, receipt) => total + receipt.amountCents, 0);
  const expenseCents =
    scope.subjectType === 'Landlord'
      ? ledgerEntries
          .filter((entry) => entry.amountCents < 0)
          .reduce((total, entry) => total + Math.abs(entry.amountCents), 0)
      : paymentCents;
  const depositMovementCents = ledgerEntries
    .filter((entry) => entry.type === 'DEPOSIT_IN' || entry.type === 'DEPOSIT_OUT')
    .reduce((total, entry) => total + entry.amountCents, 0);
  const incomeCents = scope.subjectType === 'Landlord' ? chargesCents : chargesCents;

  return {
    incomeCents,
    expenseCents,
    netCents: incomeCents - expenseCents,
    depositMovementCents,
    vatCents: 0,
  };
}

function buildChargeLines(invoiceLines: InvoiceLineWithInvoice[]): Array<{
  category: string;
  subCategory?: string | null;
  amountCents: number;
  evidenceRefs?: TaxPackEvidenceRef[];
}> {
  const grouped = new Map<string, number>();
  for (const line of invoiceLines) {
    const key = labelForInvoiceKind(line.kind);
    grouped.set(key, (grouped.get(key) ?? 0) + line.amountCents);
  }

  return [...grouped.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([category, amountCents]) => ({
      category,
      subCategory: null,
      amountCents,
      evidenceRefs: [],
    }));
}

function buildSupportLines(
  receipts: ReceiptWithAllocations[],
  ledgerEntries: LedgerEntryRecord[],
): Array<{
  category: string;
  subCategory?: string | null;
  amountCents: number;
  evidenceRefs?: TaxPackEvidenceRef[];
}> {
  const receiptEvidence: TaxPackEvidenceRef[] = receipts.map((receipt) => ({
    type: 'RECEIPT',
    id: receipt.id,
    occurredAt: receipt.receivedAt.toISOString(),
    amountCents: receipt.amountCents,
    label: `${receipt.method}${receipt.externalRef ? ` · ${receipt.externalRef}` : ''}`,
  }));
  const bankEvidence: TaxPackEvidenceRef[] = receipts
    .filter((receipt) => Boolean(receipt.externalRef))
    .map((receipt) => ({
      type: 'BANK_TX',
      id: receipt.externalRef ?? receipt.id,
      occurredAt: receipt.receivedAt.toISOString(),
      amountCents: receipt.amountCents,
      label: `Matched via ${receipt.externalRef}`,
    }));
  const allocationEvidence: TaxPackEvidenceRef[] = receipts.flatMap((receipt) =>
    receipt.allocations.map((allocation) => ({
      type: 'ALLOCATION',
      id: allocation.id,
      occurredAt: allocation.createdAt.toISOString(),
      amountCents: allocation.amountCents,
      label: allocation.target,
    })),
  );
  const ledgerEvidence: TaxPackEvidenceRef[] = ledgerEntries.map((entry) => ({
    type: 'LEDGER',
    id: entry.id,
    occurredAt: entry.occurredAt.toISOString(),
    amountCents: entry.amountCents,
    label: entry.note ?? entry.type,
  }));

  return [
    {
      category: 'Supporting receipts',
      subCategory: 'RECEIPT',
      amountCents: receiptEvidence.reduce((total, ref) => total + (ref.amountCents ?? 0), 0),
      evidenceRefs: receiptEvidence,
    },
    {
      category: 'Matched bank transactions',
      subCategory: 'BANK_TX',
      amountCents: bankEvidence.reduce((total, ref) => total + (ref.amountCents ?? 0), 0),
      evidenceRefs: bankEvidence,
    },
    {
      category: 'Allocations',
      subCategory: 'ALLOCATION',
      amountCents: allocationEvidence.reduce((total, ref) => total + (ref.amountCents ?? 0), 0),
      evidenceRefs: allocationEvidence,
    },
    {
      category: 'Trust ledger',
      subCategory: 'LEDGER',
      amountCents: ledgerEvidence.reduce((total, ref) => total + (ref.amountCents ?? 0), 0),
      evidenceRefs: ledgerEvidence,
    },
  ];
}

async function persistPack(
  ctx: RouteCtx,
  scope: SubjectScope,
  totals: TaxPackTotals,
  lines: Array<{ category: string; subCategory?: string | null; amountCents: number; evidenceRefs?: TaxPackEvidenceRef[] }>,
  adapterName?: string,
): Promise<TaxPackWithLines> {
  const existing = await db.taxPack.findUnique({
    where: {
      orgId_yearId_subjectType_subjectId: {
        orgId: ctx.orgId,
        yearId: scope.year.id,
        subjectType: scope.subjectType,
        subjectId: scope.subjectId,
      },
    },
    include: { lines: true },
  });

  if (scope.year.lockedAt && existing?.generatedAt) {
    throw ApiError.conflict('Tax pack already generated; use regenerate');
  }

  const adapter = requireTransmissionAdapter(adapterName);
  const initial = existing
    ? await db.taxPack.update({
        where: { id: existing.id },
        data: {
          totalsJson: totals as unknown as Prisma.InputJsonValue,
          transmissionAdapter: adapter.name,
        },
      })
    : await db.taxPack.create({
        data: {
          orgId: ctx.orgId,
          yearId: scope.year.id,
          subjectType: scope.subjectType,
          subjectId: scope.subjectId,
          totalsJson: totals as unknown as Prisma.InputJsonValue,
          transmissionAdapter: adapter.name,
        },
      });

  await db.taxPackLine.deleteMany({ where: { packId: initial.id } });
  if (lines.length > 0) {
    await db.taxPackLine.createMany({
      data: lines.map((line) => ({
        packId: initial.id,
        category: line.category,
        subCategory: line.subCategory ?? null,
        amountCents: line.amountCents,
        evidenceRefs: serialiseEvidence(line.evidenceRefs ?? []),
      })),
    });
  }

  const full = await db.taxPack.findUnique({
    where: { id: initial.id },
    include: { lines: true },
  });
  if (!full) throw ApiError.internal('Tax pack was not persisted');

  const pdfBuffer = await renderTaxPackPdf({
    ...full,
    org: scope.org,
    year: scope.year,
    subjectLabel: scope.subjectLabel,
  });
  const csvText = await renderTaxPackCsv({
    ...full,
    org: scope.org,
    year: scope.year,
    subjectLabel: scope.subjectLabel,
  });

  const yearLabel = formatFinancialYearLabel(scope.year.startDate);
  const storageKey = await uploadArtifact(
    ctx.orgId,
    `tax-packs/${ctx.orgId}/${initial.id}/${yearLabel}.pdf`,
    `${initial.id}.pdf`,
    'application/pdf',
    pdfBuffer,
  );
  const csvKey = await uploadArtifact(
    ctx.orgId,
    `tax-packs/${ctx.orgId}/${initial.id}/${yearLabel}.csv`,
    `${initial.id}.csv`,
    'text/csv',
    csvText,
  );

  const transmissionResult = await adapter.submit(initial);
  const updated = await db.taxPack.update({
    where: { id: initial.id },
    data: {
      storageKey,
      csvKey,
      transmissionAdapter: adapter.name,
      transmissionResult: transmissionResult as Prisma.InputJsonValue,
      generatedAt: existing?.generatedAt ?? new Date(),
    },
    include: { lines: true },
  });

  await writeAudit(ctx, {
    entityType: 'TaxPack',
    entityId: updated.id,
    action: existing ? 'REGENERATE' : 'GENERATE',
    payload: {
      yearId: scope.year.id,
      subjectType: scope.subjectType,
      subjectId: scope.subjectId,
      transmissionAdapter: adapter.name,
      lineCount: updated.lines.length,
    },
  });

  return updated;
}

async function generatePack(ctx: RouteCtx, scope: SubjectScope, adapterName?: string): Promise<TaxPackWithLines> {
  const { invoiceLines, receipts, ledgerEntries } = await loadPackData(ctx, scope);
  const totals = buildTotals(scope, invoiceLines, receipts, ledgerEntries);
  const lines = [...buildChargeLines(invoiceLines), ...buildSupportLines(receipts, ledgerEntries)];
  return persistPack(ctx, scope, totals, lines, adapterName);
}

async function loadPackRenderContext(
  ctx: RouteCtx,
  pack: TaxPackWithLines,
): Promise<{ org: Pick<Org, 'name'>; year: FinancialYear; subjectLabel: string }> {
  const [org, year] = await Promise.all([
    loadOrg(ctx),
    getYearOrThrow(ctx, pack.yearId),
  ]);

  if (pack.subjectType === 'Landlord') {
    const landlord = await db.landlord.findFirst({
      where: { id: pack.subjectId, orgId: ctx.orgId },
      select: { name: true },
    });
    if (!landlord) throw ApiError.notFound('Landlord not found');
    return { org, year, subjectLabel: landlord.name };
  }

  const tenant = await db.tenant.findFirst({
    where: { id: pack.subjectId, orgId: ctx.orgId },
    select: { firstName: true, lastName: true },
  });
  if (!tenant) throw ApiError.notFound('Tenant not found');
  return { org, year, subjectLabel: `${tenant.firstName} ${tenant.lastName}`.trim() };
}

function prependKey(value: Prisma.JsonValue | null, key: string | null): Prisma.InputJsonValue {
  const entries = key ? [key, ...asJsonArray(value)] : asJsonArray(value);
  return entries as Prisma.InputJsonValue;
}

async function enforcePackAccess(ctx: RouteCtx, pack: TaxPack): Promise<void> {
  if (ctx.role === 'LANDLORD') {
    if (!ctx.user?.landlordId) throw ApiError.forbidden('Landlord account is not linked');
    if (pack.subjectType !== 'Landlord' || pack.subjectId !== ctx.user.landlordId) {
      throw ApiError.forbidden('Tax pack is not available to this account');
    }
    return;
  }

  if (ctx.role === 'TENANT') {
    const tenant = await db.tenant.findFirst({
      where: { orgId: ctx.orgId, userId: ctx.userId },
      select: { id: true },
    });
    if (!tenant || pack.subjectType !== 'Tenant' || pack.subjectId !== tenant.id) {
      throw ApiError.forbidden('Tax pack is not available to this account');
    }
    return;
  }

  if (ctx.role === 'MANAGING_AGENT') {
    throw ApiError.forbidden('Tax packs are not available to managing-agent accounts');
  }
}

export async function generateLandlordTaxPack(
  ctx: RouteCtx,
  landlordId: string,
  yearId: string,
  opts?: { transmissionAdapter?: string },
): Promise<TaxPackWithLines> {
  const scope = await getLandlordScope(ctx, landlordId, yearId);
  return generatePack(ctx, scope, opts?.transmissionAdapter);
}

export async function generateTenantTaxPack(
  ctx: RouteCtx,
  tenantId: string,
  yearId: string,
  opts?: { transmissionAdapter?: string },
): Promise<TaxPackWithLines> {
  const scope = await getTenantScope(ctx, tenantId, yearId);
  return generatePack(ctx, scope, opts?.transmissionAdapter);
}

export async function getPackOrThrow(ctx: RouteCtx, packId: string): Promise<TaxPackWithLines> {
  const pack = await db.taxPack.findFirst({
    where: { id: packId, orgId: ctx.orgId },
    include: { lines: true },
  });
  if (!pack) throw ApiError.notFound('Tax pack not found');
  await enforcePackAccess(ctx, pack);
  return pack;
}

export async function listPacksForYear(ctx: RouteCtx, yearId: string): Promise<TaxPackSummary[]> {
  return db.taxPack.findMany({
    where: { orgId: ctx.orgId, yearId },
    select: {
      id: true,
      yearId: true,
      subjectType: true,
      subjectId: true,
      totalsJson: true,
      generatedAt: true,
      regeneratedAt: true,
      storageKey: true,
      csvKey: true,
      regenerationCount: true,
    },
    orderBy: [{ subjectType: 'asc' }, { subjectId: 'asc' }],
  });
}

export async function regenerateTaxPackPdf(ctx: RouteCtx, packId: string): Promise<TaxPack> {
  const pack = await getPackOrThrow(ctx, packId);
  const renderCtx = await loadPackRenderContext(ctx, pack);
  const pdfBuffer = await renderTaxPackPdf({ ...pack, ...renderCtx });
  const storageKey = await uploadArtifact(
    ctx.orgId,
    `tax-packs/${ctx.orgId}/${pack.id}/regen-${pack.regenerationCount + 1}.pdf`,
    `${pack.id}.pdf`,
    'application/pdf',
    pdfBuffer,
  );

  const updated = await db.taxPack.update({
    where: { id: pack.id },
    data: {
      storageKey,
      previousStorageKeys: prependKey(pack.previousStorageKeys, pack.storageKey),
      regeneratedAt: new Date(),
      regenerationCount: { increment: 1 },
    },
  });

  await writeAudit(ctx, {
    entityType: 'TaxPack',
    entityId: pack.id,
    action: 'REGENERATE_PDF',
    payload: { storageKey },
  });

  return updated;
}

export async function regenerateTaxPackCsv(ctx: RouteCtx, packId: string): Promise<TaxPack> {
  const pack = await getPackOrThrow(ctx, packId);
  const renderCtx = await loadPackRenderContext(ctx, pack);
  const csvText = await renderTaxPackCsv({ ...pack, ...renderCtx });
  const csvKey = await uploadArtifact(
    ctx.orgId,
    `tax-packs/${ctx.orgId}/${pack.id}/regen-${pack.regenerationCount + 1}.csv`,
    `${pack.id}.csv`,
    'text/csv',
    csvText,
  );

  const updated = await db.taxPack.update({
    where: { id: pack.id },
    data: {
      csvKey,
      previousCsvKeys: prependKey(pack.previousCsvKeys, pack.csvKey),
      regeneratedAt: new Date(),
      regenerationCount: { increment: 1 },
    },
  });

  await writeAudit(ctx, {
    entityType: 'TaxPack',
    entityId: pack.id,
    action: 'REGENERATE_CSV',
    payload: { csvKey },
  });

  return updated;
}
