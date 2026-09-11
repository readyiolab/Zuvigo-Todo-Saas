type LogLevel = "debug" | "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

function emit(level: LogLevel, event: string, fields: LogFields = {}) {
  const payload = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...sanitize(fields),
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "password_hash",
  "token",
  "secret",
  "authorization",
  "cookie",
  "apiKey",
  "api_key",
]);

function sanitize(fields: LogFields): LogFields {
  const out: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (SENSITIVE_KEYS.has(key) || key.toLowerCase().includes("secret")) {
      out[key] = "[redacted]";
    } else {
      out[key] = value;
    }
  }
  return out;
}

export const logger = {
  debug: (event: string, fields?: LogFields) => emit("debug", event, fields),
  info: (event: string, fields?: LogFields) => emit("info", event, fields),
  warn: (event: string, fields?: LogFields) => emit("warn", event, fields),
  error: (event: string, fields?: LogFields) => emit("error", event, fields),
};
