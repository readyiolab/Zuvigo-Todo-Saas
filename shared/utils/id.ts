import { ulid } from "ulid";

export function createId(): string {
  return ulid();
}

export function createRequestId(): string {
  return `req_${ulid().toLowerCase()}`;
}

export function createSessionToken(): string {
  return `sess_${ulid()}${ulid()}`;
}
