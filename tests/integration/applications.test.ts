import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://pmops:pmops@localhost:5432/pmops_test';

// End-to-end lifecycle test that stitches together the real service functions:
// createApplication -> submitApplication -> (TPN PASS | waive | DECLINE) ->
// approveApplication -> convertApplicationToTenant.
//
// Uses the same in-memory db-delegate mock idiom as tests/services/*.test.ts.
// onboardTenant is exercised for real via its full delegate mocks, so the
// converted tenant/lease rows and the application CONVERTED stage transition
// are all produced by the real service pipeline.

let db: any;
let createApplication: any;
let submitApplication: any;
let approveApplication: any;
let convertApplicationToTenant: any;
let recordTpnResult: any;
let waiveTpnCheck: any;

const applicationRows = new Map<string, any>();
const applicantRows = new Map<string, any>();
const tpnRows = new Map<string, any>();
const tenantRows = new Map<string, any>();
const leaseRows = new Map<string, any>();
const userRows = new Map<string, any>();
const unitRows = new Map<string, any>();
const propertyRows = new Map<string, any>();
const orgRows = new Map<string, any>();
const noteRows: any[] = [];
const auditCalls: any[] = [];
const notificationCalls: any[] = [];

const original: Record<string, any> = {};

const ctx = { orgId: 'org-1', userId: 'user-1', role: 'ADMIN' } as const;

function hydrateApplication(row: any) {
  if (!row) return null;
  return {
    ...row,
    applicant: applicantRows.get(row.applicantId) ?? null,
    property: row.propertyId ? propertyRows.get(row.propertyId) ?? null : null,
    unit: row.unitId ? unitRows.get(row.unitId) ?? null : null,
    tpnCheck: tpnRows.get(row.id) ?? null,
  };
}

before(async () => {
  const dbModule = (await import('@/lib/db')) as any;
  db = (dbModule.default ?? dbModule).db;

  // Snapshot originals.
  original.applicationFindFirst = db.application.findFirst;
  original.applicationFindUnique = db.application.findUnique;
  original.applicationFindMany = db.application.findMany;
  original.applicationCreate = db.application.create;
  original.applicationUpdate = db.application.update;
  original.applicantCreate = db.applicant.create;
  original.applicantUpdate = db.applicant.update;
  original.applicationNoteCreate = db.applicationNote.create;
  original.tpnFindUnique = db.tpnCheck.findUnique;
  original.tpnUpsert = db.tpnCheck.upsert;
  original.tenantCreate = db.tenant.create;
  original.tenantUpdate = db.tenant.update;
  original.tenantFindFirst = db.tenant.findFirst;
  original.leaseCreate = db.lease.create;
  original.leaseFindFirst = db.lease.findFirst;
  original.userFindUnique = db.user.findUnique;
  original.userFindMany = db.user.findMany;
  original.userCreate = db.user.create;
  original.unitFindFirst = db.unit.findFirst;
  original.propertyFindFirst = db.property?.findFirst;
  original.orgFindUnique = db.org.findUnique;
  original.auditCreate = db.auditLog.create;
  original.notificationCreate = db.notification.create;
  original.transaction = db.$transaction;

  // Application delegates.
  db.application.findFirst = async ({ where }: any) =>
    hydrateApplication(
      [...applicationRows.values()].find((row) => row.id === where.id && row.orgId === where.orgId) ?? null,
    );
  db.application.findUnique = async ({ where }: any) =>
    hydrateApplication(applicationRows.get(where.id) ?? null);
  db.application.findMany = async ({ where }: any) => {
    const rows = [...applicationRows.values()].filter((row) => row.orgId === where.orgId);
    return rows.map(hydrateApplication);
  };
  db.application.create = async ({ data }: any) => {
    const row = {
      id: `app-${applicationRows.size + 1}`,
      stage: 'DRAFT',
      decision: 'PENDING',
      decisionReason: null,
      decidedAt: null,
      convertedTenantId: null,
      convertedLeaseId: null,
      assignedReviewerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };
    applicationRows.set(row.id, row);
    return row;
  };
  db.application.update = async ({ where, data }: any) => {
    const current = applicationRows.get(where.id);
    const next = { ...current, ...data, updatedAt: new Date() };
    applicationRows.set(where.id, next);
    return next;
  };

  // Applicant delegates.
  db.applicant.create = async ({ data }: any) => {
    const row = { id: `applicant-${applicantRows.size + 1}`, createdAt: new Date(), ...data };
    applicantRows.set(row.id, row);
    return row;
  };
  db.applicant.update = async ({ where, data }: any) => {
    const current = applicantRows.get(where.id);
    const next = { ...current, ...data };
    applicantRows.set(where.id, next);
    return next;
  };

  db.applicationNote.create = async ({ data }: any) => {
    const note = { id: `note-${noteRows.length + 1}`, createdAt: new Date(), ...data };
    noteRows.push(note);
    return note;
  };

  // TPN delegates.
  db.tpnCheck.findUnique = async ({ where }: any) => tpnRows.get(where.applicationId) ?? null;
  db.tpnCheck.upsert = async ({ where, update, create }: any) => {
    const existing = tpnRows.get(where.applicationId);
    const next = existing
      ? { ...existing, ...update }
      : {
          id: `tpn-${tpnRows.size + 1}`,
          recommendation: null,
          summary: null,
          reportPayload: null,
          reportBlobKey: null,
          waivedReason: null,
          waivedById: null,
          receivedAt: null,
          ...create,
        };
    tpnRows.set(where.applicationId, next);
    return next;
  };

  // Tenant/Lease/User/Unit/Org delegates (for onboardTenant path).
  db.tenant.create = async ({ data }: any) => {
    const row = { id: `tenant-${tenantRows.size + 1}`, createdAt: new Date(), updatedAt: new Date(), ...data };
    tenantRows.set(row.id, row);
    return row;
  };
  db.tenant.update = async ({ where, data }: any) => {
    const current = tenantRows.get(where.id);
    const next = { ...current, ...data, updatedAt: new Date() };
    tenantRows.set(where.id, next);
    return next;
  };
  db.tenant.findFirst = async ({ where }: any) =>
    [...tenantRows.values()].find((row) => row.id === where.id && row.orgId === where.orgId) ?? null;

  db.lease.create = async ({ data }: any) => {
    const row = { id: `lease-${leaseRows.size + 1}`, createdAt: new Date(), updatedAt: new Date(), ...data };
    leaseRows.set(row.id, row);
    return row;
  };
  db.lease.findFirst = async ({ where }: any) => {
    if (where.id) {
      return [...leaseRows.values()].find((row) => row.id === where.id && row.orgId === where.orgId) ?? null;
    }
    return [...leaseRows.values()].find((row) => {
      if (row.unitId !== where.unitId) return false;
      if (!where.state?.in?.includes(row.state)) return false;
      return row.startDate <= where.endDate.gte && row.endDate >= where.startDate.lte;
    }) ?? null;
  };

  db.user.findUnique = async ({ where }: any) =>
    [...userRows.values()].find((row) => row.email === where.email) ?? null;
  db.user.findMany = async () => [{ id: 'reviewer-1', role: 'ADMIN' }];
  db.user.create = async ({ data }: any) => {
    const row = { id: `user-${userRows.size + 1}`, ...data };
    userRows.set(row.id, row);
    return row;
  };

  db.unit.findFirst = async ({ where }: any) =>
    [...unitRows.values()].find((row) => {
      if (where.id && row.id !== where.id) return false;
      if (where.property?.orgId && row.orgId !== where.property.orgId) return false;
      if (where.orgId && row.orgId !== where.orgId) return false;
      return true;
    }) ?? null;

  if (db.property) {
    db.property.findFirst = async ({ where }: any) =>
      [...propertyRows.values()].find((row) => row.id === where.id && row.orgId === where.orgId) ?? null;
  }

  db.org.findUnique = async ({ where }: any) => orgRows.get(where.id) ?? null;

  db.auditLog.create = async ({ data }: any) => {
    auditCalls.push(data);
    return { id: `audit-${auditCalls.length}`, ...data };
  };

  db.notification.create = async ({ data }: any) => {
    notificationCalls.push(data);
    return { id: `notification-${notificationCalls.length}`, ...data };
  };

  db.$transaction = async (callback: any) =>
    callback({
      applicant: { create: db.applicant.create },
      application: {
        create: db.application.create,
        update: db.application.update,
        findFirst: db.application.findFirst,
      },
      applicationNote: { create: db.applicationNote.create },
      tenant: { create: db.tenant.create, update: db.tenant.update },
      user: { create: db.user.create },
      lease: { create: db.lease.create },
    });

  // Import service modules after delegates are patched.
  const appModule = (await import('@/lib/services/applications')) as any;
  createApplication = appModule.createApplication;
  submitApplication = appModule.submitApplication;

  const vettingModule = (await import('@/lib/services/vetting')) as any;
  approveApplication = vettingModule.approveApplication;
  convertApplicationToTenant = vettingModule.convertApplicationToTenant;

  const tpnModule = (await import('@/lib/services/tpn')) as any;
  recordTpnResult = tpnModule.recordTpnResult;
  waiveTpnCheck = tpnModule.waiveTpnCheck;
});

after(async () => {
  db.application.findFirst = original.applicationFindFirst;
  db.application.findUnique = original.applicationFindUnique;
  db.application.findMany = original.applicationFindMany;
  db.application.create = original.applicationCreate;
  db.application.update = original.applicationUpdate;
  db.applicant.create = original.applicantCreate;
  db.applicant.update = original.applicantUpdate;
  db.applicationNote.create = original.applicationNoteCreate;
  db.tpnCheck.findUnique = original.tpnFindUnique;
  db.tpnCheck.upsert = original.tpnUpsert;
  db.tenant.create = original.tenantCreate;
  db.tenant.update = original.tenantUpdate;
  db.tenant.findFirst = original.tenantFindFirst;
  db.lease.create = original.leaseCreate;
  db.lease.findFirst = original.leaseFindFirst;
  db.user.findUnique = original.userFindUnique;
  db.user.findMany = original.userFindMany;
  db.user.create = original.userCreate;
  db.unit.findFirst = original.unitFindFirst;
  if (db.property && original.propertyFindFirst) {
    db.property.findFirst = original.propertyFindFirst;
  }
  db.org.findUnique = original.orgFindUnique;
  db.auditLog.create = original.auditCreate;
  db.notification.create = original.notificationCreate;
  db.$transaction = original.transaction;
  await db.$disconnect();
});

beforeEach(() => {
  applicationRows.clear();
  applicantRows.clear();
  tpnRows.clear();
  tenantRows.clear();
  leaseRows.clear();
  userRows.clear();
  unitRows.clear();
  propertyRows.clear();
  orgRows.clear();
  noteRows.length = 0;
  auditCalls.length = 0;
  notificationCalls.length = 0;

  // Seed minimal tenancy graph: one org, one property, one unit, one reviewer user.
  orgRows.set('org-1', { id: 'org-1', name: 'Acme Property Management' });
  propertyRows.set('property-1', {
    id: 'property-1',
    orgId: 'org-1',
    name: 'Green Oaks',
    addressLine1: '12 Main Road',
    addressLine2: null,
    suburb: 'Rosebank',
    city: 'Johannesburg',
    province: 'GP',
    postalCode: '2196',
    deletedAt: null,
  });
  unitRows.set('unit-1', {
    id: 'unit-1',
    orgId: 'org-1',
    propertyId: 'property-1',
    label: '2A',
  });
  userRows.set('user-1', {
    id: 'user-1',
    orgId: 'org-1',
    email: 'pm@example.com',
    role: 'ADMIN',
  });
});

const applicantInput = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: '0820000000',
  idNumber: '9001015009087',
  employer: 'Analytical Engines',
  grossMonthlyIncomeCents: 500000,
  netMonthlyIncomeCents: 420000,
};

const applicationInput = {
  propertyId: null,
  unitId: null,
  requestedMoveIn: '2026-05-01',
  sourceChannel: 'Referral',
  notes: 'Referred by existing landlord.',
};

const consentInput = {
  consentGiven: true as const,
  signedName: 'Ada Lovelace',
  capturedAt: '2026-04-23T10:00:00.000Z',
};

async function createAndSubmit() {
  const created = await createApplication(ctx, {
    applicant: applicantInput,
    application: applicationInput,
    consent: consentInput,
  });

  // Force the unit assignment (the zod schema rejects the test unit id because
  // it is not a real cuid, so we set it directly on the seeded row post-create).
  const app = applicationRows.get(created.id);
  app.unitId = 'unit-1';
  app.propertyId = 'property-1';
  applicationRows.set(created.id, app);

  // Ensure applicant consent is recorded (createApplication already sets this,
  // but we defensively guarantee it here).
  const applicant = applicantRows.get(created.applicantId);
  applicant.tpnConsentGiven = true;
  applicantRows.set(applicant.id, applicant);

  const submitted = await submitApplication(ctx, created.id);
  return { applicationId: created.id, applicantId: created.applicantId, submitted };
}

// Literal conversion input. The outer convertApplicationToTenant boundary uses
// convertApplicationSchema (not onboardTenantSchema), but the test bypasses
// zod validation here because we're calling the service function directly.
const convertInput = {
  startDate: '2026-05-01',
  endDate: '2027-04-30',
  rentAmountCents: 125000,
  depositAmountCents: 125000,
  createPortalUser: false,
} as const;

describe('application lifecycle (integration)', () => {
  it('Path A: create -> submit -> TPN PASS -> approve -> convert', async () => {
    const { applicationId } = await createAndSubmit();

    assert.equal(applicationRows.get(applicationId)?.stage, 'SUBMITTED');

    // Simulate TPN returning a PASS result via the real recordTpnResult path.
    const tpnCheck = await recordTpnResult(applicationId, {
      referenceId: 'tpn-ref-pass',
      recommendation: 'PASS',
      summary: 'Clean profile.',
      payload: { bureau: 'TPN', score: 702 },
    });

    assert.equal(tpnCheck.status, 'RECEIVED');
    assert.equal(tpnCheck.recommendation, 'PASS');
    // recordTpnResult transitions SUBMITTED -> VETTING.
    assert.equal(applicationRows.get(applicationId)?.stage, 'VETTING');

    const approved = await approveApplication(ctx, applicationId, { decision: 'APPROVED' });
    assert.equal(approved.stage, 'APPROVED');
    assert.equal(approved.decision, 'APPROVED');
    assert.ok(approved.decidedAt instanceof Date);

    const result = await convertApplicationToTenant(ctx, applicationId, convertInput);

    assert.ok(result.tenant);
    assert.ok(result.lease);
    assert.equal(result.application.stage, 'CONVERTED');
    assert.equal(result.application.convertedTenantId, result.tenant.id);
    assert.equal(result.application.convertedLeaseId, result.lease.id);
    assert.equal(result.lease.state, 'DRAFT');
    assert.equal(
      auditCalls.some((call) => call.entityType === 'Application' && call.action === 'converted'),
      true,
    );
  });

  it('Path B: create -> submit -> waive TPN -> approve -> convert', async () => {
    const { applicationId } = await createAndSubmit();

    const waived = await waiveTpnCheck(
      ctx,
      applicationId,
      'Applicant long-standing tenant with verified payment history on file.',
    );

    assert.equal(waived.status, 'WAIVED');
    assert.equal(waived.waivedById, 'user-1');

    const approved = await approveApplication(ctx, applicationId, { decision: 'APPROVED' });
    assert.equal(approved.stage, 'APPROVED');
    assert.equal(approved.decision, 'APPROVED');

    const result = await convertApplicationToTenant(ctx, applicationId, convertInput);

    assert.equal(result.application.stage, 'CONVERTED');
    assert.equal(result.application.convertedTenantId, result.tenant.id);
    assert.equal(result.application.convertedLeaseId, result.lease.id);
    assert.equal(tenantRows.size, 1);
    assert.equal(leaseRows.size, 1);
  });

  it('Path C: TPN DECLINE recommendation blocks approval', async () => {
    const { applicationId } = await createAndSubmit();

    // Seed a RECEIVED+DECLINE tpn check directly.
    tpnRows.set(applicationId, {
      id: 'tpn-decline',
      applicationId,
      status: 'RECEIVED',
      recommendation: 'DECLINE',
      summary: 'Adverse history on record.',
      waivedReason: null,
      waivedById: null,
      receivedAt: new Date(),
    });

    const stageBefore = applicationRows.get(applicationId)?.stage;

    await assert.rejects(() => approveApplication(ctx, applicationId, { decision: 'APPROVED' }));

    const row = applicationRows.get(applicationId);
    assert.notEqual(row?.stage, 'APPROVED');
    assert.equal(row?.stage, stageBefore);
  });
});
