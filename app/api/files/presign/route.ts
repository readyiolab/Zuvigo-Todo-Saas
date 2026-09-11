import { NextResponse } from "next/server";
import { requireUser } from "@/modules/auth/auth.service";
import { createUploadUrl } from "@/modules/files/file.service";
import { toErrorResponse } from "@/shared/errors";
import { assertRateLimit } from "@/shared/rate-limit";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await assertRateLimit({
      key: `files:presign:${user.id}`,
      limit: 30,
      windowSeconds: 60,
    });
    const body = await request.json();
    const data = await createUploadUrl(user.id, body);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const mapped = toErrorResponse(error);
    return NextResponse.json(
      { success: false, error: mapped.error },
      { status: mapped.status }
    );
  }
}
