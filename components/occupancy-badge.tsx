type Occ = 'VACANT' | 'OCCUPIED' | 'UPCOMING' | 'CONFLICT';

const STYLES: Record<Occ, string> = {
  VACANT: 'bg-gray-200 text-gray-800',
  OCCUPIED: 'bg-green-100 text-green-800',
  UPCOMING: 'bg-blue-100 text-blue-800',
  CONFLICT: 'bg-red-200 text-red-900',
};

export function OccupancyBadge({ state }: { state: Occ }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[state]}`}>
      {state}
    </span>
  );
}
