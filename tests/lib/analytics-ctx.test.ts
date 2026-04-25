import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveAnalyticsCtx } from '@/lib/analytics/ctx';

const orgCtx = { orgId: 'org_1', userId: 'u1', role: 'ADMIN' as const };

describe('resolveAnalyticsCtx', () => {
  it('returns defaults when no params are provided', () => {
    const ctx = resolveAnalyticsCtx(new URLSearchParams(), orgCtx);
    assert.equal(ctx.orgId, 'org_1');
    assert.equal(ctx.compare, 'prior');
    assert.deepEqual(ctx.scope, {});
    assert.ok(ctx.range.from instanceof Date);
    assert.ok(ctx.range.to instanceof Date);
    const months = (ctx.range.to.getUTCFullYear() - ctx.range.from.getUTCFullYear()) * 12
      + (ctx.range.to.getUTCMonth() - ctx.range.from.getUTCMonth());
    assert.equal(months, 11, 'default range spans 11 month-deltas (12 buckets)');
  });

  it('parses range=3m correctly', () => {
    const ctx = resolveAnalyticsCtx(new URLSearchParams('range=3m'), orgCtx);
    const months = (ctx.range.to.getUTCFullYear() - ctx.range.from.getUTCFullYear()) * 12
      + (ctx.range.to.getUTCMonth() - ctx.range.from.getUTCMonth());
    assert.equal(months, 2);
  });

  it('parses compare=off / yoy / prior', () => {
    assert.equal(resolveAnalyticsCtx(new URLSearchParams('compare=off'), orgCtx).compare, 'off');
    assert.equal(resolveAnalyticsCtx(new URLSearchParams('compare=yoy'), orgCtx).compare, 'yoy');
    assert.equal(resolveAnalyticsCtx(new URLSearchParams('compare=prior'), orgCtx).compare, 'prior');
  });

  it('parses scope filters into arrays', () => {
    const ctx = resolveAnalyticsCtx(
      new URLSearchParams('properties=p1,p2&landlords=l1&agents='),
      orgCtx,
    );
    assert.deepEqual(ctx.scope.propertyIds, ['p1', 'p2']);
    assert.deepEqual(ctx.scope.landlordIds, ['l1']);
    assert.equal(ctx.scope.agentIds, undefined, 'empty string → undefined');
  });

  it('falls back to defaults on garbage input (does not throw)', () => {
    const ctx = resolveAnalyticsCtx(new URLSearchParams('range=zzz&compare=banana'), orgCtx);
    assert.equal(ctx.compare, 'prior');
  });
});
