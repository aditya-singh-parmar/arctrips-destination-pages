import { NextResponse, type NextRequest } from "next/server";

/**
 * The taxonomy PRD forbids trailing slashes on canonical URLs and forbids
 * redirects. Next.js resolves that by default with a 308, which breaches the
 * second rule. Rewriting instead serves the canonical path at 200 with no hop.
 * See docs/superpowers/specs/2026-07-27-destinations-experience-design.md 2.4.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.length > 1 && pathname.endsWith("/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/\/+$/, "");
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
