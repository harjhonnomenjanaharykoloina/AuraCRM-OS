import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockJwtVerify = vi.hoisted(() => vi.fn());

vi.mock("jose", () => ({
    jwtVerify: mockJwtVerify,
}));

import { getProxySession } from "@/lib/auth/proxy";

const SECRET = "better-auth-secret-32-chars-a";
const OTHER_SECRET = "jwt-secret-32-chars-bbbbbb";

function makeRequest(cookieHeader?: string): Request {
    const init: Record<string, string> = {};
    if (cookieHeader) {
        init["cookie"] = cookieHeader;
    }
    return new Request("http://localhost/dashboard", { headers: init });
}

describe("getProxySession", () => {
    beforeEach(() => {
        vi.stubEnv("BETTER_AUTH_SECRET", SECRET);
        vi.stubEnv("JWT_SECRET", OTHER_SECRET);
        mockJwtVerify.mockReset();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe("secret resolution", () => {
        it("returns null when neither BETTER_AUTH_SECRET nor JWT_SECRET is set", async () => {
            vi.stubEnv("BETTER_AUTH_SECRET", undefined as any);
            vi.stubEnv("JWT_SECRET", undefined as any);

            const result = await getProxySession(makeRequest("better-auth.session_data=tok"));

            expect(result).toBeNull();
            expect(mockJwtVerify).not.toHaveBeenCalled();
        });

        it("uses BETTER_AUTH_SECRET when both are present", async () => {
            mockJwtVerify.mockResolvedValueOnce({
                payload: { user: { id: "u1", organizationId: 1, userType: "admin" } },
            });

            await getProxySession(makeRequest("better-auth.session_data=tok"));

            const usedSecret = new TextDecoder().decode(mockJwtVerify.mock.calls[0][1]);
            expect(usedSecret).toBe(SECRET);
            expect(usedSecret).not.toBe(OTHER_SECRET);
        });

        it("falls back to JWT_SECRET when BETTER_AUTH_SECRET is absent", async () => {
            vi.stubEnv("BETTER_AUTH_SECRET", undefined as any);
            mockJwtVerify.mockResolvedValueOnce({
                payload: { user: { id: "u1", organizationId: 1, userType: "admin" } },
            });

            await getProxySession(makeRequest("better-auth.session_data=tok"));

            const usedSecret = new TextDecoder().decode(mockJwtVerify.mock.calls[0][1]);
            expect(usedSecret).toBe(OTHER_SECRET);
        });
    });

    describe("session cookie extraction", () => {
        it("returns null when no session cookie is present", async () => {
            const result = await getProxySession(makeRequest());
            expect(result).toBeNull();
            expect(mockJwtVerify).not.toHaveBeenCalled();
        });

        it("returns null when the request has no cookie header at all", async () => {
            const req = new Request("http://localhost/dashboard");
            expect(req.headers.get("cookie")).toBeNull();
            const result = await getProxySession(req);
            expect(result).toBeNull();
        });

        it("reconstructs a chunked session cookie by index order", async () => {
            mockJwtVerify.mockResolvedValueOnce({
                payload: { user: { id: "u1", organizationId: 1, userType: "admin" } },
            });

            // Chunks intentionally supplied out of order to verify sorting.
            const cookie =
                "better-auth.session_data-1=payload2; better-auth.session_data-0=payload1";
            await getProxySession(makeRequest(cookie));

            expect(mockJwtVerify).toHaveBeenCalledTimes(1);
            expect(mockJwtVerify.mock.calls[0][0]).toBe("payload1payload2");
        });

        it("reconstructs chunked cookies carrying a __Host- prefix", async () => {
            mockJwtVerify.mockResolvedValueOnce({
                payload: { user: { id: "u2", organizationId: 3, userType: "standard" } },
            });

            const cookie =
                "__Host-better-auth.session_data-0=partA; __Host-better-auth.session_data-1=partB";
            await getProxySession(makeRequest(cookie));

            expect(mockJwtVerify.mock.calls[0][0]).toBe("partApartB");
        });
    });

    describe("JWT verification & payload mapping", () => {
        it("returns null when the JWT verification fails", async () => {
            mockJwtVerify.mockRejectedValueOnce(new Error("JWT expired"));

            const result = await getProxySession(makeRequest("better-auth.session_data=bad"));
            expect(result).toBeNull();
            expect(mockJwtVerify).toHaveBeenCalledTimes(1);
        });

        it("returns null when the payload has no recognizable user id", async () => {
            mockJwtVerify.mockResolvedValueOnce({
                payload: { user: { organizationId: 1, userType: "admin" } },
            });

            const result = await getProxySession(makeRequest("better-auth.session_data=tok"));
            expect(result).toBeNull();
        });

        it("returns user with undefined organizationId when field is missing", async () => {
            mockJwtVerify.mockResolvedValueOnce({
                payload: { user: { id: "u1", userType: "admin" } },
            });

            const result = await getProxySession(makeRequest("better-auth.session_data=tok"));
            expect(result).not.toBeNull();
            expect(result?.user.organizationId).toBeUndefined();
            expect(result).toEqual({
                user: {
                    id: "u1",
                    email: undefined,
                    name: undefined,
                    username: undefined,
                    organizationId: undefined,
                    userType: "admin",
                },
            });
        });

        it("returns user with undefined userType when field is missing", async () => {
            mockJwtVerify.mockResolvedValueOnce({
                payload: { user: { id: "u1", organizationId: 1 } },
            });

            const result = await getProxySession(makeRequest("better-auth.session_data=tok"));
            expect(result).not.toBeNull();
            expect(result?.user.userType).toBeUndefined();
            expect(result).toEqual({
                user: {
                    id: "u1",
                    email: undefined,
                    name: undefined,
                    username: undefined,
                    organizationId: 1,
                    userType: undefined,
                },
            });
        });

        it("returns user with undefined fields for Google OAuth users", async () => {
            mockJwtVerify.mockResolvedValueOnce({
                payload: { user: { id: "gcal-123", email: "user@gmail.com", name: "Google User" } },
            });

            const result = await getProxySession(makeRequest("better-auth.session_data=tok"));
            expect(result).not.toBeNull();
            expect(result?.user.organizationId).toBeUndefined();
            expect(result?.user.userType).toBeUndefined();
            expect(result).toEqual({
                user: {
                    id: "gcal-123",
                    email: "user@gmail.com",
                    name: "Google User",
                    username: undefined,
                    organizationId: undefined,
                    userType: undefined,
                },
            });
        });

        it("handles Google OAuth user with null organizationId", async () => {
            mockJwtVerify.mockResolvedValueOnce({
                payload: {
                    user: {
                        id: "gcal-456",
                        organizationId: null,
                        userType: null,
                        email: "another@gmail.com",
                    },
                },
            });

            const result = await getProxySession(makeRequest("better-auth.session_data=tok"));
            expect(result).not.toBeNull();
            expect(result?.user.organizationId).toBeUndefined();
            expect(result?.user.userType).toBeUndefined();
            expect(result).toEqual({
                user: {
                    id: "gcal-456",
                    email: "another@gmail.com",
                    name: undefined,
                    username: undefined,
                    organizationId: undefined,
                    userType: undefined,
                },
            });
        });

        it("maps sub claim to user.id when user.id is absent", async () => {
            mockJwtVerify.mockResolvedValueOnce({
                payload: { sub: "sub-user", user: { organizationId: 9, userType: "manager" } },
            });

            const result = await getProxySession(makeRequest("better-auth.session_data=tok"));
            expect(result).toEqual({
                user: {
                    id: "sub-user",
                    email: undefined,
                    name: undefined,
                    username: undefined,
                    organizationId: 9,
                    userType: "manager",
                },
            });
        });

        it("returns the full user object with a valid JWT", async () => {
            mockJwtVerify.mockResolvedValueOnce({
                payload: {
                    user: {
                        id: "user-42",
                        organizationId: 7,
                        userType: "admin",
                        email: "admin@example.com",
                        name: "Admin User",
                        username: "admin_user",
                    },
                },
            });

            const result = await getProxySession(makeRequest("better-auth.session_data=tok"));

            expect(result).toEqual({
                user: {
                    id: "user-42",
                    email: "admin@example.com",
                    name: "Admin User",
                    username: "admin_user",
                    organizationId: 7,
                    userType: "admin",
                },
            });
        });

        it("coerces a numeric string organizationId to a number", async () => {
            mockJwtVerify.mockResolvedValueOnce({
                payload: { user: { id: "u1", organizationId: "15", userType: "standard" } },
            });

            const result = await getProxySession(makeRequest("better-auth.session_data=tok"));
            expect(result).toEqual({
                user: {
                    id: "u1",
                    email: undefined,
                    name: undefined,
                    username: undefined,
                    organizationId: 15,
                    userType: "standard",
                },
            });
            expect(result?.user.organizationId).toBeTypeOf("number");
        });

        it("supports legacy flat claims placed at the JWT root", async () => {
            mockJwtVerify.mockResolvedValueOnce({
                payload: {
                    id: "legacy-1",
                    organizationId: 4,
                    userType: "admin",
                    email: "legacy@example.com",
                    name: "Legacy User",
                    username: "legacy_user",
                },
            });

            const result = await getProxySession(makeRequest("better-auth.session_data=tok"));

            expect(result).toEqual({
                user: {
                    id: "legacy-1",
                    email: "legacy@example.com",
                    name: "Legacy User",
                    username: "legacy_user",
                    organizationId: 4,
                    userType: "admin",
                },
            });
        });

        it("falls back to sub for legacy payloads missing a user id", async () => {
            mockJwtVerify.mockResolvedValueOnce({
                payload: { sub: "legacy-sub", organizationId: 4, userType: "admin" },
            });

            const result = await getProxySession(makeRequest("better-auth.session_data=tok"));

            expect(result).toEqual({
                user: {
                    id: "legacy-sub",
                    email: undefined,
                    name: undefined,
                    username: undefined,
                    organizationId: 4,
                    userType: "admin",
                },
            });
        });
    });
});
