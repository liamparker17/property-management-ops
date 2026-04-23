import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

let db: any;
let createApplication: any;
let submitApplication: any;
let listApplications: any;

const applicationRows = new Map<string, any>();
const applicantRows = new Map<string, any>();
const noteRows: any[] = [];
const auditCalls: any[] = [];
const notificationCalls: any[] = [];

let originalApplicationFindMany: any;
let originalApplicationFindFirst: any;
let originalApplicationCreate: any;
let originalApplicationUpdate: any;
let originalApplicantCreate: any;
let originalApplicationNoteCreate: any;
let originalTransaction: any;
let originalAuditCreate: any;
let originalUserFindMany: any;
let originalNotificationCreate: any;

before(async () => {
  const dbModule = (await import('@/lib/db')) as any;
  db = (dbModule.default ?? dbModule).db;
  originalApplicationFindMany = db.application.findMany;
  originalApplicationFindFirst = db.application.findFirst;
  originalApplicationCreate = db.application.create;
  originalApplicationUpdate = db.application.update;
  originalApplicantCreate = db.applicant.create;
  originalApplicationNoteCreate = db.applicationNote.create;
  originalTransaction = db.$transaction;
  originalAuditCreate = db.auditLog.create;
  originalUserFindMany = db.user.findMany;
  originalNotificationCreate = db.notification.create;

  db.application.findMany = async (args: any) => {
    const rows = [...applicationRows.values()];
    return rows.filter((row) => row.orgId === args.where.orgId);
  };
  db.application.findFirst = async ({ where }: any) =>
    [...applicationRows.values()].find((row) => row.id === where.id && row.orgId === where.orgId) ?? null;
  db.application.create = async ({ data }: any) => {
    const row = {
      id: `app-${applicationRows.size + 1}`,
      stage: 'DRAFT',
      decision: 'PENDING',
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
  db.applicant.create = async ({ data }: any) => {
    const row = { id: `applicant-${applicantRows.size + 1}`, createdAt: new Date(), ...data };
    applicantRows.set(row.id, row);
    return row;
  };
  db.applicationNote.create = async ({ data }: any) => {
    const note = { id: `note-${noteRows.length + 1}`, createdAt: new Date(), ...data };
    noteRows.push(note);
    return note;
  };
  db.$transaction = async (callback: any) =>
    callback({
      applicant: { create: db.applicant.create },
      application: { create: db.application.create },
      applicationNote: { create: db.applicationNote.create },
    });
  db.auditLog.create = async ({ data }: any) => {
    auditCalls.push(data);
    return { id: `audit-${auditCalls.length}`, ...data };
  };
  db.user.findMany = async () => [{ id: 'reviewer-1', role: 'ADMIN' }];
  db.notification.create = async ({ data }: any) => {
    notificationCalls.push(data);
    return { id: `notification-${notificationCalls.length}`, ...data };
  };

  const appModule = (await import('@/lib/services/applications')) as any;
  const appServices = appModule.default ?? appModule;
  createApplication = appServices.createApplication;
  submitApplication = appServices.submitApplication;
  listApplications = appServices.listApplications;
});

after(async () => {
  db.application.findMany = originalApplicationFindMany;
  db.application.findFirst = originalApplicationFindFirst;
  db.application.create = originalApplicationCreate;
  db.application.update = originalApplicationUpdate;
  db.applicant.create = originalApplicantCreate;
  db.applicationNote.create = originalApplicationNoteCreate;
  db.$transaction = originalTransaction;
  db.auditLog.create = originalAuditCreate;
  db.user.findMany = originalUserFindMany;
  db.notification.create = originalNotificationCreate;
  await db.$disconnect();
});

beforeEach(() => {
  applicationRows.clear();
  applicantRows.clear();
  noteRows.length = 0;
  auditCalls.length = 0;
  notificationCalls.length = 0;
});

const ctx = { orgId: 'org-1', userId: 'user-1', role: 'ADMIN' };

describe('applications service', () => {
  it('creates an application in draft stage and records the initial note', async () => {
    const row = await createApplication(ctx, {
      applicant: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        phone: '0820000000',
        idNumber: null,
        employer: 'Analytical Engines',
        grossMonthlyIncomeCents: 500000,
        netMonthlyIncomeCents: 420000,
      },
      application: {
        propertyId: null,
        unitId: null,
        requestedMoveIn: '2026-05-01',
        sourceChannel: 'Referral',
        notes: 'Strong referral from current landlord.',
      },
      consent: {
        consentGiven: true,
        signedName: 'Ada Lovelace',
        capturedAt: '2026-04-23T10:00:00.000Z',
      },
    });

    assert.equal(row.stage, 'DRAFT');
    assert.equal(applicantRows.size, 1);
    assert.equal(noteRows.length, 1);
    assert.equal(auditCalls.length, 1);
  });

  it('submits a draft application and prevents re-submission', async () => {
    applicationRows.set('app-1', {
      id: 'app-1',
      orgId: 'org-1',
      stage: 'DRAFT',
      applicant: { firstName: 'Ada', lastName: 'Lovelace' },
    });

    const row = await submitApplication(ctx, 'app-1');
    assert.equal(row.stage, 'SUBMITTED');
    assert.equal(notificationCalls.length, 1);

    await assert.rejects(() => submitApplication(ctx, 'app-1'));
  });

  it('lists org-scoped applications', async () => {
    applicationRows.set('app-1', { id: 'app-1', orgId: 'org-1' });
    applicationRows.set('app-2', { id: 'app-2', orgId: 'org-2' });

    const rows = await listApplications(ctx, {});
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, 'app-1');
  });
});
