import { NextResponse } from "next/server";
import { requireUser } from "@/modules/auth/auth.service";
import { confirmUpload } from "@/modules/files/file.service";
import { toErrorResponse } from "@/shared/errors";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = (await request.json()) as { workspaceId?: string };
    if (!body.workspaceId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "workspaceId is required" },
        },
        { status: 400 }
      );
    }
    const data = await confirmUpload(user.id, id, body.workspaceId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const mapped = toErrorResponse(error);
    return NextResponse.json(
      { success: false, error: mapped.error },
      { status: mapped.status }
    );
  }
}
