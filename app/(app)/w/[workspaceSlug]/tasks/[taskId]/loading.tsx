import { Skeleton } from "@/components/ui/skeleton";
import { Screen } from "@/components/layout/screen";

export default function TaskDetailLoading() {
  return (
    <Screen>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-32 w-full rounded-md" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    </Screen>
  );
}
