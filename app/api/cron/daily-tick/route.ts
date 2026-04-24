import { NextResponse } from 'next/server';

import { ApiError, toErrorResponse } from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type StepResult = { path: string; ok: boolean; ms: number; error?: string };

async function runStep(path: string, secret: string | undefined): Promise<StepResult> {
  const started = Date.now();
  try {
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
    const headers: Record<string, string> = {};
    if (secret) headers.Authorization = `Bearer ${secret}`;
    const res = await fetch(`${baseUrl}${path}`, { headers, method: 'GET' });
    const ok = res.ok;
    const ms = Date.now() - started;
    if (!ok) {
      const body = await res.text().catch(() => '');
      return { path, ok: false, ms, error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
    }
    return { path, ok: true, ms };
  } catch (err) {
    const ms = Date.now() - started;
    return { path, ok: false, ms, error: (err as Error).message };
  }
}

// Runs once per UTC day. Hobby-plan-friendly (consolidates multiple sub-crons into one tick).
// Individual handlers are still independently invokable by authenticated requests.
export async function GET(req: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = req.headers.get('authorization');
      if (auth !== `Bearer ${secret}`) throw ApiError.unauthorized();
    }

    const steps = [
      '/api/cron/debicheck-retry',
      '/api/cron/reconciliation',
      '/api/cron/eskom-sync',
      '/api/cron/usage-alerts',
      '/api/cron/payment-alerts',
      '/api/cron/backup-daily',
      '/api/cron/notifications-dispatch',
    ];

    const results: StepResult[] = [];
    for (const path of steps) {
      results.push(await runStep(path, secret));
    }

    const okCount = results.filter((r) => r.ok).length;
    return NextResponse.json({ ok: true, okCount, total: results.length, results });
  } catch (err) {
    return toErrorResponse(err);
  }
}
