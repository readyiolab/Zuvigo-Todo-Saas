import { Skeleton } from "@/components/ui/skeleton";
import { Screen } from "@/components/layout/screen";

export default function PageDetailLoading() {
  return (
    <Screen>
      <Skeleton className="h-8 w-64" />
      <div className="space-y-3 pt-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
        <Skeleton className="h-32 w-full rounded-md" />
      </div>
    </Screen>
  );
}
