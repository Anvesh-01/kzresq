import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get("host") || "";
  
  // Get the root domain from env or default to localhost
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";

  // Determine current subdomain
  // Case 1: Subdomain exists (e.g. ambulance.localhost:3000 -> ambulance)
  // Case 2: Root domain (e.g. localhost:3000 -> user)
  const currentHost =
    hostname.replace(`.${rootDomain}`, "") === "www" || 
    hostname === rootDomain
      ? "user" 
      : hostname.replace(`.${rootDomain}`, "");


  // Prevent rewriting for public files and api
  if (
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/static") ||
    url.pathname.includes(".") // files like favicon.ico
  ) {
    return NextResponse.next();
  }

  // Rewrite URL to the appropriate subdirectory
  if (currentHost === "ambulance") {
    url.pathname = `/ambulance${url.pathname}`;
    return NextResponse.rewrite(url);
  }
  if (currentHost === "hospital") {
    url.pathname = `/hospital${url.pathname}`;
    return NextResponse.rewrite(url);
  }
  if (currentHost === "police") {
    url.pathname = `/police${url.pathname}`;
    return NextResponse.rewrite(url);
  }
  if (currentHost === "user") {
    url.pathname = `/user${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};