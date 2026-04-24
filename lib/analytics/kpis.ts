import type { Role } from '@prisma/client';

export type KpiId =
  | 'OCCUPANCY_PCT'
  | 'ARREARS_CENTS'
  | 'COLLECTION_RATE'
  | 'TRUST_BALANCE'
  | 'UNALLOCATED_CENTS'
  | 'OPEN_MAINTENANCE'
  | 'EXPIRING_LEASES_30'
  | 'BLOCKED_APPROVALS'
  | 'GROSS_RENT'
  | 'DISBURSED_CENTS'
  | 'MAINTENANCE_SPEND'
  | 'VACANCY_DRAG'
  | 'AGENT_OPEN_TICKETS'
  | 'AGENT_UPCOMING_INSPECTIONS';

export interface KpiDefinition {
  id: KpiId;
  label: string;
  eyebrow: string;
  sources: string[];
  formula: string;
  drillTarget: (ctx: { role: Role }) => string;
  comparisonMode: 'PRIOR_PERIOD' | 'NONE';
  format: 'PCT' | 'CENTS' | 'COUNT';
}

function byRole(role: Role, targets: Partial<Record<Role, string>>, fallback: string) {
  return targets[role] ?? fallback;
}

export const KPIS: Record<KpiId, KpiDefinition> = {
  OCCUPANCY_PCT: {
    id: 'OCCUPANCY_PCT',
    label: 'Occupancy',
    eyebrow: 'Portfolio',
    sources: ['OrgMonthlySnapshot.occupiedUnits', 'OrgMonthlySnapshot.totalUnits'],
    formula: 'occupiedUnits / totalUnits',
    drillTarget: ({ role }) =>
      byRole(
        role,
        { LANDLORD: '/landlord/properties', MANAGING_AGENT: '/agent/properties', TENANT: '/tenant/lease' },
        '/dashboard/portfolio',
      ),
    comparisonMode: 'PRIOR_PERIOD',
    format: 'PCT',
  },
  ARREARS_CENTS: {
    id: 'ARREARS_CENTS',
    label: 'Arrears',
    eyebrow: 'Collections',
    sources: ['OrgMonthlySnapshot.arrearsCents'],
    formula: 'sum(overdue invoices)',
    drillTarget: ({ role }) =>
      byRole(
        role,
        { LANDLORD: '/landlord/invoices', MANAGING_AGENT: '/agent/maintenance', TENANT: '/tenant/invoices' },
        '/dashboard/finance',
      ),
    comparisonMode: 'PRIOR_PERIOD',
    format: 'CENTS',
  },
  COLLECTION_RATE: {
    id: 'COLLECTION_RATE',
    label: 'Collection Rate',
    eyebrow: 'Collections',
    sources: ['OrgMonthlySnapshot.billedCents', 'OrgMonthlySnapshot.collectedCents'],
    formula: 'collectedCents / billedCents',
    drillTarget: ({ role }) =>
      byRole(
        role,
        { LANDLORD: '/landlord/reports', MANAGING_AGENT: '/agent/maintenance', TENANT: '/tenant/payments' },
        '/dashboard/finance',
      ),
    comparisonMode: 'PRIOR_PERIOD',
    format: 'PCT',
  },
  TRUST_BALANCE: {
    id: 'TRUST_BALANCE',
    label: 'Trust Balance',
    eyebrow: 'Trust',
    sources: ['OrgMonthlySnapshot.trustBalanceCents'],
    formula: 'sum(trust ledger amountCents)',
    drillTarget: ({ role }) =>
      byRole(
        role,
        { LANDLORD: '/landlord/statements', MANAGING_AGENT: '/agent/properties', TENANT: '/tenant/payments' },
        '/dashboard/finance',
      ),
    comparisonMode: 'PRIOR_PERIOD',
    format: 'CENTS',
  },
  UNALLOCATED_CENTS: {
    id: 'UNALLOCATED_CENTS',
    label: 'Unallocated Cash',
    eyebrow: 'Trust',
    sources: ['OrgMonthlySnapshot.unallocatedCents'],
    formula: 'receipts + allocations + reversals',
    drillTarget: ({ role }) =>
      byRole(
        role,
        { LANDLORD: '/landlord/statements', MANAGING_AGENT: '/agent/properties', TENANT: '/tenant/payments' },
        '/dashboard/finance',
      ),
    comparisonMode: 'PRIOR_PERIOD',
    format: 'CENTS',
  },
  OPEN_MAINTENANCE: {
    id: 'OPEN_MAINTENANCE',
    label: 'Open Maintenance',
    eyebrow: 'Operations',
    sources: ['OrgMonthlySnapshot.openMaintenance'],
    formula: 'count(OPEN + IN_PROGRESS maintenance)',
    drillTarget: ({ role }) =>
      byRole(
        role,
        { LANDLORD: '/landlord/maintenance', MANAGING_AGENT: '/agent/maintenance', TENANT: '/tenant/repairs' },
        '/dashboard/maintenance',
      ),
    comparisonMode: 'PRIOR_PERIOD',
    format: 'COUNT',
  },
  EXPIRING_LEASES_30: {
    id: 'EXPIRING_LEASES_30',
    label: 'Expiring in 30 Days',
    eyebrow: 'Leases',
    sources: ['OrgMonthlySnapshot.expiringLeases30'],
    formula: 'count(active leases ending in 30 days)',
    drillTarget: ({ role }) =>
      byRole(
        role,
        { LANDLORD: '/landlord/properties', MANAGING_AGENT: '/agent/inspections', TENANT: '/tenant/lease' },
        '/dashboard/operations',
      ),
    comparisonMode: 'PRIOR_PERIOD',
    format: 'COUNT',
  },
  BLOCKED_APPROVALS: {
    id: 'BLOCKED_APPROVALS',
    label: 'Blocked Approvals',
    eyebrow: 'Approvals',
    sources: ['OrgMonthlySnapshot.blockedApprovals'],
    formula: 'count(PENDING approvals)',
    drillTarget: ({ role }) =>
      byRole(
        role,
        { LANDLORD: '/landlord/notices', MANAGING_AGENT: '/agent/notices', TENANT: '/tenant/notices' },
        '/dashboard/operations',
      ),
    comparisonMode: 'PRIOR_PERIOD',
    format: 'COUNT',
  },
  GROSS_RENT: {
    id: 'GROSS_RENT',
    label: 'Gross Rent',
    eyebrow: 'Revenue',
    sources: ['LandlordMonthlySnapshot.grossRentCents', 'PropertyMonthlySnapshot.grossRentCents'],
    formula: 'sum(invoice totals for period)',
    drillTarget: ({ role }) =>
      byRole(
        role,
        { LANDLORD: '/landlord/invoices', MANAGING_AGENT: '/agent/properties', TENANT: '/tenant/invoices' },
        '/dashboard/finance',
      ),
    comparisonMode: 'PRIOR_PERIOD',
    format: 'CENTS',
  },
  DISBURSED_CENTS: {
    id: 'DISBURSED_CENTS',
    label: 'Disbursed',
    eyebrow: 'Trust',
    sources: ['LandlordMonthlySnapshot.disbursedCents'],
    formula: 'sum(DISBURSEMENT entries)',
    drillTarget: ({ role }) =>
      byRole(
        role,
        { LANDLORD: '/landlord/statements', MANAGING_AGENT: '/agent/properties', TENANT: '/tenant/payments' },
        '/dashboard/finance',
      ),
    comparisonMode: 'PRIOR_PERIOD',
    format: 'CENTS',
  },
  MAINTENANCE_SPEND: {
    id: 'MAINTENANCE_SPEND',
    label: 'Maintenance Spend',
    eyebrow: 'Operations',
    sources: ['LandlordMonthlySnapshot.maintenanceSpendCents'],
    formula: 'sum(FEE ledger entries for maintenance)',
    drillTarget: ({ role }) =>
      byRole(
        role,
        { LANDLORD: '/landlord/maintenance', MANAGING_AGENT: '/agent/maintenance', TENANT: '/tenant/repairs' },
        '/dashboard/maintenance',
      ),
    comparisonMode: 'PRIOR_PERIOD',
    format: 'CENTS',
  },
  VACANCY_DRAG: {
    id: 'VACANCY_DRAG',
    label: 'Vacancy Drag',
    eyebrow: 'Portfolio',
    sources: ['LandlordMonthlySnapshot.vacancyDragCents'],
    formula: 'sum(last known rent for currently vacant units',
    drillTarget: ({ role }) =>
      byRole(
        role,
        { LANDLORD: '/landlord/reports', MANAGING_AGENT: '/agent/properties', TENANT: '/tenant/outages' },
        '/dashboard/portfolio',
      ),
    comparisonMode: 'PRIOR_PERIOD',
    format: 'CENTS',
  },
  AGENT_OPEN_TICKETS: {
    id: 'AGENT_OPEN_TICKETS',
    label: 'Open Tickets',
    eyebrow: 'Agent Queue',
    sources: ['AgentMonthlySnapshot.openTickets'],
    formula: 'count(open maintenance for assigned properties)',
    drillTarget: ({ role }) =>
      byRole(role, { LANDLORD: '/landlord/maintenance', TENANT: '/tenant/repairs' }, '/agent/maintenance'),
    comparisonMode: 'PRIOR_PERIOD',
    format: 'COUNT',
  },
  AGENT_UPCOMING_INSPECTIONS: {
    id: 'AGENT_UPCOMING_INSPECTIONS',
    label: 'Upcoming Inspections',
    eyebrow: 'Agent Queue',
    sources: ['AgentMonthlySnapshot.upcomingInspections'],
    formula: 'count(scheduled/in-progress inspections in future)',
    drillTarget: ({ role }) =>
      byRole(role, { LANDLORD: '/landlord/properties', TENANT: '/tenant/inspections' }, '/agent/inspections'),
    comparisonMode: 'PRIOR_PERIOD',
    format: 'COUNT',
  },
};

export function getKpi(id: KpiId): KpiDefinition {
  return KPIS[id];
}
