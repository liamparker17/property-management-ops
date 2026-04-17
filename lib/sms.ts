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

export async function sendTenantInviteSms(args: {
  to: string;
  tenantName: string;
  orgName: string;
  tempPassword: string;
  appUrl: string;
}): Promise<SendResult> {
  const phone = normalizePhone(args.to);
  if (!phone) return { sent: false, reason: `Invalid phone number: ${args.to}` };

  const loginUrl = `${args.appUrl.replace(/\/$/, '')}/login`;
  const text = [
    `Hi ${args.tenantName},`,
    `${args.orgName} has set up your tenant portal.`,
    `Login: ${loginUrl}`,
    `Temp password: ${args.tempPassword}`,
    `Change it after first sign-in.`,
  ].join(' ');

  return postMessage(text, [phone]);
}
