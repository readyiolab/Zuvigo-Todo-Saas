import { Screen } from "@/components/layout/screen";
import { Skeleton } from "@/components/ui/skeleton";

export default function TasksLoading() {
  return (
    <Screen className="max-w-[1400px] space-y-8">
      <div className="space-y-5">
        <Skeleton className="h-3 w-28" />
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
        <div className="flex gap-1.5 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 shrink-0 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>

      <Skeleton className="h-12 w-full rounded-xl" />

      <div className="divide-y divide-border/30">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex min-h-14 items-center gap-3 px-2 py-3 sm:px-3"
          >
            <Skeleton className="size-4 rounded" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="hidden h-5 w-14 rounded-md md:block" />
            <Skeleton className="hidden h-5 w-16 rounded-md md:block" />
          </div>
        ))}
      </div>
    </Screen>
  );
}
