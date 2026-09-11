import { z } from "zod";

const envSchema = z.object({
  APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters"),

  DATABASE_HOST: z.string().default("127.0.0.1"),
  DATABASE_PORT: z.coerce.number().default(3306),
  DATABASE_USER: z.string().default("root"),
  DATABASE_PASSWORD: z.string().default(""),
  DATABASE_NAME: z.string().default("zuvigotodo"),

  REDIS_URL: z.string().optional().default(""),

  DO_SPACES_ENDPOINT: z.string().optional().default(""),
  DO_SPACES_REGION: z.string().optional().default("blr1"),
  DO_SPACES_BUCKET: z.string().optional().default(""),
  DO_SPACES_KEY: z.string().optional().default(""),
  DO_SPACES_SECRET: z.string().optional().default(""),
  DO_SPACES_CDN_ENDPOINT: z.string().optional().default(""),
  /** Max upload size in bytes (default 25MB). */
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(25 * 1024 * 1024),

  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_MODEL: z.string().optional().default("gpt-4o-mini"),
  STRIPE_SECRET_KEY: z.string().optional().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),
  EMAIL_FROM: z.string().optional().default("noreply@example.com"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse({
    APP_URL: process.env.APP_URL,
    NODE_ENV: process.env.NODE_ENV,
    AUTH_SECRET: process.env.AUTH_SECRET ?? "dev-only-change-me-32chars!!",
    DATABASE_HOST: process.env.DATABASE_HOST,
    DATABASE_PORT: process.env.DATABASE_PORT,
    DATABASE_USER: process.env.DATABASE_USER,
    DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,
    DATABASE_NAME: process.env.DATABASE_NAME,
    REDIS_URL: process.env.REDIS_URL,
    DO_SPACES_ENDPOINT: process.env.DO_SPACES_ENDPOINT,
    DO_SPACES_REGION: process.env.DO_SPACES_REGION,
    DO_SPACES_BUCKET: process.env.DO_SPACES_BUCKET,
    DO_SPACES_KEY: process.env.DO_SPACES_KEY,
    DO_SPACES_SECRET: process.env.DO_SPACES_SECRET,
    DO_SPACES_CDN_ENDPOINT: process.env.DO_SPACES_CDN_ENDPOINT,
    MAX_UPLOAD_BYTES: process.env.MAX_UPLOAD_BYTES,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    EMAIL_FROM: process.env.EMAIL_FROM,
  });

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${message}`);
  }

  cached = parsed.data;
  return cached;
}

export function isSpacesConfigured(): boolean {
  const env = getEnv();
  return Boolean(
    env.DO_SPACES_ENDPOINT &&
      env.DO_SPACES_BUCKET &&
      env.DO_SPACES_KEY &&
      env.DO_SPACES_SECRET
  );
}

/** Redis is optional until Upstash (or other) is configured. */
export function isRedisConfigured(): boolean {
  const url = getEnv().REDIS_URL?.trim() ?? "";
  return url.length > 0;
}
