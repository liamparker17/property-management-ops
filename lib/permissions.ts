import type { Org, OrgOwnerType } from '@prisma/client';

type OrgContext = Pick<Org, 'ownerType' | 'landlordApprovalThresholdCents'>;

export type LandlordApprovalAction =
  | { kind: 'MAINTENANCE_COMMIT'; amountCents: number }
  | { kind: 'LEASE_CREATE' }
  | { kind: 'LEASE_RENEW' }
  | { kind: 'RENT_CHANGE' }
  | { kind: 'TENANT_EVICT' }
  | { kind: 'PROPERTY_REMOVE' };

export function landlordHasExecutiveAuthority(org: Pick<Org, 'ownerType'>): boolean {
  return org.ownerType === 'LANDLORD_DIRECT';
}

export function requiresLandlordApproval(
  action: LandlordApprovalAction,
  org: OrgContext,
): boolean {
  if (org.ownerType === 'LANDLORD_DIRECT') return false;

  switch (action.kind) {
    case 'MAINTENANCE_COMMIT':
      return action.amountCents >= org.landlordApprovalThresholdCents;
    case 'LEASE_CREATE':
    case 'LEASE_RENEW':
    case 'RENT_CHANGE':
    case 'TENANT_EVICT':
    case 'PROPERTY_REMOVE':
      return true;
  }
}

export function orgOwnerTypeLabel(t: OrgOwnerType): string {
  return t === 'LANDLORD_DIRECT' ? 'Landlord-owned' : 'Property management agency';
}
