import { Skeleton } from "@/components/ui/skeleton";
import { Screen } from "@/components/layout/screen";

export default function Loading() {
  return (
    <Screen>
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-14 w-full rounded-md" />
        <Skeleton className="h-14 w-full rounded-md" />
        <Skeleton className="h-14 w-full rounded-md" />
      </div>
    </Screen>
  );
}
