import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { ensureRedisConnected } from "@/infrastructure/redis/client";
import {
  createUser,
  findSessionByTokenHash,
  findUserByEmail,
  findUserById,
  insertSessionRecord,
  revokeSessionByTokenHash,
} from "@/modules/auth/auth.repository";
import {
  loginSchema,
  signupSchema,
  type LoginInput,
  type SignupInput,
} from "@/modules/auth/auth.schema";
import { toPublicUser } from "@/modules/users/user.types";
import { getEnv } from "@/shared/env";
import {
  authenticationError,
  conflictError,
  validationError,
} from "@/shared/errors";
import { logger } from "@/shared/logger";
import { assertRateLimit } from "@/shared/rate-limit";
import { createId, createSessionToken } from "@/shared/utils/id";

const SESSION_COOKIE = "zuvigo_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function sessionRedisKey(tokenHash: string) {
  return `session:${tokenHash}`;
}

export async function signup(raw: SignupInput, meta?: { ip?: string; userAgent?: string }) {
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid signup data", parsed.error.flatten());
  }

  await assertRateLimit({
    key: `signup:${meta?.ip ?? "unknown"}`,
    limit: 10,
    windowSeconds: 60 * 15,
  });

  const existing = await findUserByEmail(parsed.data.email);
  if (existing) {
    throw conflictError("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const userId = await createUser({
    email: parsed.data.email,
    name: parsed.data.name,
    passwordHash,
  });

  logger.info("user_signed_up", { userId });
  return createSessionForUser(userId, meta);
}

export async function login(raw: LoginInput, meta?: { ip?: string; userAgent?: string }) {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid login data", parsed.error.flatten());
  }

  await assertRateLimit({
    key: `login:${parsed.data.email.toLowerCase()}:${meta?.ip ?? "unknown"}`,
    limit: 20,
    windowSeconds: 60 * 15,
  });

  const user = await findUserByEmail(parsed.data.email);
  if (!user || user.status !== "active") {
    throw authenticationError("Invalid email or password");
  }

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    throw authenticationError("Invalid email or password");
  }

  logger.info("user_logged_in", { userId: user.id });
  return createSessionForUser(user.id, meta);
}

export async function createSessionForUser(
  userId: string,
  meta?: { ip?: string; userAgent?: string }
) {
  const token = createSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  const sessionId = createId();

  await insertSessionRecord({
    id: sessionId,
    userId,
    tokenHash,
    userAgent: meta?.userAgent,
    ipAddress: meta?.ip,
    expiresAt,
  });

  // Redis is optional — MySQL tbl_sessions is the source of truth for now
  try {
    const redis = await ensureRedisConnected();
    if (redis) {
      await redis.set(
        sessionRedisKey(tokenHash),
        JSON.stringify({ userId, sessionId }),
        "EX",
        SESSION_TTL_SECONDS
      );
    }
  } catch {
    // ignore — session still works via MySQL
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: getEnv().NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  const user = await findUserById(userId);
  if (!user) throw authenticationError();

  return { user: toPublicUser(user), sessionId };
}

export async function logout() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await revokeSessionByTokenHash(tokenHash);
    try {
      const redis = await ensureRedisConnected();
      if (redis) {
        await redis.del(sessionRedisKey(tokenHash));
      }
    } catch {
      // ignore
    }
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);

  try {
    const redis = await ensureRedisConnected();
    if (redis) {
      const cached = await redis.get(sessionRedisKey(tokenHash));
      if (cached) {
        const parsed = JSON.parse(cached) as { userId: string };
        const user = await findUserById(parsed.userId);
        if (!user || user.status !== "active") return null;
        return toPublicUser(user);
      }
    }
  } catch {
    // fall through to MySQL session table
  }

  const session = await findSessionByTokenHash(tokenHash);
  if (!session || session.revoked_at) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) return null;

  const user = await findUserById(session.user_id);
  if (!user || user.status !== "active") return null;

  try {
    const redis = await ensureRedisConnected();
    if (redis) {
      await redis.set(
        sessionRedisKey(tokenHash),
        JSON.stringify({ userId: user.id }),
        "EX",
        SESSION_TTL_SECONDS
      );
    }
  } catch {
    // ignore cache warm failure
  }

  return toPublicUser(user);
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw authenticationError();
  return user;
}

export { SESSION_COOKIE, hashToken, sessionRedisKey, SESSION_TTL_SECONDS };
