import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

let db: any;
let approveApplication: any;
let declineApplication: any;
let convertApplicationToTenant: any;
let onboardTenantSchema: any;

const applicationRows = new Map<string, any>();
const tenantRows = new Map<string, any>();
const leaseRows = new Map<string, any>();
const userRows = new Map<string, any>();
const unitRows = new Map<string, any>();
const auditCalls: any[] = [];
const noteCalls: any[] = [];

const original: Record<string, any> = {};

const ctx = { orgId: 'org-1', userId: 'user-1', role: 'ADMIN' };

function seedApplication(overrides: Record<string, unknown> = {}) {
  const row = {
    id: 'app-1',
    orgId: 'org-1',
    unitId: 'unit-1',
    stage: 'SUBMITTED',
    decision: 'PENDING',
    decisionReason: null,
    decidedAt: null,
    convertedTenantId: null,
    convertedLeaseId: null,
    applicant: {
      id: 'applicant-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phone: '0820000000',
      idNumber: '9001010000000',
      tpnConsentGiven: true,
    },
    tpnCheck: {
      id: 'tpn-1',
      applicationId: 'app-1',
      status: 'RECEIVED',
      recommendation: 'PASS',
      waivedReason: null,
    },
    ...overrides,
  };

  applicationRows.set(row.id, row);
  return row;
}

before(async () => {
  const dbModule = (await import('@/lib/db')) as any;
  db = (dbModule.default ?? dbModule).db;

  original.applicationFindFirst = db.application.findFirst;
  original.applicationUpdate = db.application.update;
  original.applicationNoteCreate = db.applicationNote.create;
  original.tenantCreate = db.tenant.create;
  original.tenantUpdate = db.tenant.update;
  original.tenantFindFirst = db.tenant.findFirst;
  original.leaseCreate = db.lease.create;
  original.leaseFindFirst = db.lease.findFirst;
  original.userFindUnique = db.user.findUnique;
  original.userCreate = db.user.create;
  original.unitFindFirst = db.unit.findFirst;
  original.orgFindUnique = db.org.findUnique;
  original.transaction = db.$transaction;
  original.auditCreate = db.auditLog.create;

  db.application.findFirst = async ({ where }: any) =>
    [...applicationRows.values()].find((row) => row.id === where.id && row.orgId === where.orgId) ?? null;

  db.application.update = async ({ where, data }: any) => {
    const current = applicationRows.get(where.id);
    const next = { ...current, ...data };
    applicationRows.set(where.id, next);
    return next;
  };

  db.applicationNote.create = async ({ data }: any) => {
    const note = { id: `note-${noteCalls.length + 1}`, ...data };
    noteCalls.push(note);
    return note;
  };

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

  db.user.create = async ({ data }: any) => {
    const row = { id: `user-${userRows.size + 1}`, ...data };
    userRows.set(row.id, row);
    return row;
  };

  db.unit.findFirst = async ({ where }: any) =>
    [...unitRows.values()].find((row) => row.id === where.id && row.orgId === where.property.orgId) ?? null;

  db.org.findUnique = async () => ({ name: 'Acme Property Management' });

  db.$transaction = async (callback: any) =>
    callback({
      application: {
        findFirst: db.application.findFirst,
        update: db.application.update,
      },
      tenant: {
        create: db.tenant.create,
        update: db.tenant.update,
      },
      user: {
        create: db.user.create,
      },
      lease: {
        create: db.lease.create,
      },
    });

  db.auditLog.create = async ({ data }: any) => {
    auditCalls.push(data);
    return { id: `audit-${auditCalls.length}`, ...data };
  };

  const vettingModule = (await import('@/lib/services/vetting')) as any;
  approveApplication = vettingModule.approveApplication;
  declineApplication = vettingModule.declineApplication;
  convertApplicationToTenant = vettingModule.convertApplicationToTenant;

  const onboardingSchemaModule = (await import('@/lib/zod/onboarding')) as any;
  onboardTenantSchema = onboardingSchemaModule.onboardTenantSchema;
});

after(async () => {
  db.application.findFirst = original.applicationFindFirst;
  db.application.update = original.applicationUpdate;
  db.applicationNote.create = original.applicationNoteCreate;
  db.tenant.create = original.tenantCreate;
  db.tenant.update = original.tenantUpdate;
  db.tenant.findFirst = original.tenantFindFirst;
  db.lease.create = original.leaseCreate;
  db.lease.findFirst = original.leaseFindFirst;
  db.user.findUnique = original.userFindUnique;
  db.user.create = original.userCreate;
  db.unit.findFirst = original.unitFindFirst;
  db.org.findUnique = original.orgFindUnique;
  db.$transaction = original.transaction;
  db.auditLog.create = original.auditCreate;
  await db.$disconnect();
});

beforeEach(() => {
  applicationRows.clear();
  tenantRows.clear();
  leaseRows.clear();
  userRows.clear();
  unitRows.clear();
  auditCalls.length = 0;
  noteCalls.length = 0;

  unitRows.set('unit-1', { id: 'unit-1', orgId: 'org-1' });
});

describe('vetting service', () => {
  it('blocks approval when TPN status is not received or waived', async () => {
    for (const status of ['NOT_STARTED', 'REQUESTED', 'FAILED']) {
      seedApplication({
        tpnCheck: {
          id: `tpn-${status}`,
          applicationId: 'app-1',
          status,
          recommendation: 'PASS',
        },
      });

      await assert.rejects(() => approveApplication(ctx, 'app-1', { decision: 'APPROVED' }), {
        name: 'Error',
      });
      applicationRows.clear();
    }
  });

  it('blocks approval on a declined TPN recommendation', async () => {
    seedApplication({
      tpnCheck: {
        id: 'tpn-1',
        applicationId: 'app-1',
        status: 'RECEIVED',
        recommendation: 'DECLINE',
      },
    });

    await assert.rejects(() => approveApplication(ctx, 'app-1', { decision: 'APPROVED' }));
  });

  it('allows approval on PASS and requires an override reason for CAUTION', async () => {
    seedApplication();

    const approved = await approveApplication(ctx, 'app-1', { decision: 'APPROVED', note: 'Looks good' });
    assert.equal(approved.stage, 'APPROVED');
    assert.equal(approved.decision, 'APPROVED');
    assert.equal(noteCalls.length, 1);

    applicationRows.clear();
    noteCalls.length = 0;

    seedApplication({
      tpnCheck: {
        id: 'tpn-2',
        applicationId: 'app-1',
        status: 'RECEIVED',
        recommendation: 'CAUTION',
      },
    });

    await assert.rejects(() => approveApplication(ctx, 'app-1', { decision: 'APPROVED' }));

    const cautioned = await approveApplication(ctx, 'app-1', {
      decision: 'APPROVED',
      overrideReason: 'Stable income history offsets the caution flag.',
    });
    assert.equal(cautioned.stage, 'APPROVED');
    assert.equal(cautioned.decisionReason, 'Stable income history offsets the caution flag.');
  });

  it('allows approval when the TPN check was waived', async () => {
    seedApplication({
      applicant: {
        id: 'applicant-1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        phone: '0820000000',
        idNumber: '9001010000000',
        tpnConsentGiven: false,
      },
      tpnCheck: {
        id: 'tpn-3',
        applicationId: 'app-1',
        status: 'WAIVED',
        recommendation: null,
        waivedReason: 'Manual waiver approved by PM.',
      },
    });

    const approved = await approveApplication(ctx, 'app-1', { decision: 'APPROVED' });
    assert.equal(approved.stage, 'APPROVED');
    assert.equal(auditCalls.at(-1)?.action, 'approved');
  });

  it('declines an application with a reason', async () => {
    seedApplication();

    const declined = await declineApplication(ctx, 'app-1', {
      decision: 'DECLINED',
      reason: 'Income did not support the requested rent.',
    });

    assert.equal(declined.stage, 'DECLINED');
    assert.equal(declined.decision, 'DECLINED');
    assert.equal(declined.decisionReason, 'Income did not support the requested rent.');
  });

  it('converts an approved application into one tenant and one draft lease', async () => {
    seedApplication({
      stage: 'APPROVED',
      decision: 'APPROVED',
    });

    const parsed = onboardTenantSchema.parse({
      fromApplicationId: 'clzzzzzzzzzzzzzzzzzzzzzzz',
      startDate: '2026-05-01',
      endDate: '2027-04-30',
      rentAmountCents: 125000,
      depositAmountCents: 125000,
      heldInTrustAccount: false,
      sendInvite: false,
      sendSmsInvite: false,
    });

    const result = await convertApplicationToTenant(ctx, 'app-1', {
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      rentAmountCents: parsed.rentAmountCents,
      depositAmountCents: parsed.depositAmountCents,
      createPortalUser: false,
    });

    assert.equal(tenantRows.size, 1);
    assert.equal(leaseRows.size, 1);
    assert.equal(result.application.stage, 'CONVERTED');
    assert.equal(result.application.convertedTenantId, result.tenant.id);
    assert.equal(result.application.convertedLeaseId, result.lease.id);
    assert.equal(result.lease.state, 'DRAFT');
    assert.equal(result.tenant.firstName, 'Ada');
    assert.equal(auditCalls.some((call) => call.entityType === 'Application' && call.action === 'converted'), true);
  });
});
