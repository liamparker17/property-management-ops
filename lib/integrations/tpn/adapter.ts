import { IntegrationProvider, TpnRecommendation } from '@prisma/client';

import type { RouteCtx } from '@/lib/auth/with-org';
import { ApiError } from '@/lib/errors';
import { readDecryptedTokens } from '@/lib/services/org-integrations';

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

export type TpnResolvedConfig = {
  apiUrl: string;
  apiKey: string;
};

const NOT_CONFIGURED_MESSAGE = 'TPN not configured for this org';
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

export async function resolveTpnConfig(ctx: RouteCtx): Promise<TpnResolvedConfig> {
  // TPN_API_URL remains a platform-level shared-endpoint fallback; per-org
  // credentials live on OrgIntegration.
  const apiUrl = readEnv('TPN_API_URL');
  const tokens = await readDecryptedTokens(ctx, IntegrationProvider.TPN);
  if (!apiUrl || !tokens?.accessToken) {
    throw ApiError.conflict(NOT_CONFIGURED_MESSAGE);
  }
  return { apiUrl, apiKey: tokens.accessToken };
}

export function getTpnWebhookStubMessage() {
  return WEBHOOK_STUB_MESSAGE;
}

export async function submitCheck(
  ctx: RouteCtx,
  _payload: TpnApplicantPayload,
): Promise<TpnSubmitResult> {
  await resolveTpnConfig(ctx);
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
  resolveConfig: resolveTpnConfig,
  getWebhookStubMessage: getTpnWebhookStubMessage,
  submitCheck,
  mapResponse,
};
