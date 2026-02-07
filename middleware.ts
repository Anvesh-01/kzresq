import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  // const host = req.headers.get("host") || "";
  const url = req.nextUrl.clone();

  // // Ignore Next.js internal files
  if (
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/api") ||
    url.pathname.includes(".")
  ) {
    return NextResponse.next();
  }



  return NextResponse.next();
}

/**
 * Apply middleware to all routes except static files
 */
export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
