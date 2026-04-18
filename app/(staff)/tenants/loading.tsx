import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export default function TenantsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 border-b border-border/60 pb-5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Card className="overflow-hidden p-0">
        <div className="divide-y divide-border/60">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-4 w-44" />
              <Skeleton className="ml-auto h-4 w-32" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
