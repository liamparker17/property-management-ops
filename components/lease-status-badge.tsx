type Status = 'DRAFT' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'TERMINATED' | 'RENEWED';

const STYLES: Record<Status, string> = {
  DRAFT: 'bg-gray-200 text-gray-800',
  ACTIVE: 'bg-green-100 text-green-800',
  EXPIRING: 'bg-yellow-100 text-yellow-800',
  EXPIRED: 'bg-red-100 text-red-800',
  TERMINATED: 'bg-gray-300 text-gray-900',
  RENEWED: 'bg-blue-100 text-blue-800',
};

export function LeaseStatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {status}
    </span>
  );
}
