import { NextResponse } from "next/server";
import { getProxySession } from "@/lib/auth/proxy";

export default async function middleware(req: Request) {
    const { pathname } = new URL(req.url);
    const session = await getProxySession(req);

    const isLoggedIn = !!session?.user;
    const userType = session?.user?.userType;

    const isAuthLandingRoute = pathname === "/" || pathname === "/login" || pathname === "/register";
    const isPublicRoute = isAuthLandingRoute;

    const isAdminRoute = pathname.startsWith("/admin");

    const isApiRoute = pathname.startsWith("/api");
    const isAuthApiRoute = pathname.startsWith("/api/auth");

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
    matcher: ["/((?!_next/static|_next/image|favicon.ico|imgs/).*)"],
};
