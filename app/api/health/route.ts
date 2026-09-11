import { NextResponse } from "next/server";
import { pingDatabase } from "@/infrastructure/database/connection";
import { pingRedis } from "@/infrastructure/redis/client";
import { pingSpaces } from "@/infrastructure/storage/spaces";
import { isSpacesConfigured } from "@/shared/env";

export async function GET() {
  const [mysqlOk, redisOk, spacesOk] = await Promise.all([
    pingDatabase(),
    pingRedis(),
    isSpacesConfigured() ? pingSpaces() : Promise.resolve(false),
  ]);

  const ok = mysqlOk; // MySQL is required; Redis/Spaces may be optional in early local setup

  return NextResponse.json(
    {
      success: ok,
      checks: {
        mysql: mysqlOk,
        redis: redisOk,
        spacesConfigured: isSpacesConfigured(),
        spaces: spacesOk,
      },
    },
    { status: ok ? 200 : 503 }
  );
}
