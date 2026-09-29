import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.hoisted(() => vi.fn());

vi.mock("@/auth", () => ({
    assertAuthRuntimeEnv: vi.fn(),
    betterAuthInstance: {
        api: { getSession: mockGetSession },
    },
}));

import { getProxySession } from "@/lib/auth/proxy";

function makeRequest(cookieHeader?: string): Request {
    const init: Record<string, string> = {};
    if (cookieHeader) {
        init["cookie"] = cookieHeader;
    }
    return new Request("http://localhost/dashboard", { headers: init });
}

describe("getProxySession", () => {
    beforeEach(() => {
        mockGetSession.mockReset();
    });

    describe("error handling", () => {
        it("returns null when getSession throws an error", async () => {
            mockGetSession.mockRejectedValueOnce(new Error("session fetch failed"));

            const result = await getProxySession(makeRequest("better-auth.session_data=tok"));

            expect(result).toBeNull();
            expect(mockGetSession).toHaveBeenCalledTimes(1);
        });
    });

    describe("session cookie presence", () => {
        it("returns null when no cookie header is present", async () => {
            mockGetSession.mockResolvedValueOnce(null);

            const result = await getProxySession(makeRequest());

            expect(result).toBeNull();
            expect(mockGetSession).toHaveBeenCalledWith({
                headers: makeRequest().headers,
            });
        });

        it("returns null when the request has no cookie header at all", async () => {
            mockGetSession.mockResolvedValueOnce(null);

            const req = new Request("http://localhost/dashboard");
            expect(req.headers.get("cookie")).toBeNull();

            const result = await getProxySession(req);

            expect(result).toBeNull();
            expect(mockGetSession).toHaveBeenCalledWith({ headers: req.headers });
        });
    });

    describe("no session", () => {
        it("returns null when getSession returns null", async () => {
            mockGetSession.mockResolvedValueOnce(null);

            const result = await getProxySession(makeRequest("better-auth.session_data=tok"));

            expect(result).toBeNull();
        });
    });

    describe("session with no user", () => {
        it("returns null when session.user is missing", async () => {
            mockGetSession.mockResolvedValueOnce({ user: null });

            const result = await getProxySession(makeRequest("better-auth.session_data=tok"));

            expect(result).toBeNull();
        });

        it("returns null when session is an empty object", async () => {
            mockGetSession.mockResolvedValueOnce({});

            const result = await getProxySession(makeRequest("better-auth.session_data=tok"));

            expect(result).toBeNull();
        });
    });

    describe("field normalization", () => {
        it("returns user with undefined organizationId when field is missing", async () => {
            mockGetSession.mockResolvedValueOnce({
                user: { id: "u1", userType: "admin" },
            });

            const result = await getProxySession(makeRequest("better-auth.session_data=tok"));

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
            mockGetSession.mockResolvedValueOnce({
                user: { id: "u1", organizationId: 1 },
            });

            const result = await getProxySession(makeRequest("better-auth.session_data=tok"));

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
    });

    describe("Google OAuth user with missing fields", () => {
        it("returns user with undefined org/userType fields", async () => {
            mockGetSession.mockResolvedValueOnce({
                user: { id: "gcal-123", email: "user@gmail.com", name: "Google User" },
            });

            const result = await getProxySession(makeRequest("better-auth.session_data=tok"));

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

        it("returns undefined org/userType when both are null", async () => {
            mockGetSession.mockResolvedValueOnce({
                user: {
                    id: "gcal-456",
                    email: "another@gmail.com",
                    organizationId: null,
                    userType: null,
                },
            });

            const result = await getProxySession(makeRequest("better-auth.session_data=tok"));

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
    });

    describe("coercion", () => {
        it("coerces numeric string organizationId to number", async () => {
            mockGetSession.mockResolvedValueOnce({
                user: { id: "u1", organizationId: "15", userType: "standard" },
            });

            const result = await getProxySession(makeRequest("better-auth.session_data=tok"));

            expect(result?.user.organizationId).toBe(15);
            expect(result?.user.organizationId).toBeTypeOf("number");
        });

        it("coerces numeric string organizationId to number even when other fields present", async () => {
            mockGetSession.mockResolvedValueOnce({
                user: {
                    id: "u2",
                    email: "user@example.com",
                    name: "Test User",
                    username: "testuser",
                    organizationId: "42",
                    userType: "standard",
                },
            });

            const result = await getProxySession(makeRequest("better-auth.session_data=tok"));

            expect(result).toEqual({
                user: {
                    id: "u2",
                    email: "user@example.com",
                    name: "Test User",
                    username: "testuser",
                    organizationId: 42,
                    userType: "standard",
                },
            });
            expect(result?.user.organizationId).toBeTypeOf("number");
        });

        it("returns undefined organizationId when string is non-numeric", async () => {
            mockGetSession.mockResolvedValueOnce({
                user: { id: "u3", organizationId: "not-a-number", userType: "admin" },
            });

            const result = await getProxySession(makeRequest("better-auth.session_data=tok"));

            expect(result?.user.organizationId).toBeUndefined();
        });
    });

    describe("full user object and valid session", () => {
        it("returns the full user object with all fields present", async () => {
            mockGetSession.mockResolvedValueOnce({
                user: {
                    id: "user-42",
                    organizationId: 7,
                    userType: "admin",
                    email: "admin@example.com",
                    name: "Admin User",
                    username: "admin_user",
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

        it("returns properly typed session data for a valid session", async () => {
            mockGetSession.mockResolvedValueOnce({
                user: {
                    id: "valid-1",
                    organizationId: 99,
                    userType: "manager",
                    email: "valid@example.com",
                    name: "Valid User",
                    username: "valid_user",
                },
            });

            const result = await getProxySession(makeRequest("better-auth.session_data=tok"));

            expect(result).not.toBeNull();
            expect(result).toHaveProperty("user.id");
            expect(typeof result?.user.id).toBe("string");
            expect(typeof result?.user.organizationId).toBe("number");
            expect(typeof result?.user.userType).toBe("string");
        });
    });
});
