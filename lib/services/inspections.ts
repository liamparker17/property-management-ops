import type {
  Inspection,
  InspectionArea,
  InspectionItem,
  InspectionPhoto,
  InspectionSignature,
  InspectionStatus,
  InspectionType,
  Role,
  ConditionRating,
  ChargeResponsibility,
} from '@prisma/client';
import type { z } from 'zod';

import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import * as blobModule from '@/lib/blob';

type Uploader = (path: string, file: File) => Promise<{ url: string; pathname: string }>;
let currentUploader: Uploader = (path, file) => blobModule.uploadBlob(path, file);

export function __setUploaderForTests(u: Uploader) {
  currentUploader = u;
}
import { writeAudit } from '@/lib/services/audit';
import type { RouteCtx } from '@/lib/auth/with-org';
import { renderInspectionReport, type InspectionReportData } from '@/lib/reports/inspection-pdf';
import type {
  createInspectionSchema,
  recordAreaSchema,
  recordItemSchema,
  completeInspectionSchema,
  signInspectionSchema,
} from '@/lib/zod/inspection';

type InspectionFilters = {
  leaseId?: string;
  unitId?: string;
  type?: InspectionType;
  status?: InspectionStatus;
};

export type InspectionWithAreas = Inspection & {
  areas: (InspectionArea & { items: (InspectionItem & { photos: InspectionPhoto[] })[] })[];
  signatures: InspectionSignature[];
};

export async function listInspections(
  ctx: RouteCtx,
  filters: InspectionFilters = {},
): Promise<Inspection[]> {
  return db.inspection.findMany({
    where: {
      orgId: ctx.orgId,
      ...(filters.leaseId ? { leaseId: filters.leaseId } : {}),
      ...(filters.unitId ? { unitId: filters.unitId } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    },
    orderBy: [{ scheduledAt: 'desc' }, { id: 'asc' }],
  });
}

export async function getInspection(
  ctx: RouteCtx,
  id: string,
): Promise<InspectionWithAreas> {
  const row = await db.inspection.findFirst({
    where: { id, orgId: ctx.orgId },
    include: {
      areas: {
        orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }],
        include: {
          items: {
            orderBy: { id: 'asc' },
            include: { photos: { orderBy: { id: 'asc' } } },
          },
        },
      },
      signatures: { orderBy: { signedAt: 'asc' } },
    },
  });
  if (!row) throw ApiError.notFound('Inspection not found');
  return row as InspectionWithAreas;
}

export async function createInspection(
  ctx: RouteCtx,
  input: z.infer<typeof createInspectionSchema>,
): Promise<Inspection> {
  const lease = await db.lease.findFirst({
    where: { id: input.leaseId, orgId: ctx.orgId },
    select: { id: true, unitId: true },
  });
  if (!lease) throw ApiError.notFound('Lease not found');

  const created = await db.inspection.create({
    data: {
      orgId: ctx.orgId,
      leaseId: lease.id,
      unitId: lease.unitId,
      type: input.type,
      scheduledAt: new Date(input.scheduledAt),
    },
  });

  await writeAudit(ctx, {
    entityType: 'Inspection',
    entityId: created.id,
    action: 'inspection.create',
    payload: { leaseId: lease.id, type: input.type, scheduledAt: input.scheduledAt },
  });

  return created;
}

async function requireInspectionInOrg(ctx: RouteCtx, id: string): Promise<Inspection> {
  const row = await db.inspection.findFirst({ where: { id, orgId: ctx.orgId } });
  if (!row) throw ApiError.notFound('Inspection not found');
  return row;
}

export async function startInspection(ctx: RouteCtx, id: string): Promise<Inspection> {
  const existing = await requireInspectionInOrg(ctx, id);
  if (existing.status !== 'SCHEDULED') {
    throw ApiError.conflict('Inspection can only be started from SCHEDULED');
  }

  const updated = await db.inspection.update({
    where: { id },
    data: {
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      staffUserId: ctx.userId,
    },
  });

  await writeAudit(ctx, {
    entityType: 'Inspection',
    entityId: id,
    action: 'inspection.start',
    payload: { staffUserId: ctx.userId },
  });

  return updated;
}

export async function recordArea(
  ctx: RouteCtx,
  inspectionId: string,
  input: z.infer<typeof recordAreaSchema>,
): Promise<InspectionArea> {
  await requireInspectionInOrg(ctx, inspectionId);

  const area = await db.inspectionArea.create({
    data: {
      inspectionId,
      name: input.name,
      orderIndex: input.orderIndex,
    },
  });

  await writeAudit(ctx, {
    entityType: 'InspectionArea',
    entityId: area.id,
    action: 'inspection.recordArea',
    payload: { inspectionId, name: input.name, orderIndex: input.orderIndex },
  });

  return area;
}

export async function recordItem(
  ctx: RouteCtx,
  areaId: string,
  input: z.infer<typeof recordItemSchema>,
): Promise<InspectionItem> {
  const area = await db.inspectionArea.findFirst({
    where: { id: areaId, inspection: { orgId: ctx.orgId } },
    select: { id: true, inspectionId: true },
  });
  if (!area) throw ApiError.notFound('Area not found');

  const item = await db.inspectionItem.create({
    data: {
      areaId: area.id,
      label: input.label,
      condition: input.condition as ConditionRating,
      ...(input.note !== undefined ? { note: input.note } : {}),
      ...(input.estimatedCostCents !== undefined
        ? { estimatedCostCents: input.estimatedCostCents }
        : {}),
      ...(input.responsibility !== undefined
        ? { responsibility: input.responsibility as ChargeResponsibility }
        : {}),
    },
  });

  await writeAudit(ctx, {
    entityType: 'InspectionItem',
    entityId: item.id,
    action: 'inspection.recordItem',
    payload: {
      areaId: area.id,
      inspectionId: area.inspectionId,
      label: input.label,
      condition: input.condition,
    },
  });

  return item;
}

async function buildReportData(inspectionId: string): Promise<InspectionReportData> {
  const row = await db.inspection.findUnique({
    where: { id: inspectionId },
    include: {
      org: { select: { name: true } },
      lease: { select: { id: true } },
      unit: { select: { label: true, property: { select: { name: true } } } },
      areas: {
        include: { items: { include: { photos: true } } },
      },
      signatures: true,
    },
  });
  if (!row) throw ApiError.notFound('Inspection not found');

  let staffName: string | null = null;
  if (row.staffUserId) {
    const staff = await db.user.findUnique({
      where: { id: row.staffUserId },
      select: { name: true, email: true },
    });
    staffName = staff?.name ?? staff?.email ?? null;
  }

  return {
    inspection: {
      id: row.id,
      type: row.type,
      status: row.status,
      scheduledAt: row.scheduledAt,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      signedOffAt: row.signedOffAt,
      summary: row.summary,
      staffName,
    },
    org: { name: row.org.name },
    lease: { id: row.lease.id },
    unit: { label: row.unit.label, propertyName: row.unit.property.name },
    areas: row.areas.map((a) => ({
      id: a.id,
      name: a.name,
      orderIndex: a.orderIndex,
      items: a.items.map((it) => ({
        id: it.id,
        label: it.label,
        condition: it.condition,
        note: it.note,
        estimatedCostCents: it.estimatedCostCents,
        responsibility: it.responsibility,
        photos: it.photos.map((p) => ({
          id: p.id,
          storageKey: p.storageKey,
          caption: p.caption,
        })),
      })),
    })),
    signatures: row.signatures.map((s) => ({
      id: s.id,
      signerRole: s.signerRole,
      signedName: s.signedName,
      signedAt: s.signedAt,
    })),
  };
}

export async function completeInspection(
  ctx: RouteCtx,
  id: string,
  input: z.infer<typeof completeInspectionSchema>,
): Promise<Inspection> {
  const existing = await requireInspectionInOrg(ctx, id);
  if (existing.status !== 'IN_PROGRESS') {
    throw ApiError.conflict('Inspection can only be completed from IN_PROGRESS');
  }

  const completedAt = new Date();
  await db.inspection.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      completedAt,
      ...(input.summary !== undefined ? { summary: input.summary } : {}),
    },
  });

  const reportData = await buildReportData(id);
  const pdfBuffer = await renderInspectionReport(reportData);
  const pathname = `inspections/${id}/report-${completedAt.toISOString()}.pdf`;
  const file = new File([new Uint8Array(pdfBuffer)], 'inspection-report.pdf', {
    type: 'application/pdf',
  });
  const uploaded = await currentUploader(pathname, file);

  const updated = await db.inspection.update({
    where: { id },
    data: { reportKey: uploaded.pathname },
  });

  await writeAudit(ctx, {
    entityType: 'Inspection',
    entityId: id,
    action: 'inspection.complete',
    payload: { reportKey: uploaded.pathname, summary: input.summary },
  });

  return updated;
}

export async function signInspection(
  ctx: RouteCtx,
  id: string,
  input: z.infer<typeof signInspectionSchema>,
): Promise<InspectionSignature> {
  const existing = await requireInspectionInOrg(ctx, id);

  const signature = await db.inspectionSignature.create({
    data: {
      inspectionId: id,
      signerRole: input.signerRole as Role,
      signerUserId: ctx.userId ?? null,
      signedName: input.signedName,
      ...(input.ipAddress !== undefined ? { ipAddress: input.ipAddress } : {}),
      ...(input.userAgent !== undefined ? { userAgent: input.userAgent } : {}),
    },
  });

  const isMoveIo = existing.type === 'MOVE_IN' || existing.type === 'MOVE_OUT';
  const isInterim = existing.type === 'INTERIM';
  const shouldFlip =
    existing.status !== 'SIGNED_OFF' &&
    ((isMoveIo) || (isInterim && input.signerRole === 'TENANT'));

  if (shouldFlip) {
    await db.inspection.update({
      where: { id },
      data: { status: 'SIGNED_OFF', signedOffAt: new Date() },
    });
  }

  await writeAudit(ctx, {
    entityType: 'Inspection',
    entityId: id,
    action: 'inspection.sign',
    payload: {
      signatureId: signature.id,
      signerRole: input.signerRole,
      transitionedToSignedOff: shouldFlip,
    },
  });

  return signature;
}
