import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const url = req.nextUrl.clone();

  // Ignore Next.js internal files
  if (
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/api") ||
    url.pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  let subdomain = "";

  // For localhost (development)
  if (host.includes("localhost")) {
    subdomain = url.searchParams.get("sub") || "";
  }
  // For production (kzresq.com)
  else {
    subdomain = host.split(".")[0];
  }


  /* ===============================
     Prevent Rewrite Loop
     =============================== */
  if (
    url.pathname.startsWith("/user") ||
    url.pathname.startsWith("/ambulance") ||
    url.pathname.startsWith("/hospital") ||
    url.pathname.startsWith("/police")
  ) {
    return NextResponse.next();
  }

  /* ===============================
     Subdomain Routing
     =============================== */
  switch (subdomain) {
    case "user":
      url.pathname = `/user${url.pathname}`;
      break;

    case "ambulance":
      url.pathname = `/ambulance${url.pathname}`;
      break;

    case "hospital":
      url.pathname = `/hospital${url.pathname}`;
      break;

    case "police":
      url.pathname = `/police${url.pathname}`;
      break;

    default:
      // Unknown subdomain → go to main user portal
      url.pathname = "/user";
      break;
  }

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};