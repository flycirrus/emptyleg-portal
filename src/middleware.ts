import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// --- Best-effort brute-force throttle for auth endpoints -------------------
// In-memory, per edge instance: stops a single scanner/bot from hammering the
// login or signup (which exhausts DB connections and makes the admin dashboard
// hang). It is a speed bump, not a wall — for a distributed attack upgrade to a
// shared store (Vercel KV / Upstash Redis) keyed the same way.
const WINDOW_MS = 60_000; // 1 minute window
const MAX_ATTEMPTS = 10; // per IP per window
const attempts = new Map<string, { count: number; resetAt: number }>();

const THROTTLED_PATHS = new Set([
  "/api/auth/callback/credentials", // credentials login
  "/api/auth/signup", // self-registration
]);

function isRateLimited(ip: string): boolean {
  const now = Date.now();

  // Opportunistic cleanup so the map can't grow without bound.
  if (attempts.size > 5_000) {
    for (const [key, entry] of attempts) {
      if (now > entry.resetAt) attempts.delete(key);
    }
  }

  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Rate-limit login / signup POSTs.
  if (request.method === "POST" && THROTTLED_PATHS.has(pathname)) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a minute and try again." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }
    return NextResponse.next();
  }

  // 2. Auth gate for protected pages.
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  const isLoggedIn = !!sessionToken;

  if (pathname.startsWith("/admin") || pathname.startsWith("/flights")) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname === "/pending" && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/flights/:path*",
    "/pending",
    "/api/auth/callback/credentials",
    "/api/auth/signup",
  ],
};
