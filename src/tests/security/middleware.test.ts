import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetProxySession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/proxy", () => ({
    getProxySession: mockGetProxySession,
}));

import proxy, { config } from "@/middleware";

function makeRequest(url: string): Request {
    return new Request(url);
}

const matchers = config.matcher as readonly string[];

describe("middleware - security", () => {
    beforeEach(() => {
        mockGetProxySession.mockReset();
    });

    describe("unauthenticated access control", () => {
        beforeEach(() => {
            mockGetProxySession.mockResolvedValue(null);
        });

        it("redirects unauthenticated requests to non-public routes to /login", async () => {
            const res = await proxy(makeRequest("http://localhost/no-apps"));
            expect(res.status).toBe(307);
            expect(res.headers.get("location")).toMatch(/\/login$/);
        });

        it("redirects unauthenticated requests to /admin to /login", async () => {
            const res = await proxy(makeRequest("http://localhost/admin/users"));
            expect(res.status).toBe(307);
            expect(res.headers.get("location")).toMatch(/\/login$/);
        });
    });

    describe("authenticated auth-landing routes", () => {
        beforeEach(() => {
            mockGetProxySession.mockResolvedValue({
                user: { id: "1", organizationId: 1, userType: "standard" },
            });
        });

        it("redirects authenticated users visiting /login to /no-apps", async () => {
            const res = await proxy(makeRequest("http://localhost/login"));
            expect(res.status).toBe(307);
            expect(res.headers.get("location")).toMatch(/\/no-apps$/);
        });

        it("redirects authenticated users visiting /register to /no-apps", async () => {
            const res = await proxy(makeRequest("http://localhost/register"));
            expect(res.status).toBe(307);
            expect(res.headers.get("location")).toMatch(/\/no-apps$/);
        });

        it("redirects authenticated users visiting / to /no-apps", async () => {
            const res = await proxy(makeRequest("http://localhost/"));
            expect(res.status).toBe(307);
            expect(res.headers.get("location")).toMatch(/\/no-apps$/);
        });
    });

    describe("admin route access control", () => {
        it("redirects non-admin users visiting /admin to /no-apps", async () => {
            mockGetProxySession.mockResolvedValue({
                user: { id: "1", organizationId: 1, userType: "standard" },
            });
            const res = await proxy(makeRequest("http://localhost/admin/users"));
            expect(res.status).toBe(307);
            expect(res.headers.get("location")).toMatch(/\/no-apps$/);
        });

        it("allows admin users to access /admin routes", async () => {
            mockGetProxySession.mockResolvedValue({
                user: { id: "1", organizationId: 1, userType: "admin" },
            });
            const res = await proxy(makeRequest("http://localhost/admin/users"));
            expect(res.status).toBe(200);
        });

        it("does not redirect non-admin users away from /app routes", async () => {
            mockGetProxySession.mockResolvedValue({
                user: { id: "1", organizationId: 1, userType: "standard" },
            });
            const res = await proxy(makeRequest("http://localhost/app/crm/dashboard"));
            expect(res.status).toBe(200);
        });
    });

    describe("static assets are not intercepted by the middleware", () => {
        const regex = new RegExp(matchers[0]);

        it.each([
            ["/favicon.ico"],
            ["/logo.png"],
            ["/foo.svg"],
            ["/imgs/bar.png"],
            ["/images/avatar.jpg"],
            ["/styles/main.css"],
        ])("excludes %s from the middleware matcher", (path) => {
            expect(regex.test(path)).toBe(false);
        });

        it("still runs the middleware for application routes", () => {
            expect(regex.test("/no-apps")).toBe(true);
            expect(regex.test("/admin/users")).toBe(true);
            expect(regex.test("/login")).toBe(true);
            expect(regex.test("/register")).toBe(true);
        });

        it("allows authenticated requests for static assets to pass through", async () => {
            mockGetProxySession.mockResolvedValue({
                user: { id: "1", organizationId: 1, userType: "admin" },
            });
            const res = await proxy(makeRequest("http://localhost/logo.png"));
            expect(res.status).toBe(200);
        });
    });

    describe("public routes allow anonymous access", () => {
        beforeEach(() => {
            mockGetProxySession.mockResolvedValue(null);
        });

        it.each(["/", "/login", "/register"])(
            "allows unauthenticated access to %s",
            async (path) => {
                const res = await proxy(makeRequest(`http://localhost${path}`));
                expect(res.status).toBe(200);
            }
        );

        it("returns 401 for unauthenticated non-auth API routes", async () => {
            const res = await proxy(makeRequest("http://localhost/api/contacts"));
            expect(res.status).toBe(401);
        });

        it("does not challenge auth API routes", async () => {
            const res = await proxy(
                makeRequest("http://localhost/api/auth/session")
            );
            expect(res.status).toBe(200);
        });
    });
});
