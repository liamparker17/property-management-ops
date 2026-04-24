import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { resolveMailboxConfig } from '@/lib/email';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  }

  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }
    process.env[key] = value;
  }
});

describe('lib/email mailbox config', () => {
  it('supports the legacy Gmail configuration for the default mailbox', () => {
    process.env.GMAIL_USER = 'updates@regalis.co.za';
    process.env.GMAIL_APP_PASSWORD = 'app-password';
    process.env.EMAIL_FROM_NAME = 'Regalis';

    const config = resolveMailboxConfig();

    assert.equal(config.configured, true);
    assert.equal(config.authUser, 'updates@regalis.co.za');
    assert.equal(config.from, '"Regalis" <updates@regalis.co.za>');
    assert.deepEqual(config.transport, {
      kind: 'gmail',
      host: undefined,
      port: undefined,
      secure: undefined,
    });
  });

  it('routes the noreply mailbox through the shared SMTP transport while keeping its own From header', () => {
    process.env.SMTP_HOST = 'smtp.gmail.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_USER = 'updates@regalis.co.za';
    process.env.SMTP_PASSWORD = 'smtp-password';
    process.env.EMAIL_NOREPLY_FROM = 'Regalis <noreply@regalis.co.za>';
    process.env.EMAIL_NOREPLY_REPLY_TO = 'Updates <updates@regalis.co.za>';

    const config = resolveMailboxConfig('noreply');

    assert.equal(config.configured, true);
    assert.equal(config.authUser, 'updates@regalis.co.za');
    assert.equal(config.from, 'Regalis <noreply@regalis.co.za>');
    assert.equal(config.replyTo, 'Updates <updates@regalis.co.za>');
    assert.deepEqual(config.transport, {
      kind: 'smtp',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
    });
  });

  it('lets a named mailbox override SMTP credentials independently', () => {
    process.env.SMTP_HOST = 'smtp.gmail.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_USER = 'relay@regalis.co.za';
    process.env.SMTP_PASSWORD = 'shared-password';
    process.env.EMAIL_UPDATES_FROM = 'Regalis Updates <updates@regalis.co.za>';
    process.env.EMAIL_UPDATES_SMTP_USER = 'updates@regalis.co.za';
    process.env.EMAIL_UPDATES_SMTP_PASSWORD = 'updates-password';

    const config = resolveMailboxConfig('updates');

    assert.equal(config.configured, true);
    assert.equal(config.authUser, 'updates@regalis.co.za');
    assert.equal(config.from, 'Regalis Updates <updates@regalis.co.za>');
    assert.deepEqual(config.transport, {
      kind: 'smtp',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
    });
  });
});
