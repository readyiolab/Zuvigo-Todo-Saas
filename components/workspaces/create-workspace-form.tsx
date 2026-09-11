"use client";

import { useActionState } from "react";
import {
  createWorkspaceAction,
  type ActionResult,
} from "@/modules/workspaces/workspace.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

export function CreateWorkspaceForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    createWorkspaceAction,
    null
  );

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Workspace name</Label>
        <Input id="name" name="name" placeholder="Acme Inc" required />
      </div>
      {state && !state.success ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error.message}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Spinner className="size-3.5" />
            Creating…
          </>
        ) : (
          "Create workspace"
        )}
      </Button>
    </form>
  );
}
