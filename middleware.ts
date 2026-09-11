import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "zuvigo_session";

/** Opaque session tokens are `sess_` + two ULIDs (~57 chars). */
function isPlausibleSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  if (token.length < 30 || token.length > 128) return false;
  if (!token.startsWith("sess_")) return false;
  return /^sess_[A-Za-z0-9]+$/.test(token);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const isAuthed = isPlausibleSessionToken(token);

  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isInvitePage = pathname.startsWith("/invite");
  const isProtected =
    pathname.startsWith("/w") || pathname.startsWith("/api/files");

  if (isProtected && !isAuthed) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    const response = NextResponse.redirect(url);
    if (token && !isAuthed) {
      response.cookies.delete(SESSION_COOKIE);
    }
    return response;
  }

  if (isAuthPage && isAuthed) {
    const url = request.nextUrl.clone();
    const next = request.nextUrl.searchParams.get("next");
    url.pathname = next && next.startsWith("/") ? next : "/w";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isInvitePage && !isAuthed) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  const requestId =
    request.headers.get("x-request-id") ?? `req_${crypto.randomUUID()}`;
  const response = NextResponse.next();
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: [
    "/w/:path*",
    "/login",
    "/signup",
    "/invite/:path*",
    "/api/files/:path*",
  ],
};
