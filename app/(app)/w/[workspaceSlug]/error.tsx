"use client";

import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/layout/screen";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Screen>
      <Alert variant="destructive">
        <AlertTitle className="text-body font-medium">
          Something went wrong
        </AlertTitle>
        <AlertDescription className="text-caption">
          We couldn&apos;t load this workspace. Try again.
        </AlertDescription>
      </Alert>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </Screen>
  );
}
