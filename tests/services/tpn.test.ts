import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, beforeEach, describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://pmops:pmops@localhost:5432/pmops_test';
process.env.INTEGRATION_SECRET_KEY ??= randomBytes(32).toString('hex');

let db: any;
let tpnAdapter: any;
let captureTpnConsent: any;
let getTpnCheck: any;
let recordTpnResult: any;
let requestTpnCheck: any;
let waiveTpnCheck: any;

const applicationRows = new Map<string, any>();
const applicantRows = new Map<string, any>();
const tpnRows = new Map<string, any>();
const orgIntegrationRows = new Map<string, any>();
const auditCalls: any[] = [];

let originalApplicationFindFirst: any;
let originalApplicationFindUnique: any;
let originalApplicationUpdate: any;
let originalApplicantUpdate: any;
let originalTpnFindUnique: any;
let originalTpnUpsert: any;
let originalAuditCreate: any;
let originalSubmitCheck: any;
let originalOrgIntegrationFindUnique: any;

function hydrateApplication(row: any) {
  if (!row) return null;
  return {
    ...row,
    applicant: applicantRows.get(row.applicantId) ?? null,
    property: row.property ?? null,
    unit: row.unit ?? null,
    tpnCheck: tpnRows.get(row.id) ?? null,
  };
}

before(async () => {
  const dbModule = (await import('@/lib/db')) as any;
  db = (dbModule.default ?? dbModule).db;

  originalApplicationFindFirst = db.application.findFirst;
  originalApplicationFindUnique = db.application.findUnique;
  originalApplicationUpdate = db.application.update;
  originalApplicantUpdate = db.applicant.update;
  originalTpnFindUnique = db.tpnCheck.findUnique;
  originalTpnUpsert = db.tpnCheck.upsert;
  originalAuditCreate = db.auditLog.create;
  originalOrgIntegrationFindUnique = db.orgIntegration.findUnique;

  db.application.findFirst = async ({ where }: any) =>
    hydrateApplication(
      [...applicationRows.values()].find((row) => row.id === where.id && row.orgId === where.orgId) ?? null,
    );
  db.application.findUnique = async ({ where }: any) =>
    hydrateApplication(applicationRows.get(where.id) ?? null);
  db.application.update = async ({ where, data }: any) => {
    const current = applicationRows.get(where.id);
    const next = { ...current, ...data, updatedAt: new Date('2026-04-23T10:30:00.000Z') };
    applicationRows.set(where.id, next);
    return next;
  };
  db.applicant.update = async ({ where, data }: any) => {
    const current = applicantRows.get(where.id);
    const next = { ...current, ...data };
    applicantRows.set(where.id, next);
    return next;
  };
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
  db.auditLog.create = async ({ data }: any) => {
    auditCalls.push(data);
    return { id: `audit-${auditCalls.length}`, ...data };
  };
  db.orgIntegration.findUnique = async ({ where }: any) =>
    orgIntegrationRows.get(
      `${where.orgId_provider.orgId}:${where.orgId_provider.provider}`,
    ) ?? null;

  const adapterModule = (await import('@/lib/integrations/tpn/adapter')) as any;
  tpnAdapter = adapterModule.tpnAdapter;
  originalSubmitCheck = tpnAdapter.submitCheck;

  const serviceModule = (await import('@/lib/services/tpn')) as any;
  const services = serviceModule.default ?? serviceModule;
  ({
    captureTpnConsent,
    getTpnCheck,
    recordTpnResult,
    requestTpnCheck,
    waiveTpnCheck,
  } = services);
});

after(async () => {
  db.application.findFirst = originalApplicationFindFirst;
  db.application.findUnique = originalApplicationFindUnique;
  db.application.update = originalApplicationUpdate;
  db.applicant.update = originalApplicantUpdate;
  db.tpnCheck.findUnique = originalTpnFindUnique;
  db.tpnCheck.upsert = originalTpnUpsert;
  db.auditLog.create = originalAuditCreate;
  db.orgIntegration.findUnique = originalOrgIntegrationFindUnique;
  tpnAdapter.submitCheck = originalSubmitCheck;
  delete process.env.TPN_API_URL;
  await db.$disconnect();
});

beforeEach(() => {
  applicationRows.clear();
  applicantRows.clear();
  tpnRows.clear();
  orgIntegrationRows.clear();
  auditCalls.length = 0;
  tpnAdapter.submitCheck = originalSubmitCheck;
  delete process.env.TPN_API_URL;

  applicantRows.set('applicant-1', {
    id: 'applicant-1',
    orgId: 'org-1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    phone: '0820000000',
    idNumber: '9001015009087',
    employer: 'Analytical Engines',
    grossMonthlyIncomeCents: 500000,
    netMonthlyIncomeCents: 420000,
    tpnConsentGiven: false,
    tpnConsentAt: null,
    tpnConsentCapturedById: null,
  });
  applicationRows.set('app-1', {
    id: 'app-1',
    orgId: 'org-1',
    applicantId: 'applicant-1',
    requestedMoveIn: new Date('2026-05-01T00:00:00.000Z'),
    stage: 'SUBMITTED',
    property: {
      id: 'property-1',
      name: 'Green Oaks',
      address: '12 Main Road',
      suburb: 'Rosebank',
      city: 'Johannesburg',
      province: 'GP',
      postalCode: '2196',
    },
    unit: {
      id: 'unit-1',
      label: '2A',
    },
  });
});

const ctx = {
  orgId: 'org-1',
  userId: 'user-1',
  role: 'ADMIN',
} as const;

describe('tpn service', () => {
  it('captures applicant consent for the matching application', async () => {
    const applicant = await captureTpnConsent(ctx, 'app-1', {
      applicantId: 'applicant-1',
      consentGiven: true,
      signedName: 'Ada Lovelace',
      capturedAt: '2026-04-23T10:00:00.000Z',
    });

    assert.equal(applicant.tpnConsentGiven, true);
    assert.equal(auditCalls.length, 1);
    assert.equal(auditCalls[0]?.entityType, 'Applicant');
  });

  it('returns null when no TPN check exists yet', async () => {
    const check = await getTpnCheck(ctx, 'app-1');
    assert.equal(check, null);
  });

  it('refuses to request screening when TPN is not configured', async () => {
    applicantRows.get('applicant-1').tpnConsentGiven = true;

    await assert.rejects(() => requestTpnCheck(ctx, 'app-1'), {
      code: 'CONFLICT',
      status: 409,
      message: 'TPN not configured for this org',
    });
  });

  it('creates a REQUESTED TPN row when the adapter accepts the request', async () => {
    applicantRows.get('applicant-1').tpnConsentGiven = true;
    process.env.TPN_API_URL = 'https://example.test/tpn';
    orgIntegrationRows.set('org-1:TPN', {
      id: 'int-1',
      orgId: 'org-1',
      provider: 'TPN',
      status: 'CONNECTED',
      accessTokenCipher: 'x',
      refreshTokenCipher: null,
      tokenExpiresAt: null,
    });
    tpnAdapter.submitCheck = async () => ({
      mode: 'async',
      referenceId: 'tpn-ref-1',
    });

    const check = await requestTpnCheck(ctx, 'app-1');

    assert.equal(check.status, 'REQUESTED');
    assert.equal(check.tpnReferenceId, 'tpn-ref-1');
    assert.equal(applicationRows.get('app-1')?.stage, 'VETTING');
    assert.equal(auditCalls.length, 1);
    assert.equal(auditCalls[0]?.entityType, 'TpnCheck');
  });

  it('records a received TPN result with a mapped summary and system audit', async () => {
    const check = await recordTpnResult('app-1', {
      referenceId: 'tpn-ref-2',
      recommendation: 'PASS',
      summary: 'Clear rental history and acceptable credit profile.',
      payload: { bureau: 'TPN', score: 702 },
    });

    assert.equal(check.status, 'RECEIVED');
    assert.equal(check.recommendation, 'PASS');
    assert.equal(check.summary, 'Clear rental history and acceptable credit profile.');
    assert.equal(check.tpnReferenceId, 'tpn-ref-2');
    assert.equal(auditCalls.length, 1);
    assert.equal(auditCalls[0]?.actorUserId, null);
  });

  it('waives the TPN check and records the waiver reason', async () => {
    const check = await waiveTpnCheck(
      ctx,
      'app-1',
      'Manual override approved because the prior verified report is still valid.',
    );

    assert.equal(check.status, 'WAIVED');
    assert.equal(check.waivedById, 'user-1');
    assert.match(check.waivedReason, /prior verified report/i);
    assert.equal(applicationRows.get('app-1')?.stage, 'VETTING');
    assert.equal(auditCalls.length, 1);
  });
});
