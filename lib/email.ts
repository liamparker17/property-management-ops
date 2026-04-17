import nodemailer from 'nodemailer';

type Transporter = ReturnType<typeof nodemailer.createTransport>;
let cached: Transporter | null = null;

function getTransporter(): Transporter | null {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  if (cached) return cached;
  cached = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
  return cached;
}

function defaultFrom() {
  const explicit = process.env.EMAIL_FROM?.trim();
  if (explicit) return explicit;
  const user = process.env.GMAIL_USER;
  const name = process.env.EMAIL_FROM_NAME?.trim() || 'PMOps';
  return user ? `"${name}" <${user}>` : name;
}

function defaultReplyTo() {
  const v = process.env.EMAIL_REPLY_TO?.trim();
  return v ? v : undefined;
}

export type SendResult = { sent: boolean; reason?: string };

export async function sendTenantInvite(args: {
  to: string;
  tenantName: string;
  orgName: string;
  tempPassword: string;
  appUrl: string;
}): Promise<SendResult> {
  const transporter = getTransporter();
  if (!transporter) return { sent: false, reason: 'GMAIL_USER / GMAIL_APP_PASSWORD not configured' };

  const loginUrl = `${args.appUrl.replace(/\/$/, '')}/login`;
  const subject = `Welcome to ${args.orgName} — your tenant portal access`;

  const html = `
  <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
    <h2 style="margin:0 0 12px;font-size:20px;">Welcome, ${escapeHtml(args.tenantName)}</h2>
    <p style="margin:0 0 16px;line-height:1.55;">
      ${escapeHtml(args.orgName)} has set up your tenant portal account. Sign in to review your
      lease agreement, sign it electronically, and manage your rent and maintenance going forward.
    </p>
    <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;background:#f8fafc;margin:16px 0;">
      <div style="font-size:12px;color:#64748b;margin-bottom:4px;">Login email</div>
      <div style="font-family:ui-monospace,monospace;font-size:14px;margin-bottom:12px;">${escapeHtml(args.to)}</div>
      <div style="font-size:12px;color:#64748b;margin-bottom:4px;">Temporary password</div>
      <div style="font-family:ui-monospace,monospace;font-size:14px;">${escapeHtml(args.tempPassword)}</div>
    </div>
    <p style="margin:0 0 20px;line-height:1.55;">
      For security, please change this password after your first sign-in from the Profile page.
    </p>
    <p style="margin:0 0 24px;">
      <a href="${loginUrl}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;font-size:14px;">
        Sign in to your portal
      </a>
    </p>
    <p style="margin:0;font-size:12px;color:#64748b;line-height:1.5;">
      This is an automated message — please do not reply. If you need assistance, contact your property manager.
    </p>
  </div>
  `;

  const text = [
    `Welcome, ${args.tenantName}`,
    ``,
    `${args.orgName} has set up your tenant portal account.`,
    ``,
    `Login email: ${args.to}`,
    `Temporary password: ${args.tempPassword}`,
    ``,
    `Sign in: ${loginUrl}`,
    ``,
    `Please change your password after signing in.`,
    ``,
    `This is an automated message — please do not reply.`,
  ].join('\n');

  try {
    const replyTo = defaultReplyTo();
    await transporter.sendMail({
      from: defaultFrom(),
      to: args.to,
      subject,
      html,
      text,
      ...(replyTo ? { replyTo } : {}),
    });
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : 'Unknown email error' };
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
