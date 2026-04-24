import type { Role } from '@prisma/client';

import type { KpiId } from '@/lib/analytics/kpis';
import { getKpi } from '@/lib/analytics/kpis';

export function resolveDrillTarget(
  kpi: KpiId,
  role: Role,
  scope?: { propertyId?: string; landlordId?: string; agentId?: string },
): string {
  const basePath = getKpi(kpi).drillTarget({ role });
  const params = new URLSearchParams();

  if (scope?.propertyId) params.set('propertyId', scope.propertyId);
  if (scope?.landlordId) params.set('landlordId', scope.landlordId);
  if (scope?.agentId) params.set('agentId', scope.agentId);

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
