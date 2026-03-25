// Required by @supabase/ssr to refresh expired sessions on every request.
// Without this, server clients receive stale auth tokens after expiry.
// See: https://supabase.com/docs/guides/auth/server-side/nextjs

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/types";

// Route classification constants
const PUBLIC_ROUTES = ["/", "/login", "/signup"];
const PUBLIC_PREFIXES = ["/api/auth/"];
const PARENT_ROUTES = ["/dashboard", "/search", "/bookings", "/profile"];
const TEACHER_PREFIX = "/teacher/";
const API_PREFIX = "/api/";

function isPublicRoute(pathname: string): boolean {
  return (
    PUBLIC_ROUTES.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith(API_PREFIX);
}

function isParentRoute(pathname: string): boolean {
  return PARENT_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

function isTeacherRoute(pathname: string): boolean {
  return pathname.startsWith(TEACHER_PREFIX);
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — do not remove this line.
  // It must run on every request that needs auth context.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public routes — always pass through
  if (isPublicRoute(pathname)) {
    return supabaseResponse;
  }

  // API routes (non-auth) — return 401 for unauthenticated requests
  if (isApiRoute(pathname)) {
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }
    return supabaseResponse;
  }

  // Protected page routes — redirect unauthenticated users to /login
  if (!user) {
    const redirectResponse = NextResponse.redirect(new URL("/login", request.url));
    supabaseResponse.cookies
      .getAll()
      .forEach(({ name, value }) => redirectResponse.cookies.set(name, value));
    return redirectResponse;
  }

  const role = user.user_metadata.role as UserRole;

  // Parents cannot access teacher routes
  if (role === "parent" && isTeacherRoute(pathname)) {
    const redirectResponse = NextResponse.redirect(new URL("/dashboard", request.url));
    supabaseResponse.cookies
      .getAll()
      .forEach(({ name, value }) => redirectResponse.cookies.set(name, value));
    return redirectResponse;
  }

  // Teachers cannot access parent routes
  if (role === "teacher" && isParentRoute(pathname)) {
    const redirectResponse = NextResponse.redirect(new URL("/teacher/dashboard", request.url));
    supabaseResponse.cookies
      .getAll()
      .forEach(({ name, value }) => redirectResponse.cookies.set(name, value));
    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Match all routes except Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
