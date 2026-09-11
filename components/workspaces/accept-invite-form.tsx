"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptInviteAction } from "@/modules/workspaces/workspace.actions";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

export function AcceptInviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        type="button"
        className="w-full"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await acceptInviteAction(token);
            if (result && !result.success) {
              setError(result.error.message);
              return;
            }
            router.refresh();
          });
        }}
      >
        {pending ? (
          <>
            <Spinner className="size-3.5" />
            Joining…
          </>
        ) : (
          "Accept invitation"
        )}
      </Button>
    </div>
  );
}
