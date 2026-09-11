export type ErrorCode =
  | "VALIDATION_ERROR"
  | "AUTHENTICATION_ERROR"
  | "AUTHORIZATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMIT"
  | "DATABASE_ERROR"
  | "EXTERNAL_SERVICE_ERROR"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    code: ErrorCode,
    message: string,
    status: number,
    details?: unknown
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function validationError(message: string, details?: unknown) {
  return new AppError("VALIDATION_ERROR", message, 400, details);
}

export function authenticationError(message = "Authentication required") {
  return new AppError("AUTHENTICATION_ERROR", message, 401);
}

export function authorizationError(message = "You do not have permission") {
  return new AppError("AUTHORIZATION_ERROR", message, 403);
}

export function notFoundError(message = "Resource not found") {
  return new AppError("NOT_FOUND", message, 404);
}

export function conflictError(message: string, details?: unknown) {
  return new AppError("CONFLICT", message, 409, details);
}

export function rateLimitError(message = "Too many requests") {
  return new AppError("RATE_LIMIT", message, 429);
}

export function databaseError(message = "A database error occurred") {
  return new AppError("DATABASE_ERROR", message, 500);
}

export function externalServiceError(message: string) {
  return new AppError("EXTERNAL_SERVICE_ERROR", message, 502);
}

export function toErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return {
      success: false as const,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
      status: error.status,
    };
  }

  return {
    success: false as const,
    error: {
      code: "INTERNAL_ERROR" as const,
      message: "An unexpected error occurred.",
    },
    status: 500,
  };
}
