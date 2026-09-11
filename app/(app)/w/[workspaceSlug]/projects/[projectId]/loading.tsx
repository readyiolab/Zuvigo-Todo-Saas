import { Skeleton } from "@/components/ui/skeleton";
import { Screen } from "@/components/layout/screen";

export default function ProjectDetailLoading() {
  return (
    <Screen>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-24 w-full rounded-md" />
      <Skeleton className="h-40 w-full rounded-md" />
    </Screen>
  );
}
