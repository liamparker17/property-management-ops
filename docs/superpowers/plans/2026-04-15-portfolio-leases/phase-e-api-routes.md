## Phase E — API routes

Every handler follows the same shape:

```ts
export const GET = withOrg(async (req, ctx) => {
  const data = await service(ctx, ...);
  return NextResponse.json(data);
});
```

**Per-task convention:** write the routes, then commit with the message noted at the end of the task. Run `npm run typecheck` once at the end of the phase.

### Task 18: Properties API routes

```ts
// app/api/properties/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { createPropertySchema } from '@/lib/zod/property';
import { listProperties, createProperty } from '@/lib/services/properties';

export const GET = withOrg(async (_req, ctx) => {
  const rows = await listProperties(ctx);
  return NextResponse.json({ data: rows });
});

export const POST = withOrg(async (req, ctx) => {
  const body = await req.json();
  const input = createPropertySchema.parse(body);
  const row = await createProperty(ctx, input);
  return NextResponse.json({ data: row }, { status: 201 });
});
```

```ts
// app/api/properties/[id]/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { updatePropertySchema } from '@/lib/zod/property';
import { getProperty, updateProperty, softDeleteProperty } from '@/lib/services/properties';

type Params = { id: string };

export const GET = withOrg<Params>(async (_req, ctx, { id }) => {
  const row = await getProperty(ctx, id);
  return NextResponse.json({ data: row });
});

export const PATCH = withOrg<Params>(async (req, ctx, { id }) => {
  const body = await req.json();
  const input = updatePropertySchema.parse(body);
  const row = await updateProperty(ctx, id, input);
  return NextResponse.json({ data: row });
});

export const DELETE = withOrg<Params>(
  async (_req, ctx, { id }) => {
    await softDeleteProperty(ctx, id);
    return NextResponse.json({ data: { id, deleted: true } });
  },
  { requireRole: ['ADMIN'] },
);
```

**Commit:** `feat(api): properties routes`

---

### Task 19: Units + Tenants API routes

```ts
// app/api/units/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { createUnitSchema } from '@/lib/zod/unit';
import { listUnits, createUnit } from '@/lib/services/units';

export const GET = withOrg(async (req, ctx) => {
  const propertyId = req.nextUrl.searchParams.get('propertyId') ?? undefined;
  const rows = await listUnits(ctx, { propertyId });
  return NextResponse.json({ data: rows });
});

export const POST = withOrg(async (req, ctx) => {
  const input = createUnitSchema.parse(await req.json());
  const row = await createUnit(ctx, input);
  return NextResponse.json({ data: row }, { status: 201 });
});
```

```ts
// app/api/units/[id]/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { updateUnitSchema } from '@/lib/zod/unit';
import { getUnit, updateUnit, deleteUnit } from '@/lib/services/units';

type Params = { id: string };

export const GET = withOrg<Params>(async (_req, ctx, { id }) => {
  const row = await getUnit(ctx, id);
  return NextResponse.json({ data: row });
});

export const PATCH = withOrg<Params>(async (req, ctx, { id }) => {
  const input = updateUnitSchema.parse(await req.json());
  const row = await updateUnit(ctx, id, input);
  return NextResponse.json({ data: row });
});

export const DELETE = withOrg<Params>(async (_req, ctx, { id }) => {
  await deleteUnit(ctx, id);
  return NextResponse.json({ data: { id, deleted: true } });
});
```

```ts
// app/api/tenants/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { createTenantSchema } from '@/lib/zod/tenant';
import { listTenants, createTenant, detectDuplicates } from '@/lib/services/tenants';

export const GET = withOrg(async (req, ctx) => {
  const includeArchived = req.nextUrl.searchParams.get('includeArchived') === 'true';
  const rows = await listTenants(ctx, { includeArchived });
  return NextResponse.json({ data: rows });
});

export const POST = withOrg(async (req, ctx) => {
  const input = createTenantSchema.parse(await req.json());
  const duplicates = await detectDuplicates(ctx, input);
  const row = await createTenant(ctx, input);
  return NextResponse.json({ data: row, warnings: { duplicates } }, { status: 201 });
});
```

```ts
// app/api/tenants/[id]/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { updateTenantSchema } from '@/lib/zod/tenant';
import { getTenant, updateTenant } from '@/lib/services/tenants';

type Params = { id: string };

export const GET = withOrg<Params>(async (_req, ctx, { id }) => {
  const row = await getTenant(ctx, id);
  return NextResponse.json({ data: row });
});

export const PATCH = withOrg<Params>(async (req, ctx, { id }) => {
  const input = updateTenantSchema.parse(await req.json());
  const row = await updateTenant(ctx, id, input);
  return NextResponse.json({ data: row });
});
```

```ts
// app/api/tenants/[id]/archive/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { archiveTenant, unarchiveTenant } from '@/lib/services/tenants';

type Params = { id: string };

export const POST = withOrg<Params>(async (_req, ctx, { id }) => {
  const row = await archiveTenant(ctx, id);
  return NextResponse.json({ data: row });
});

export const DELETE = withOrg<Params>(async (_req, ctx, { id }) => {
  const row = await unarchiveTenant(ctx, id);
  return NextResponse.json({ data: row });
});
```

**Commit:** `feat(api): units + tenants routes`

---

### Task 20: Leases API routes + actions

```ts
// app/api/leases/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { createLeaseSchema, leaseListQuerySchema } from '@/lib/zod/lease';
import { listLeases, createLease } from '@/lib/services/leases';

export const GET = withOrg(async (req, ctx) => {
  const query = leaseListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const rows = await listLeases(ctx, query);
  return NextResponse.json({ data: rows });
});

export const POST = withOrg(async (req, ctx) => {
  const input = createLeaseSchema.parse(await req.json());
  const row = await createLease(ctx, input);
  return NextResponse.json({ data: row }, { status: 201 });
});
```

```ts
// app/api/leases/[id]/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { updateDraftLeaseSchema } from '@/lib/zod/lease';
import { getLease, updateDraftLease } from '@/lib/services/leases';

type Params = { id: string };

export const GET = withOrg<Params>(async (_req, ctx, { id }) => {
  const row = await getLease(ctx, id);
  return NextResponse.json({ data: row });
});

export const PATCH = withOrg<Params>(async (req, ctx, { id }) => {
  const input = updateDraftLeaseSchema.parse(await req.json());
  const row = await updateDraftLease(ctx, id, input);
  return NextResponse.json({ data: row });
});
```

```ts
// app/api/leases/[id]/activate/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { activateLease } from '@/lib/services/leases';

type Params = { id: string };

export const POST = withOrg<Params>(async (_req, ctx, { id }) => {
  const row = await activateLease(ctx, id);
  return NextResponse.json({ data: row });
});
```

```ts
// app/api/leases/[id]/terminate/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { terminateLeaseSchema } from '@/lib/zod/lease';
import { terminateLease } from '@/lib/services/leases';

type Params = { id: string };

export const POST = withOrg<Params>(async (req, ctx, { id }) => {
  const input = terminateLeaseSchema.parse(await req.json());
  const row = await terminateLease(ctx, id, input);
  return NextResponse.json({ data: row });
});
```

```ts
// app/api/leases/[id]/renew/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { createLeaseSchema } from '@/lib/zod/lease';
import { renewLease } from '@/lib/services/leases';

type Params = { id: string };

export const POST = withOrg<Params>(async (req, ctx, { id }) => {
  const input = createLeaseSchema.parse(await req.json());
  const row = await renewLease(ctx, id, input);
  return NextResponse.json({ data: row }, { status: 201 });
});
```

```ts
// app/api/leases/[id]/primary-tenant/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withOrg } from '@/lib/auth/with-org';
import { setPrimaryTenant } from '@/lib/services/leases';

type Params = { id: string };
const schema = z.object({ tenantId: z.string().min(1) });

export const PATCH = withOrg<Params>(async (req, ctx, { id }) => {
  const { tenantId } = schema.parse(await req.json());
  const row = await setPrimaryTenant(ctx, id, tenantId);
  return NextResponse.json({ data: row });
});
```

```ts
// app/api/leases/[id]/documents/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { ApiError } from '@/lib/errors';
import { uploadLeaseAgreement } from '@/lib/services/documents';

type Params = { id: string };

export const POST = withOrg<Params>(async (req, ctx, { id }) => {
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) throw ApiError.validation({ file: 'Missing file' });
  const row = await uploadLeaseAgreement(ctx, id, file);
  return NextResponse.json({ data: row }, { status: 201 });
});
```

**Commit:** `feat(api): leases routes + actions (activate/terminate/renew/primary-tenant/documents)`

---

### Task 21: Documents download + Settings + Dashboard routes

```ts
// app/api/documents/[id]/download/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { getDocumentForDownload } from '@/lib/services/documents';

type Params = { id: string };

export const GET = withOrg<Params>(async (_req, ctx, { id }) => {
  const doc = await getDocumentForDownload(ctx, id);
  const url = `https://${process.env.BLOB_PUBLIC_HOST ?? 'blob.vercel-storage.com'}/${doc.storageKey}`;
  return NextResponse.redirect(url, 302);
});
```

```ts
// app/api/settings/team/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { createUserSchema } from '@/lib/zod/team';
import { listTeam, createTeamUser } from '@/lib/services/team';

export const GET = withOrg(
  async (_req, ctx) => NextResponse.json({ data: await listTeam(ctx) }),
  { requireRole: ['ADMIN'] },
);

export const POST = withOrg(
  async (req, ctx) => {
    const input = createUserSchema.parse(await req.json());
    const row = await createTeamUser(ctx, input);
    return NextResponse.json({ data: row }, { status: 201 });
  },
  { requireRole: ['ADMIN'] },
);
```

```ts
// app/api/settings/team/[id]/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { updateUserSchema } from '@/lib/zod/team';
import { updateTeamUser } from '@/lib/services/team';

type Params = { id: string };

export const PATCH = withOrg<Params>(
  async (req, ctx, { id }) => {
    const input = updateUserSchema.parse(await req.json());
    const row = await updateTeamUser(ctx, id, input);
    return NextResponse.json({ data: row });
  },
  { requireRole: ['ADMIN'] },
);
```

```ts
// app/api/settings/org/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { updateOrgSchema } from '@/lib/zod/team';
import { getOrg, updateOrg } from '@/lib/services/team';

export const GET = withOrg(
  async (_req, ctx) => NextResponse.json({ data: await getOrg(ctx) }),
  { requireRole: ['ADMIN'] },
);

export const PATCH = withOrg(
  async (req, ctx) => {
    const input = updateOrgSchema.parse(await req.json());
    return NextResponse.json({ data: await updateOrg(ctx, input) });
  },
  { requireRole: ['ADMIN'] },
);
```

```ts
// app/api/profile/password/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { changePasswordSchema } from '@/lib/zod/team';
import { changeOwnPassword } from '@/lib/services/team';

export const POST = withOrg(async (req, ctx) => {
  const input = changePasswordSchema.parse(await req.json());
  return NextResponse.json({ data: await changeOwnPassword(ctx, input) });
});
```

```ts
// app/api/dashboard/summary/route.ts
import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { getDashboardSummary } from '@/lib/services/dashboard';

export const GET = withOrg(async (_req, ctx) => {
  return NextResponse.json({ data: await getDashboardSummary(ctx) });
});
```

**Commit:** `feat(api): documents download + settings + profile + dashboard`

---

> **Note:** Phase E ships 4 tasks (18–21). The top-level phase map's "Tasks 18–22" range is off by one.
