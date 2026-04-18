import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export default function LeasesLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 border-b border-border/60 pb-5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-10 w-full max-w-xl rounded-full" />
      <Card className="overflow-hidden p-0">
        <div className="divide-y divide-border/60">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-5 items-center gap-4 px-4 py-4">
              <Skeleton className="h-4" />
              <Skeleton className="h-4" />
              <Skeleton className="h-4" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-16 rounded-full justify-self-end" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
