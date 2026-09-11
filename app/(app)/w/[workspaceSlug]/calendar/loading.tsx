import { Screen } from "@/components/layout/screen";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <Screen density="wide">
      <div className="space-y-4">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-[28rem] w-full rounded-xl" />
      </div>
    </Screen>
  );
}
