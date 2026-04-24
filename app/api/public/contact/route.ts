import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { contactRequestSchema } from '@/lib/zod/contact';
import { sendContactRequest } from '@/lib/email';

// Simple in-memory rate limiter: 3 requests per IP per 10 minutes.
// NOTE: This is per-instance only. Production should use Upstash or a proper token bucket.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 3;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= MAX_HITS) {
    hits.set(ip, list);
    return true;
  }
  list.push(now);
  hits.set(ip, list);
  return false;
}

function getIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}

export async function POST(req: Request) {
  const ip = getIp(req);
  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let data;
  try {
    data = contactRequestSchema.parse(json);
  } catch (e) {
    if (e instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of e.issues) {
        const key = issue.path.join('.') || 'form';
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
  }

  const result = await sendContactRequest(data);
  if (!result.sent) {
    return NextResponse.json(
      { error: 'Contact is temporarily unavailable. Please email hello@regalis.co.za directly.' },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}
