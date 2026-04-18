import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export default function PropertiesLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 border-b border-border/60 pb-5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-60" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-start justify-between">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <Skeleton className="h-4 w-4" />
            </div>
            <div className="mt-4 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
