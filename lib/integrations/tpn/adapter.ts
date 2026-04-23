import { TpnRecommendation } from '@prisma/client';

import { ApiError } from '@/lib/errors';

export type TpnApplicantPayload = {
  applicationId: string;
  orgId: string;
  applicant: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    idNumber: string | null;
    employer: string | null;
    grossMonthlyIncomeCents: number | null;
    netMonthlyIncomeCents: number | null;
  };
  property: {
    id: string;
    name: string;
    address: string | null;
    suburb: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
  } | null;
  unit: {
    id: string;
    label: string;
  } | null;
  requestedMoveIn: string | null;
};

export type TpnSubmitResult =
  | {
      mode: 'async';
      referenceId?: string;
      rawResponse?: unknown;
    }
  | {
      mode: 'sync';
      referenceId?: string;
      rawResponse: unknown;
    };

export type TpnMappedResponse = {
  recommendation: TpnRecommendation;
  summary: string;
  payload: unknown;
  referenceId?: string;
  reportBlobKey?: string;
};

export type TpnConfig = {
  apiUrl: string | null;
  apiKey: string | null;
  webhookSecret: string | null;
};

const NOT_CONFIGURED_MESSAGE =
  'TPN not configured. Set TPN_API_URL and TPN_API_KEY to enable screening.';
const LIVE_STUB_MESSAGE =
  'TPN live submission is still stubbed pending confirmed MRI/TPN API details.';
const WEBHOOK_STUB_MESSAGE =
  'TPN webhook is inactive in stub mode until live credentials and signature details are confirmed.';

function readEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown> | null, ...keys: string[]) {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function normalizeRecommendation(value: unknown): TpnRecommendation {
  if (typeof value !== 'string') return TpnRecommendation.UNKNOWN;

  const normalized = value.trim().toUpperCase();
  if (['PASS', 'APPROVE', 'APPROVED', 'CLEAR', 'SUCCESS'].includes(normalized)) {
    return TpnRecommendation.PASS;
  }
  if (['CAUTION', 'REFER', 'REVIEW', 'WARNING'].includes(normalized)) {
    return TpnRecommendation.CAUTION;
  }
  if (['DECLINE', 'FAIL', 'FAILED', 'REJECT', 'REJECTED'].includes(normalized)) {
    return TpnRecommendation.DECLINE;
  }

  return TpnRecommendation.UNKNOWN;
}

function buildSummary(
  record: Record<string, unknown> | null,
  recommendation: TpnRecommendation,
) {
  const explicit =
    readString(record, 'summary', 'message', 'statusMessage') ??
    readString(asRecord(record?.result), 'summary', 'message');
  if (explicit) return explicit;

  const fragments = [
    recommendation !== TpnRecommendation.UNKNOWN ? `Recommendation: ${recommendation}` : null,
    readString(record, 'score', 'creditScore', 'riskBand'),
    readString(record, 'paymentProfile', 'paymentStatus'),
    readString(record, 'employmentStatus', 'employment'),
    readString(record, 'incomeBand'),
  ].filter((value): value is string => Boolean(value));

  return fragments.length > 0 ? fragments.join(' | ') : 'TPN response recorded';
}

export function getTpnConfig(): TpnConfig {
  return {
    apiUrl: readEnv('TPN_API_URL'),
    apiKey: readEnv('TPN_API_KEY'),
    webhookSecret: readEnv('TPN_WEBHOOK_SECRET'),
  };
}

export function isTpnConfigured(config = getTpnConfig()) {
  return Boolean(config.apiUrl && config.apiKey);
}

export function assertTpnConfigured(config = getTpnConfig()) {
  if (!isTpnConfigured(config)) {
    throw ApiError.conflict(NOT_CONFIGURED_MESSAGE);
  }
  return config;
}

export function getTpnStubMessage(config = getTpnConfig()) {
  return isTpnConfigured(config) ? LIVE_STUB_MESSAGE : NOT_CONFIGURED_MESSAGE;
}

export function getTpnWebhookStubMessage(config = getTpnConfig()) {
  return isTpnConfigured(config) ? WEBHOOK_STUB_MESSAGE : NOT_CONFIGURED_MESSAGE;
}

export async function submitCheck(_payload: TpnApplicantPayload): Promise<TpnSubmitResult> {
  assertTpnConfigured();
  throw ApiError.conflict(LIVE_STUB_MESSAGE);
}

export function mapResponse(rawResponse: unknown): TpnMappedResponse {
  const record = asRecord(rawResponse);
  const nestedPayload =
    record && Object.prototype.hasOwnProperty.call(record, 'payload') ? record.payload : rawResponse;
  const nestedResult = asRecord(record?.result);
  const recommendation = normalizeRecommendation(
    readString(record, 'recommendation', 'decision', 'outcome') ??
      readString(nestedResult, 'recommendation', 'decision', 'outcome'),
  );

  return {
    recommendation,
    summary: buildSummary(record ?? nestedResult, recommendation),
    payload: nestedPayload,
    ...(readString(record, 'referenceId', 'tpnReferenceId', 'reportId', 'id')
      ? { referenceId: readString(record, 'referenceId', 'tpnReferenceId', 'reportId', 'id')! }
      : {}),
    ...(readString(record, 'reportBlobKey', 'reportPdfKey', 'pdfBlobKey')
      ? { reportBlobKey: readString(record, 'reportBlobKey', 'reportPdfKey', 'pdfBlobKey')! }
      : {}),
  };
}

export const tpnAdapter = {
  getConfig: getTpnConfig,
  isConfigured: isTpnConfigured,
  assertConfigured: assertTpnConfigured,
  getStubMessage: getTpnStubMessage,
  getWebhookStubMessage: getTpnWebhookStubMessage,
  submitCheck,
  mapResponse,
};
