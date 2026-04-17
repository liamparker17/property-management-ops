// SMS delivery via SMS Gateway for Android (https://sms-gate.app) — cloud mode.
// POPIA NOTE: cloud mode routes recipient phone numbers through a third-party
// server. Before using in production, either (a) disclose in the privacy policy
// and obtain consent, or (b) switch to local/private server mode and set
// SMS_GATEWAY_URL to the self-hosted endpoint. End-to-end encryption is
// available in the app settings and should be enabled for production.

const DEFAULT_CLOUD_URL = 'https://api.sms-gate.app/3rdparty/v1/message';

export type SendResult = { sent: boolean; reason?: string };

function creds() {
  const username = process.env.SMS_GATEWAY_USER;
  const password = process.env.SMS_GATEWAY_PASSWORD;
  if (!username || !password) return null;
  return { username, password };
}

function endpoint() {
  return process.env.SMS_GATEWAY_URL?.trim() || DEFAULT_CLOUD_URL;
}

async function postMessage(text: string, phoneNumbers: string[]): Promise<SendResult> {
  if (phoneNumbers.length === 0) return { sent: false, reason: 'No recipients' };
  const c = creds();
  if (!c) return { sent: false, reason: 'SMS_GATEWAY_USER / SMS_GATEWAY_PASSWORD not configured' };
  const auth = Buffer.from(`${c.username}:${c.password}`).toString('base64');
  try {
    const res = await fetch(endpoint(), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        textMessage: { text },
        phoneNumbers,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { sent: false, reason: `SMS gateway ${res.status}: ${body.slice(0, 200) || res.statusText}` };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : 'Unknown SMS error' };
  }
}

function normalizePhone(raw: string): string | null {
  const trimmed = raw.replace(/[\s-]/g, '');
  if (/^\+[1-9]\d{6,14}$/.test(trimmed)) return trimmed;
  if (/^0\d{9}$/.test(trimmed)) return `+27${trimmed.slice(1)}`;
  return null;
}

function opsRecipients(): string[] {
  const raw = process.env.OPS_SMS_RECIPIENTS?.trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => normalizePhone(s.trim()))
    .filter((s): s is string => Boolean(s));
}

function brand() {
  return process.env.EMAIL_FROM_NAME?.trim() || 'PMOps';
}

function loginUrl(appUrl: string) {
  return `${appUrl.replace(/\/$/, '')}/login`;
}

export async function sendTenantInviteSms(args: {
  to: string;
  tenantName: string;
  orgName: string;
  tempPassword: string;
  appUrl: string;
}): Promise<SendResult> {
  const phone = normalizePhone(args.to);
  if (!phone) return { sent: false, reason: `Invalid phone number: ${args.to}` };

  const text = [
    `Hi ${args.tenantName.split(' ')[0] || args.tenantName},`,
    `${args.orgName} has set up your tenant portal.`,
    `Login: ${loginUrl(args.appUrl)}`,
    `Temp password: ${args.tempPassword}`,
    `Please change it after signing in.`,
  ].join(' ');

  return postMessage(text, [phone]);
}

// ---------- Ops (PM / admin) notifications ----------

async function sendOpsSms(text: string): Promise<SendResult> {
  const recipients = opsRecipients();
  if (recipients.length === 0) {
    return { sent: false, reason: 'OPS_SMS_RECIPIENTS not configured' };
  }
  return postMessage(text, recipients);
}

export function sendMaintenanceCreatedOpsSms(args: {
  ticketTitle: string;
  priority: string;
  tenantName: string;
  unitLabel: string;
}): Promise<SendResult> {
  const text = `[${brand()}] New maintenance (${args.priority}) from ${args.tenantName} @ ${args.unitLabel}: ${truncate(args.ticketTitle, 80)}`;
  return sendOpsSms(text);
}

export function sendLeaseSignedOpsSms(args: {
  tenantName: string;
  unitLabel: string;
}): Promise<SendResult> {
  const text = `[${brand()}] Lease signed by ${args.tenantName} @ ${args.unitLabel}. Activate in the staff portal.`;
  return sendOpsSms(text);
}

export function sendReviewRequestOpsSms(args: {
  tenantName: string;
  unitLabel: string;
  clauseExcerpt: string;
}): Promise<SendResult> {
  const text = `[${brand()}] ${args.tenantName} flagged a lease clause @ ${args.unitLabel}: "${truncate(args.clauseExcerpt, 80)}"`;
  return sendOpsSms(text);
}

// ---------- Tenant notifications ----------

export async function sendMaintenanceCreatedTenantSms(args: {
  to: string;
  tenantName: string;
  ticketTitle: string;
}): Promise<SendResult> {
  const phone = normalizePhone(args.to);
  if (!phone) return { sent: false, reason: `Invalid phone number: ${args.to}` };
  const firstName = args.tenantName.split(' ')[0] || args.tenantName;
  const text = `Hi ${firstName}, we've logged your maintenance request: "${truncate(args.ticketTitle, 80)}". Your property manager will update you shortly. — ${brand()}`;
  return postMessage(text, [phone]);
}

export async function sendMaintenanceStatusTenantSms(args: {
  to: string;
  tenantName: string;
  ticketTitle: string;
  status: string;
}): Promise<SendResult> {
  const phone = normalizePhone(args.to);
  if (!phone) return { sent: false, reason: `Invalid phone number: ${args.to}` };
  const firstName = args.tenantName.split(' ')[0] || args.tenantName;
  const readable = args.status.replace(/_/g, ' ').toLowerCase();
  const text = `Hi ${firstName}, your maintenance request "${truncate(args.ticketTitle, 60)}" is now ${readable}. — ${brand()}`;
  return postMessage(text, [phone]);
}

export async function sendReviewResponseTenantSms(args: {
  to: string;
  tenantName: string;
  status: string;
}): Promise<SendResult> {
  const phone = normalizePhone(args.to);
  if (!phone) return { sent: false, reason: `Invalid phone number: ${args.to}` };
  const firstName = args.tenantName.split(' ')[0] || args.tenantName;
  const readable = args.status.toLowerCase();
  const text = `Hi ${firstName}, your lease review request has been ${readable}. Open the portal to see the response. — ${brand()}`;
  return postMessage(text, [phone]);
}

export async function sendInvoicePaidTenantSms(args: {
  to: string;
  tenantName: string;
  amountZar: string;
  periodLabel: string;
}): Promise<SendResult> {
  const phone = normalizePhone(args.to);
  if (!phone) return { sent: false, reason: `Invalid phone number: ${args.to}` };
  const firstName = args.tenantName.split(' ')[0] || args.tenantName;
  const text = `Hi ${firstName}, we've received your ${args.periodLabel} rent payment of ${args.amountZar}. Thanks! — ${brand()}`;
  return postMessage(text, [phone]);
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + '…';
}
