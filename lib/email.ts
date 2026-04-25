import nodemailer from 'nodemailer';

import { CONTACT_CONFIRMATION_HTML } from '@/lib/email/templates/contact-confirmation';
import {
  REGALIS_LOGO_CID,
  REGALIS_LOGO_PNG_BASE64,
} from '@/lib/email/templates/regalis-logo';

type Transporter = ReturnType<typeof nodemailer.createTransport>;

export type EmailMailbox = 'default' | 'noreply' | 'updates';
export type SendResult = { sent: boolean; reason?: string };

type TransportConfig = {
  kind: 'gmail' | 'smtp';
  user: string;
  pass: string;
  host?: string;
  port?: number;
  secure?: boolean;
};

export type MailboxConfig = {
  mailbox: EmailMailbox;
  configured: boolean;
  from: string;
  replyTo?: string;
  authUser?: string;
  transport?: {
    kind: 'gmail' | 'smtp';
    host?: string;
    port?: number;
    secure?: boolean;
  };
};

const MAILBOX_PREFIX: Record<EmailMailbox, string> = {
  default: '',
  noreply: 'EMAIL_NOREPLY_',
  updates: 'EMAIL_UPDATES_',
};

const transportCache = new Map<string, Transporter>();

function readEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function readMailboxEnv(mailbox: EmailMailbox, suffix: string) {
  if (mailbox === 'default') return undefined;
  return readEnv(`${MAILBOX_PREFIX[mailbox]}${suffix}`);
}

function parsePort(value?: string) {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseSecure(value?: string) {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return undefined;
}

function resolveTransport(mailbox: EmailMailbox): TransportConfig | null {
  const host = readMailboxEnv(mailbox, 'SMTP_HOST') ?? readEnv('SMTP_HOST');
  const port = parsePort(readMailboxEnv(mailbox, 'SMTP_PORT') ?? readEnv('SMTP_PORT'));
  const secure = parseSecure(readMailboxEnv(mailbox, 'SMTP_SECURE') ?? readEnv('SMTP_SECURE'));
  const user = readMailboxEnv(mailbox, 'SMTP_USER') ?? readEnv('SMTP_USER') ?? readEnv('GMAIL_USER');
  const pass =
    readMailboxEnv(mailbox, 'SMTP_PASSWORD') ??
    readEnv('SMTP_PASSWORD') ??
    readEnv('GMAIL_APP_PASSWORD');

  if (!user || !pass) return null;

  if (!host) {
    return {
      kind: 'gmail',
      user,
      pass,
    };
  }

  const resolvedPort = port ?? (secure ? 465 : 587);
  return {
    kind: 'smtp',
    host,
    port: resolvedPort,
    secure: secure ?? resolvedPort === 465,
    user,
    pass,
  };
}

function resolveFrom(mailbox: EmailMailbox, user?: string) {
  const explicitFrom = readMailboxEnv(mailbox, 'FROM') ?? readEnv('EMAIL_FROM');
  if (explicitFrom) return explicitFrom;

  const fromName = readMailboxEnv(mailbox, 'FROM_NAME') ?? readEnv('EMAIL_FROM_NAME') ?? 'Regalis';
  return user ? `"${fromName}" <${user}>` : fromName;
}

function resolveReplyTo(mailbox: EmailMailbox) {
  return readMailboxEnv(mailbox, 'REPLY_TO') ?? readEnv('EMAIL_REPLY_TO');
}

function transportCacheKey(config: TransportConfig) {
  if (config.kind === 'gmail') {
    return `gmail:${config.user}`;
  }
  return `smtp:${config.host}:${config.port}:${config.secure ? 'secure' : 'starttls'}:${config.user}`;
}

function getTransporter(mailbox: EmailMailbox) {
  const config = resolveTransport(mailbox);
  if (!config) return null;

  const key = transportCacheKey(config);
  const cached = transportCache.get(key);
  if (cached) return cached;

  const transporter =
    config.kind === 'gmail'
      ? nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: config.user,
            pass: config.pass,
          },
        })
      : nodemailer.createTransport({
          host: config.host,
          port: config.port,
          secure: config.secure,
          auth: {
            user: config.user,
            pass: config.pass,
          },
        });

  transportCache.set(key, transporter);
  return transporter;
}

function mailboxNotConfiguredReason(mailbox: EmailMailbox) {
  return `Email mailbox "${mailbox}" is not configured`;
}

function normalizeRecipients(to: string | string[]) {
  return Array.isArray(to) ? to.join(', ') : to;
}

function extractEmailAddress(value?: string) {
  if (!value) return undefined;
  const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0]?.toLowerCase();
}

export function resolveMailboxConfig(mailbox: EmailMailbox = 'default'): MailboxConfig {
  const transport = resolveTransport(mailbox);
  return {
    mailbox,
    configured: transport !== null,
    from: resolveFrom(mailbox, transport?.user),
    replyTo: resolveReplyTo(mailbox),
    authUser: transport?.user,
    transport: transport
      ? {
          kind: transport.kind,
          host: transport.host,
          port: transport.port,
          secure: transport.secure,
        }
      : undefined,
  };
}

export type EmailAttachment = {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  /** Set for inline images referenced via cid:<id> in the HTML body. */
  cid?: string;
};

export async function sendEmail(args: {
  mailbox?: EmailMailbox;
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}): Promise<SendResult> {
  const mailbox = args.mailbox ?? 'default';
  const transporter = getTransporter(mailbox);
  const config = resolveMailboxConfig(mailbox);
  if (!transporter) return { sent: false, reason: mailboxNotConfiguredReason(mailbox) };

  const replyTo = args.replyTo ?? config.replyTo;

  try {
    await transporter.sendMail({
      from: args.from ?? config.from,
      to: normalizeRecipients(args.to),
      subject: args.subject,
      html: args.html,
      text: args.text,
      ...(replyTo ? { replyTo } : {}),
      ...(args.attachments && args.attachments.length > 0
        ? { attachments: args.attachments }
        : {}),
    });
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : 'Unknown email error' };
  }
}

export async function sendTenantInvite(args: {
  to: string;
  tenantName: string;
  orgName: string;
  tempPassword: string;
  appUrl: string;
}): Promise<SendResult> {
  const loginUrl = `${args.appUrl.replace(/\/$/, '')}/login`;
  const subject = `Welcome to ${args.orgName} - your tenant portal access`;

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
      This is an automated message - please do not reply. If you need assistance, contact your property manager.
    </p>
  </div>
  `;

  const text = [
    `Welcome, ${args.tenantName}`,
    '',
    `${args.orgName} has set up your tenant portal account.`,
    '',
    `Login email: ${args.to}`,
    `Temporary password: ${args.tempPassword}`,
    '',
    `Sign in: ${loginUrl}`,
    '',
    `Please change your password after signing in.`,
    '',
    `This is an automated message - please do not reply.`,
  ].join('\n');

  return sendEmail({
    mailbox: 'noreply',
    to: args.to,
    subject,
    html,
    text,
  });
}

function opsRecipients(): string[] {
  const ops = readEnv('OPS_EMAIL_RECIPIENTS');
  if (ops) {
    return ops
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  const updatesMailbox = resolveMailboxConfig('updates');
  const fallback = updatesMailbox.authUser ?? extractEmailAddress(updatesMailbox.from);
  return fallback ? [fallback] : [];
}

export async function sendSignupRequest(args: {
  name: string;
  email: string;
  company: string;
  role: string;
  portfolioSize: string;
  message?: string | null;
}): Promise<SendResult> {
  const recipients = opsRecipients();
  const mailbox = resolveMailboxConfig('updates');
  if (!mailbox.configured || recipients.length === 0) {
    // eslint-disable-next-line no-console
    console.log('[signup-request] email not configured - payload logged only', {
      name: args.name,
      email: args.email,
      company: args.company,
      role: args.role,
      portfolioSize: args.portfolioSize,
    });
    return { sent: false, reason: 'Email not configured - request logged only' };
  }

  const subject = `New Regalis signup request - ${args.company}`;
  const rows: [string, string][] = [
    ['Name', args.name],
    ['Email', args.email],
    ['Company', args.company],
    ['Role', args.role],
    ['Portfolio size', args.portfolioSize],
  ];
  if (args.message) rows.push(['Message', args.message]);

  const html = `
  <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a;">
    <h2 style="margin:0 0 16px;font-size:18px;">New signup request</h2>
    <table style="border-collapse:collapse;width:100%;font-size:14px;">
      ${rows
        .map(
          ([key, value]) => `
      <tr>
        <td style="padding:8px 12px 8px 0;color:#64748b;vertical-align:top;width:140px;">${escapeHtml(key)}</td>
        <td style="padding:8px 0;vertical-align:top;">${escapeHtml(value)}</td>
      </tr>`,
        )
        .join('')}
    </table>
  </div>
  `;

  const text = rows.map(([key, value]) => `${key}: ${value}`).join('\n');

  return sendEmail({
    mailbox: 'updates',
    to: recipients,
    subject,
    html,
    text,
    replyTo: mailbox.replyTo ?? args.email,
  });
}

function renderContactConfirmation(args: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): { html: string; text: string } {
  const html = CONTACT_CONFIRMATION_HTML
    .replaceAll('{{name}}', escapeHtml(args.name))
    .replaceAll('{{email}}', escapeHtml(args.email))
    .replaceAll('{{subject}}', escapeHtml(args.subject))
    .replaceAll('{{message}}', escapeHtml(args.message));

  const text = [
    `Hi ${args.name},`,
    '',
    'Thank you for writing to Regalis. We have your message and someone on the team will respond within one business day. There is nothing else you need to do.',
    '',
    'For reference, here is what you sent us:',
    '',
    `Subject: ${args.subject}`,
    `From:    ${args.name} <${args.email}>`,
    '',
    args.message,
    '',
    '— Regalis · Property Ops',
    'hello@regalis.co.za · regalis.co.za',
  ].join('\n');

  return { html, text };
}

async function sendContactConfirmation(args: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<SendResult> {
  const { html, text } = renderContactConfirmation(args);
  return sendEmail({
    mailbox: 'default',
    to: args.email,
    subject: 'We received your message — Regalis',
    html,
    text,
    attachments: [
      {
        filename: 'regalis-logo.png',
        content: Buffer.from(REGALIS_LOGO_PNG_BASE64, 'base64'),
        contentType: 'image/png',
        cid: REGALIS_LOGO_CID,
      },
    ],
  });
}

export async function sendContactRequest(args: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<SendResult> {
  const recipients = opsRecipients();
  const mailbox = resolveMailboxConfig('updates');
  if (!mailbox.configured || recipients.length === 0) {
    // eslint-disable-next-line no-console
    console.log('[contact-request] email not configured - payload logged only', {
      name: args.name,
      email: args.email,
      subject: args.subject,
    });
    return { sent: false, reason: 'Email not configured - request logged only' };
  }

  const subject = `Regalis contact - ${args.subject}`;
  const html = `
  <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a;">
    <h2 style="margin:0 0 16px;font-size:18px;">New contact message</h2>
    <p style="margin:0 0 6px;font-size:14px;"><strong>From:</strong> ${escapeHtml(args.name)} &lt;${escapeHtml(args.email)}&gt;</p>
    <p style="margin:0 0 16px;font-size:14px;"><strong>Subject:</strong> ${escapeHtml(args.subject)}</p>
    <div style="white-space:pre-wrap;border-top:1px solid #e2e8f0;padding-top:16px;font-size:14px;line-height:1.6;">${escapeHtml(args.message)}</div>
  </div>
  `;
  const text = `From: ${args.name} <${args.email}>\nSubject: ${args.subject}\n\n${args.message}`;

  const opsResult = await sendEmail({
    mailbox: 'updates',
    to: recipients,
    subject,
    html,
    text,
    replyTo: args.email,
  });

  // Auto-reply from hello@ back to the submitter. Awaited (not fire-and-forget)
  // because Vercel terminates the serverless function once the response is
  // returned — pending promises silently die. Errors here are logged and
  // swallowed so the form submission still reports success to the visitor.
  try {
    const confirmResult = await sendContactConfirmation(args);
    if (!confirmResult.sent) {
      // eslint-disable-next-line no-console
      console.error('[contact-confirmation] auto-reply not sent:', confirmResult.reason);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[contact-confirmation] auto-reply threw', err);
  }

  return opsResult;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
