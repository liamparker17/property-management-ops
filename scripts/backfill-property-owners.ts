import { db } from '../lib/db';

type Candidate = {
  id: string;
  orgId: string;
  name: string;
};

type PropertyRow = {
  id: string;
  name: string;
  orgId: string;
  landlordId: string | null;
  assignedAgentId: string | null;
  org: {
    name: string;
  };
};

type AssignmentUpdate = {
  propertyId: string;
  propertyName: string;
  orgId: string;
  orgName: string;
  landlordId?: string;
  landlordName?: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
};

type UnresolvedItem = {
  propertyId: string;
  propertyName: string;
  orgId: string;
  orgName: string;
  field: 'landlordId' | 'assignedAgentId';
  reason: string;
};

const UNRESOLVED_CSV_HEADERS = [
  'orgId',
  'orgName',
  'propertyId',
  'propertyName',
  'field',
  'reason',
] as const;

function groupByOrg<T extends { orgId: string }>(rows: T[]) {
  return rows.reduce<Map<string, T[]>>((map, row) => {
    const items = map.get(row.orgId);
    if (items) {
      items.push(row);
    } else {
      map.set(row.orgId, [row]);
    }
    return map;
  }, new Map());
}

function formatCandidateReason(label: 'landlord' | 'managing agent', count: number) {
  if (count === 0) return `no active ${label}s found in org`;
  return `${count} active ${label}s found in org`;
}

function logLine(line = '') {
  process.stderr.write(`${line}\n`);
}

function escapeCsv(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function writeUnresolvedCsv(items: UnresolvedItem[]) {
  const lines = [UNRESOLVED_CSV_HEADERS.map((header) => escapeCsv(header)).join(',')];

  for (const item of items) {
    lines.push(
      [
        item.orgId,
        item.orgName,
        item.propertyId,
        item.propertyName,
        item.field,
        item.reason,
      ]
        .map(escapeCsv)
        .join(','),
    );
  }

  process.stdout.write(`${lines.join('\n')}\n`);
}

function printAssignments(title: string, updates: AssignmentUpdate[]) {
  logLine();
  logLine(title);

  if (updates.length === 0) {
    logLine('  none');
    return;
  }

  for (const update of updates) {
    const changes = [
      update.landlordId ? `landlord -> ${update.landlordName} (${update.landlordId})` : null,
      update.assignedAgentId
        ? `assignedAgent -> ${update.assignedAgentName} (${update.assignedAgentId})`
        : null,
    ].filter(Boolean);

    logLine(
      `  - ${update.orgName} (${update.orgId}) :: ${update.propertyName} (${update.propertyId}) :: ${changes.join(', ')}`,
    );
  }
}

async function main() {
  const shouldWrite = process.argv.includes('--write');

  const properties = await db.property.findMany({
    where: {
      deletedAt: null,
      OR: [{ landlordId: null }, { assignedAgentId: null }],
    },
    select: {
      id: true,
      name: true,
      orgId: true,
      landlordId: true,
      assignedAgentId: true,
      org: { select: { name: true } },
    },
    orderBy: [{ orgId: 'asc' }, { name: 'asc' }],
  });

  if (properties.length === 0) {
    writeUnresolvedCsv([]);
    logLine('No active properties require ownership backfill.');
    return;
  }

  const orgIds = [...new Set(properties.map((property) => property.orgId))];

  const [landlords, agents] = await Promise.all([
    db.landlord.findMany({
      where: { orgId: { in: orgIds }, archivedAt: null },
      select: { id: true, orgId: true, name: true },
      orderBy: [{ orgId: 'asc' }, { name: 'asc' }],
    }),
    db.managingAgent.findMany({
      where: { orgId: { in: orgIds }, archivedAt: null },
      select: { id: true, orgId: true, name: true },
      orderBy: [{ orgId: 'asc' }, { name: 'asc' }],
    }),
  ]);

  const landlordsByOrg = groupByOrg<Candidate>(landlords);
  const agentsByOrg = groupByOrg<Candidate>(agents);
  const updates: AssignmentUpdate[] = [];
  const unresolved: UnresolvedItem[] = [];

  for (const property of properties as PropertyRow[]) {
    const landlordCandidates = landlordsByOrg.get(property.orgId) ?? [];
    const agentCandidates = agentsByOrg.get(property.orgId) ?? [];
    const update: AssignmentUpdate = {
      propertyId: property.id,
      propertyName: property.name,
      orgId: property.orgId,
      orgName: property.org.name,
    };

    if (!property.landlordId) {
      if (landlordCandidates.length === 1) {
        update.landlordId = landlordCandidates[0].id;
        update.landlordName = landlordCandidates[0].name;
      } else {
        unresolved.push({
          propertyId: property.id,
          propertyName: property.name,
          orgId: property.orgId,
          orgName: property.org.name,
          field: 'landlordId',
          reason: formatCandidateReason('landlord', landlordCandidates.length),
        });
      }
    }

    if (!property.assignedAgentId) {
      if (agentCandidates.length === 1) {
        update.assignedAgentId = agentCandidates[0].id;
        update.assignedAgentName = agentCandidates[0].name;
      } else {
        unresolved.push({
          propertyId: property.id,
          propertyName: property.name,
          orgId: property.orgId,
          orgName: property.org.name,
          field: 'assignedAgentId',
          reason: formatCandidateReason('managing agent', agentCandidates.length),
        });
      }
    }

    if (update.landlordId || update.assignedAgentId) {
      updates.push(update);
    }
  }

  if (shouldWrite && updates.length > 0) {
    await db.$transaction(
      updates.map((update) =>
        db.property.update({
          where: { id: update.propertyId },
          data: {
            ...(update.landlordId ? { landlordId: update.landlordId } : {}),
            ...(update.assignedAgentId ? { assignedAgentId: update.assignedAgentId } : {}),
          },
        }),
      ),
    );
  }

  writeUnresolvedCsv(unresolved);

  logLine('Property ownership backfill report');
  logLine(`mode: ${shouldWrite ? 'write' : 'dry-run'}`);
  logLine(`properties scanned: ${properties.length}`);
  logLine(`properties with assignments ${shouldWrite ? 'applied' : 'planned'}: ${updates.length}`);
  logLine(`unresolved field assignments: ${unresolved.length}`);

  printAssignments(
    shouldWrite ? 'Applied assignments' : 'Planned assignments (run with --write to apply)',
    updates,
  );
}

main()
  .catch((error) => {
    console.error('Property ownership backfill failed.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
