"use server";

import { requireUser } from "@/modules/auth/auth.service";
import { searchWorkspace } from "@/modules/search/search.service";
import {
  type ActionResult,
  failAction,
  okAction,
} from "@/shared/actions/result";

export type { ActionResult };

export async function searchWorkspaceAction(input: {
  workspaceId: string;
  query: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const results = await searchWorkspace(
      input.workspaceId,
      user.id,
      input.query
    );
    return okAction({ results });
  } catch (error) {
    return failAction(error, "search_action_error");
  }
}
