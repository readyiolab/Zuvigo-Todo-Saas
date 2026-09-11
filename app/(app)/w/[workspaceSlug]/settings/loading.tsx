import { Skeleton } from "@/components/ui/skeleton";
import { Screen } from "@/components/layout/screen";

export default function Loading() {
  return (
    <Screen>
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-56 w-full rounded-lg" />
    </Screen>
  );
}
