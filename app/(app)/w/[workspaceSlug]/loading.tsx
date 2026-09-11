import { Skeleton } from "@/components/ui/skeleton";
import { Screen } from "@/components/layout/screen";

export default function WorkspaceLoading() {
  return (
    <Screen>
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-28 w-full rounded-md" />
        <Skeleton className="h-28 w-full rounded-md" />
      </div>
    </Screen>
  );
}
