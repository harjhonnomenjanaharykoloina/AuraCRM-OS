import { NextResponse } from "next/server";
import { getProxySession } from "@/lib/auth/proxy";
import { authRateLimiter, getClientIp } from "@/lib/rate-limit-store";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isExcludedAuthPath(pathname: string): boolean {
    if (pathname === "/api/auth/health" || pathname === "/api/auth/healthz") {
        return true;
    }
    return pathname.includes("/callback");
}

function isMutationRequest(method: string): boolean {
    return MUTATION_METHODS.has(method.toUpperCase());
}

function getExpectedOrigin(req: Request): string | null {
    const betterAuthUrl = process.env.BETTER_AUTH_URL;
    if (betterAuthUrl) {
        try {
            return new URL(betterAuthUrl).origin;
        } catch {
            // Invalid BETTER_AUTH_URL; fall back to the request host.
        }
    }

    const host = req.headers.get("host");
    if (!host) return null;

    const forwardedProto = req.headers.get("x-forwarded-proto");
    const proto = forwardedProto
        ? forwardedProto.split(",")[0].trim().toLowerCase()
        : "http";
    return `${proto}://${host}`;
}

function originMatches(req: Request, expectedOrigin: string): boolean {
    const origin = req.headers.get("origin");
    if (origin === expectedOrigin) {
        return true;
    }

    // Fallback: validate the Referer header (full URL -> compare its origin).
    const referer = req.headers.get("referer");
    if (referer && referer !== "") {
        try {
            return new URL(referer).origin === expectedOrigin;
        } catch {
            return false;
        }
    }

    return false;
}

function logSecurityEvent(event: string, details: Record<string, unknown>): void {
    console.warn(`[middleware] ${event}`, details);
}

export default async function proxy(req: Request) {
    const { pathname } = new URL(req.url);
    const isAuthApiRoute = pathname.startsWith("/api/auth");

    if (isAuthApiRoute && !isExcludedAuthPath(pathname)) {
        const ip = getClientIp(req) ?? "unknown";
        const { allowed, resetAt } = await authRateLimiter.consume(ip);
        if (!allowed) {
            const res = NextResponse.json(
                { error: "Too many requests" },
                { status: 429 }
            );
            const retryAfter = Math.max(
                0,
                Math.ceil((resetAt.getTime() - Date.now()) / 1000)
            );
            res.headers.set("Retry-After", String(retryAfter));
            return res;
        }
    }

    const isApiRoute = pathname.startsWith("/api");

    // CSRF defense-in-depth: for mutating requests on non-auth API routes,
    // require that the Origin (or Referer fallback) matches the expected site.
    if (isMutationRequest(req.method) && isApiRoute && !isAuthApiRoute) {
        const expectedOrigin = getExpectedOrigin(req);
        if (!expectedOrigin || !originMatches(req, expectedOrigin)) {
            logSecurityEvent("csrf_validation_failed", {
                method: req.method,
                pathname,
                origin: req.headers.get("origin"),
                referer: req.headers.get("referer"),
                expectedOrigin,
                ip: getClientIp(req) ?? "unknown",
            });
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
    }

    const session = await getProxySession(req);

    const isLoggedIn = !!session?.user;
    const userType = session?.user?.userType;

    const isAuthLandingRoute = pathname === "/" || pathname === "/login" || pathname === "/register";
    const isPublicRoute = isAuthLandingRoute;

    const isAdminRoute = pathname.startsWith("/admin");

    if (!isLoggedIn && isApiRoute && !isAuthApiRoute) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isLoggedIn && !isPublicRoute && !isApiRoute) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    if (isLoggedIn && isAuthLandingRoute) {
        return NextResponse.redirect(new URL("/app/dashboard", req.url));
    }

    if (isAdminRoute && userType !== "admin") {
        return NextResponse.redirect(new URL("/app/dashboard", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|imgs/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff|woff2|ttf|eot)).*)",
    ],
};
