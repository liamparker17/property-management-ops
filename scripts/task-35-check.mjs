// Programmatic Task 35 acceptance runner.
import { readFileSync } from 'node:fs';

const BASE = 'http://localhost:3000';
let fails = 0;

function parseSetCookies(headers) {
  const jar = {};
  const arr = headers.getSetCookie ? headers.getSetCookie() : [];
  for (const c of arr) {
    const [kv] = c.split(';');
    const [k, v] = kv.split('=');
    jar[k.trim()] = v;
  }
  return jar;
}
const merge = (a, b) => ({ ...a, ...b });
const jarStr = (jar) => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');

async function login(email, password) {
  let jar = {};
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  jar = merge(jar, parseSetCookies(csrfRes.headers));
  const { csrfToken } = await csrfRes.json();
  const body = new URLSearchParams({ csrfToken, email, password, callbackUrl: '/', json: 'true' });
  const r = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: jarStr(jar) },
    body,
    redirect: 'manual',
  });
  jar = merge(jar, parseSetCookies(r.headers));
  return { jar, status: r.status };
}

async function get(path, jar) {
  const r = await fetch(`${BASE}${path}`, { redirect: 'manual', headers: { Cookie: jarStr(jar) } });
  return { status: r.status, location: r.headers.get('location'), text: await r.text() };
}
async function api(method, path, jar, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Cookie: jarStr(jar),
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
    redirect: 'manual',
  });
  let json = null;
  try { json = await r.json(); } catch {}
  return { status: r.status, json };
}

function assert(label, cond, detail = '') {
  const prefix = cond ? '✅' : '❌';
  console.log(`${prefix} ${label}${detail ? ' — ' + detail : ''}`);
  if (!cond) { fails++; process.exitCode = 1; }
}
function section(n) { console.log(`\n── ${n} ──`); }

(async () => {
  // ───────── Check 2: Role redirects ─────────
  section('Check 2: Role redirects');
  {
    const r = await get('/', {});
    assert('unauth / → /login', r.status >= 300 && r.status < 400 && /\/login/.test(r.location || ''));
  }
  const tenant = await login('tenant@acme.test', 'demo1234');
  assert('tenant login', tenant.status < 400);
  assert('tenant /tenant = 200', (await get('/tenant', tenant.jar)).status === 200);
  assert('tenant /dashboard → redirect', (await get('/dashboard', tenant.jar)).status >= 300);

  const finance = await login('finance@acme.test', 'demo1234');
  assert('finance login', finance.status < 400);
  assert('finance /dashboard = 200', (await get('/dashboard', finance.jar)).status === 200);
  assert('finance /settings/team → redirect', (await get('/settings/team', finance.jar)).status >= 300);

  const admin = await login('admin@acme.test', 'demo1234');
  assert('admin login', admin.status < 400);
  assert('admin /settings/team = 200', (await get('/settings/team', admin.jar)).status === 200);

  // ───────── Check 3: Dashboard widgets ─────────
  section('Check 3: Dashboard widgets');
  {
    const { json } = await api('GET', '/api/dashboard/summary', admin.jar);
    const d = json.data ?? json;
    assert('totalProperties = 3', d.totalProperties === 3, String(d.totalProperties));
    assert('totalUnits = 13', d.totalUnits === 13, String(d.totalUnits));
    assert('occupiedUnits > 0', d.occupiedUnits > 0, String(d.occupiedUnits));
    assert('vacantUnits > 0', d.vacantUnits > 0, String(d.vacantUnits));
    assert('upcomingUnits > 0', d.upcomingUnits > 0, String(d.upcomingUnits));
    assert('expiredLeases ≥ 1', d.expiredLeases >= 1, String(d.expiredLeases));
    assert('expiringSoonList.length = 2', d.expiringSoonList?.length === 2, String(d.expiringSoonList?.length));
    assert('recentLeases.length = 5', d.recentLeases?.length === 5, String(d.recentLeases?.length));
    assert('conflictUnits = 0', d.conflictUnits === 0, String(d.conflictUnits));
  }

  // ───────── Check 4: Property + unit create golden path ─────────
  section('Check 4: Property + unit create golden path');
  let testVilla, testVillaMain, guestCottage;
  {
    // Idempotent: reuse existing "Test Villa" if a previous run left one.
    const existing = await api('GET', '/api/properties', admin.jar);
    const prior = (existing.json.data ?? existing.json).find(p => p.name === 'Test Villa');
    if (prior) {
      testVilla = prior;
      console.log('  (reusing existing Test Villa)');
    } else {
      const { status, json } = await api('POST', '/api/properties', admin.jar, {
        name: 'Test Villa',
        addressLine1: '1 Test Lane',
        suburb: 'Testville',
        city: 'Cape Town',
        province: 'WC',
        postalCode: '8000',
        autoCreateMainUnit: true,
      });
      assert('POST /api/properties 201', status === 201 || status === 200, `status ${status}`);
      testVilla = json.data;
    }
  }
  {
    const { json } = await api('GET', `/api/properties/${testVilla.id}`, admin.jar);
    const units = (json.data ?? json).units ?? [];
    testVillaMain = units.find(u => u.label === 'Main');
    assert('Test Villa has "Main" unit', !!testVillaMain);
  }
  {
    const { status, json } = await api('POST', '/api/units', admin.jar, {
      propertyId: testVilla.id,
      label: 'Guest Cottage',
      bedrooms: 1,
      bathrooms: 1,
    });
    assert('POST guest cottage 201', status === 201 || status === 200, `status ${status}`);
    guestCottage = json.data;
  }
  {
    const { json } = await api('GET', `/api/units/${guestCottage.id}`, admin.jar);
    const occ = (json.data ?? json).occupancy;
    assert('guest cottage occupancy = VACANT', occ === 'VACANT' || occ?.state === 'VACANT', JSON.stringify(occ));
  }

  // ───────── Check 5: Tenant create + duplicate warning ─────────
  section('Check 5: Tenant create + duplicate warning');
  let jane;
  {
    const { status, json } = await api('POST', '/api/tenants', admin.jar, {
      firstName: 'Jane',
      lastName: 'Test',
      email: 'noah@example.test', // intentionally duplicate with seeded Noah
      phone: null,
      idNumber: null,
      notes: null,
    });
    assert('POST /api/tenants 201', status === 201 || status === 200, `status ${status}`);
    jane = json.data;
    const dups = json.warnings?.duplicates ?? [];
    assert('duplicate warning present', dups.length > 0, `dups=${dups.length}`);
  }

  // Find Noah too
  const { json: tenantsList } = await api('GET', '/api/tenants', admin.jar);
  const noah = (tenantsList.data ?? tenantsList).find(t => t.firstName === 'Noah');
  assert('seeded Noah found', !!noah);

  // ───────── Check 6: Joint lease create + activate ─────────
  section('Check 6: Joint lease create + activate');
  const today = new Date();
  const inMonths = (n) => {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + n, today.getUTCDate()));
    return d.toISOString().slice(0, 10);
  };
  let jointLease;
  {
    const { status, json } = await api('POST', '/api/leases', admin.jar, {
      unitId: testVillaMain.id,
      tenantIds: [jane.id, noah.id],
      primaryTenantId: jane.id,
      startDate: inMonths(0),
      endDate: inMonths(12),
      rentAmountCents: 850000,
      depositAmountCents: 850000,
      heldInTrustAccount: false,
      paymentDueDay: 1,
      notes: null,
    });
    assert('POST /api/leases 201', status === 201 || status === 200, `status ${status}`);
    jointLease = json.data;
    assert('joint lease state = DRAFT', jointLease.state === 'DRAFT', jointLease.state);
  }
  {
    const { status, json } = await api('POST', `/api/leases/${jointLease.id}/activate`, admin.jar);
    assert('activate 200', status === 200 || status === 201, `status ${status} ${JSON.stringify(json)}`);
    assert('joint lease state = ACTIVE', (json.data ?? json).state === 'ACTIVE');
  }
  {
    const { json } = await api('GET', `/api/units/${testVillaMain.id}`, admin.jar);
    const occ = (json.data ?? json).occupancy;
    const state = occ?.state ?? occ;
    assert('Test Villa Main occupancy = OCCUPIED', state === 'OCCUPIED', JSON.stringify(occ));
  }

  // ───────── Check 7: Overlap guard ─────────
  section('Check 7: Overlap guard');
  let overlapLease;
  {
    const { status, json } = await api('POST', '/api/leases', admin.jar, {
      unitId: testVillaMain.id,
      tenantIds: [jane.id],
      primaryTenantId: jane.id,
      startDate: inMonths(1),
      endDate: inMonths(6),
      rentAmountCents: 850000,
      depositAmountCents: 850000,
      heldInTrustAccount: false,
      paymentDueDay: 1,
      notes: null,
    });
    assert('overlapping DRAFT created (200/201)', status === 201 || status === 200, `status ${status}`);
    overlapLease = json.data;
  }
  {
    const { json } = await api('GET', `/api/units/${testVillaMain.id}`, admin.jar);
    const occ = (json.data ?? json).occupancy;
    const state = occ?.state ?? occ;
    assert('unit occupancy unchanged (OCCUPIED) despite draft', state === 'OCCUPIED', JSON.stringify(occ));
  }
  {
    const { status, json } = await api('POST', `/api/leases/${overlapLease.id}/activate`, admin.jar);
    assert('activating overlap → 409', status === 409, `status ${status} ${JSON.stringify(json)}`);
  }

  // ───────── Check 8: Document upload ─────────
  section('Check 8: Document upload');
  {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3]);
    const fd = new FormData();
    fd.append('file', new File([pdfBytes], 'acceptance-test.pdf', { type: 'application/pdf' }));
    const { status, json } = await api('POST', `/api/leases/${jointLease.id}/documents`, admin.jar, fd);
    assert('upload 201', status === 201 || status === 200, `status ${status} ${JSON.stringify(json)}`);
    const doc = json.data;
    assert('document has storageKey', !!doc?.storageKey);
    const dl = await fetch(`${BASE}/api/documents/${doc.id}/download`, { headers: { Cookie: jarStr(admin.jar) }, redirect: 'manual' });
    assert('download returns 302/307 to blob', dl.status >= 300 && dl.status < 400, `status ${dl.status}`);
  }

  // ───────── Check 9: Terminate + renew ─────────
  section('Check 9: Terminate + renew');
  // Find a seeded ACTIVE lease that is NOT expiring (so renew also works cleanly)
  const { json: leasesRaw } = await api('GET', '/api/leases?status=ACTIVE', admin.jar);
  const seededActive = (leasesRaw.data ?? leasesRaw).filter(l => l.state === 'ACTIVE' && l.unit.property.name === 'Rose Court');
  assert('seeded Rose Court ACTIVE leases found', seededActive.length >= 2, String(seededActive.length));
  const toTerminate = seededActive[0];
  const toRenew = seededActive[1];
  {
    const { status, json } = await api('POST', `/api/leases/${toTerminate.id}/terminate`, admin.jar, {
      terminatedAt: new Date().toISOString().slice(0, 10),
      terminatedReason: 'Tenant relocated',
    });
    assert('terminate 200', status === 200, `status ${status} ${JSON.stringify(json)}`);
  }
  {
    const { json } = await api('GET', `/api/units/${toTerminate.unit.id}`, admin.jar);
    const occ = (json.data ?? json).occupancy;
    const state = occ?.state ?? occ;
    assert('terminated unit occupancy = VACANT', state === 'VACANT', JSON.stringify(occ));
  }
  let renewedSuccessor;
  {
    const { status, json } = await api('POST', `/api/leases/${toRenew.id}/renew`, admin.jar, {
      startDate: inMonths(12),
      endDate: inMonths(24),
      rentAmountCents: toRenew.rentAmountCents,
      depositAmountCents: toRenew.depositAmountCents,
      heldInTrustAccount: toRenew.heldInTrustAccount ?? false,
      paymentDueDay: toRenew.paymentDueDay,
      tenantIds: toRenew.tenants.map(t => t.tenantId ?? t.tenant?.id).filter(Boolean),
      primaryTenantId: (toRenew.tenants.find(t => t.isPrimary) || toRenew.tenants[0])?.tenantId ?? (toRenew.tenants[0].tenant?.id),
      notes: null,
    });
    assert('renew 201', status === 201 || status === 200, `status ${status} ${JSON.stringify(json)}`);
    renewedSuccessor = json.data;
    assert('successor state = DRAFT', renewedSuccessor?.state === 'DRAFT');
  }
  {
    const { json } = await api('GET', `/api/leases/${toRenew.id}`, admin.jar);
    assert('predecessor state = RENEWED', (json.data ?? json).state === 'RENEWED');
  }

  // ───────── Check 10: Property delete guard ─────────
  section('Check 10: Property delete guard');
  const { json: propsJson } = await api('GET', '/api/properties', admin.jar);
  const roseCourt = (propsJson.data ?? propsJson).find(p => p.name === 'Rose Court');
  {
    const { status } = await api('DELETE', `/api/properties/${roseCourt.id}`, admin.jar);
    assert('delete Rose Court → 409', status === 409, `status ${status}`);
  }
  {
    const { status } = await api('DELETE', `/api/properties/${testVilla.id}`, admin.jar);
    assert('delete Test Villa (has active lease) → 409', status === 409, `status ${status}`);
  }
  // Terminate the active joint lease and retry
  {
    const { status } = await api('POST', `/api/leases/${jointLease.id}/terminate`, admin.jar, {
      terminatedAt: new Date().toISOString().slice(0, 10),
      terminatedReason: 'Acceptance cleanup',
    });
    assert('terminate joint lease 200', status === 200, `status ${status}`);
  }
  {
    const { status } = await api('DELETE', `/api/properties/${testVilla.id}`, admin.jar);
    assert('delete Test Villa after termination → 200', status === 200, `status ${status}`);
  }

  // ───────── Check 11: Team management ─────────
  section('Check 11: Team management');
  const newAdminEmail = `newadmin-${Date.now()}@acme.test`;
  let newUser;
  {
    const { status, json } = await api('POST', '/api/settings/team', admin.jar, {
      email: newAdminEmail,
      name: 'New Admin',
      role: 'ADMIN',
      password: 'demo1234abc',
    });
    assert('create new ADMIN 201', status === 201 || status === 200, `status ${status} ${JSON.stringify(json)}`);
    newUser = json.data;
  }
  {
    const login2 = await login(newAdminEmail, 'demo1234abc');
    assert('new user can login', login2.status < 400);
    const r = await get('/dashboard', login2.jar);
    assert('new user /dashboard = 200', r.status === 200, `status ${r.status}`);
  }
  {
    const { status } = await api('PATCH', `/api/settings/team/${newUser.id}`, admin.jar, { role: 'FINANCE' });
    assert('change role to FINANCE 200', status === 200, `status ${status}`);
  }
  {
    const { status } = await api('PATCH', `/api/settings/team/${newUser.id}`, admin.jar, { disabled: true });
    assert('disable new user 200', status === 200, `status ${status}`);
  }

  // ───────── Check 12: Org setting ─────────
  section('Check 12: Org expiring-window setting');
  {
    const before = await api('GET', '/api/dashboard/summary', admin.jar);
    const beforeCount = (before.json.data ?? before.json).expiringSoonList?.length;
    const { status } = await api('PATCH', '/api/settings/org', admin.jar, { expiringWindowDays: 10 });
    assert('PATCH org to 10 days 200', status === 200, `status ${status}`);
    const after = await api('GET', '/api/dashboard/summary', admin.jar);
    const afterCount = (after.json.data ?? after.json).expiringSoonList?.length;
    assert('expiring count decreases after shrinking window', afterCount < beforeCount, `${beforeCount} → ${afterCount}`);
    const { status: st2 } = await api('PATCH', '/api/settings/org', admin.jar, { expiringWindowDays: 60 });
    assert('PATCH org restore to 60 200', st2 === 200);
  }

  console.log(`\n${fails === 0 ? '✅ All acceptance checks passed.' : `❌ ${fails} failure(s).`}`);
})();
