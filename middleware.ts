import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  // const host = req.headers.get("host") || "";
  const url = req.nextUrl.clone();

  // Ignore Next.js internal files
  // if (
  //   url.pathname.startsWith("/_next") ||
  //   url.pathname.startsWith("/api") ||
  //   url.pathname.includes(".")
  // ) {
  //   return NextResponse.next();
  // }

  // let subdomain = "";

  // // For localhost development
  // if (host.includes("localhost")) {
  //   subdomain = url.searchParams.get("sub") || "";
  // } 
  // // For production domain
  // else {
  //   subdomain = host.split(".")[0];
  // }

  // // Define public routes that don't require authentication
  // const publicRoutes = ["/sign-in", "/sign-up", "/forgot-password"];
  // const isPublicRoute = publicRoutes.some(route => url.pathname.endsWith(route));

  // // Create response object
  // let response = NextResponse.next();

  // // Prevent rewrite loop
  // if (
  //   url.pathname.startsWith("/user") ||
  //   url.pathname.startsWith("/hospital") ||
  //   url.pathname.startsWith("/police") ||
  //   url.pathname.startsWith("/..")
  // ) {
  //   // Extract the base path (/user, /hospital, or /police)
  //   const basePath = url.pathname.split("/")[1];

  //   // Check authentication based on subdomain
  //   if (!isPublicRoute) {
  //     if (basePath === "user") {
  //       // Check Supabase auth for users
  //       const supabase = createServerClient(
  //         process.env.NEXT_PUBLIC_SUPABASE_URL!,
  //         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  //         {
  //           cookies: {
  //             get(name: string) {
  //               return req.cookies.get(name)?.value;
  //             },
  //             set(name: string, value: string, options: any) {
  //               response.cookies.set({ name, value, ...options });
  //             },
  //             remove(name: string, options: any) {
  //               response.cookies.set({ name, value: "", ...options });
  //             },
  //           },
  //         }
  //       );

  //       const { data: { session } } = await supabase.auth.getSession();

  //       if (!session) {
  //         url.pathname = `/user/sign-in`;
  //         return NextResponse.redirect(url);
  //       }
  //     } else if (basePath === "hospital") {
  //       // Check hospital session cookie
  //       const hospitalSession = req.cookies.get("hospital_session")?.value;
        
  //       if (!hospitalSession) {
  //         url.pathname = `/hospital/sign-in`;
  //         return NextResponse.redirect(url);
  //       }
  //     } else if (basePath === "police") {
  //       // Check police session cookie
  //       const policeSession = req.cookies.get("police_session")?.value;
        
  //       if (!policeSession) {
  //         url.pathname = `/police/sign-in`;
  //         return NextResponse.redirect(url);
  //       }
  //     }
  //   }
    
  //   return response;
  // }

  // // Rewrite based on subdomain
  // switch (subdomain) {
  //   case "user":
  //     if (!isPublicRoute) {
  //       // Check Supabase auth for user subdomain
  //       const supabase = createServerClient(
  //         process.env.NEXT_PUBLIC_SUPABASE_URL!,
  //         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  //         {
  //           cookies: {
  //             get(name: string) {
  //               return req.cookies.get(name)?.value;
  //             },
  //             set(name: string, value: string, options: any) {
  //               response.cookies.set({ name, value, ...options });
  //             },
  //             remove(name: string, options: any) {
  //               response.cookies.set({ name, value: "", ...options });
  //             },
  //           },
  //         }
  //       );

  //       const { data: { session } } = await supabase.auth.getSession();

  //       if (!session) {
  //         url.pathname = `/user/sign-in`;
  //         return NextResponse.redirect(url);
  //       }
  //     }
  //     url.pathname = `/user${url.pathname}`;
  //     break;

  //   case "hospital":
  //     if (!isPublicRoute) {
  //       const hospitalSession = req.cookies.get("hospital_session")?.value;
        
  //       if (!hospitalSession) {
  //         url.pathname = `/hospital/sign-in`;
  //         return NextResponse.redirect(url);
  //       }
  //     }
  //     url.pathname = `/hospital${url.pathname}`;
  //     break;

  //   case "police":
  //     if (!isPublicRoute) {
  //       const policeSession = req.cookies.get("police_session")?.value;
        
  //       if (!policeSession) {
  //         url.pathname = `/police/sign-in`;
  //         return NextResponse.redirect(url);
  //       }
  //     }
  //     url.pathname = `/police${url.pathname}`;
  //     break;

  //   default:
  //     // Root domain → landing page
  //     url.pathname = "../";
  //     break;
  // }

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};