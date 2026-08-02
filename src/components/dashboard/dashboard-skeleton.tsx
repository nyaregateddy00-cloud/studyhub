import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Skeleton className="h-32 rounded-2xl" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
          <Skeleton className="h-56 rounded-2xl" />
        </div>
        <div className="space-y-4">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-44 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
