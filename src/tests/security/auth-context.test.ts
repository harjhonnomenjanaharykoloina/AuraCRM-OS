import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.hoisted(() => vi.fn());

vi.mock("@/auth", () => ({
    auth: mockAuth,
    assertAuthRuntimeEnv: vi.fn(),
}));

import { getUserContext, requireAdmin } from "@/lib/auth/context";

describe("auth context - tenant isolation", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        mockAuth.mockReset();
        consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    describe("getUserContext", () => {
        it("throws when session is null (unauthenticated)", async () => {
            mockAuth.mockResolvedValue(null);
            await expect(getUserContext()).rejects.toThrow("Unauthorized");
        });

        it("throws when session user is missing", async () => {
            mockAuth.mockResolvedValue({ user: null });
            await expect(getUserContext()).rejects.toThrow("Unauthorized");
        });

        it("throws when organizationId is missing from the session", async () => {
            mockAuth.mockResolvedValue({
                user: { id: "1", userType: "admin" },
            });
            await expect(getUserContext()).rejects.toThrow(
                /Missing user ID or Organization ID/
            );
        });

        it("throws when userId is missing from the session", async () => {
            mockAuth.mockResolvedValue({
                user: { organizationId: 1, userType: "admin" },
            });
            await expect(getUserContext()).rejects.toThrow(
                /Missing user ID or Organization ID/
            );
        });

        it("throws when session ids are not numeric", async () => {
            mockAuth.mockResolvedValue({
                user: { id: "abc", organizationId: "xyz", userType: "admin" },
            });
            await expect(getUserContext()).rejects.toThrow(/IDs are not numbers/);
        });

        it("does not accept any client-supplied arguments (orgId from session only)", async () => {
            mockAuth.mockResolvedValue({
                user: { id: "42", organizationId: 1, userType: "admin" },
            });
            // The function signature has no parameters: organizationId cannot be
            // influenced by the caller.
            expect(getUserContext.length).toBe(0);

            const ctx = await getUserContext();
            expect(ctx).toEqual({ userId: 42, organizationId: 1, userType: "admin" });
            expect(mockAuth).toHaveBeenCalledTimes(1);
        });

        it("always derives organizationId from the session JWT, reflecting the session org", async () => {
            mockAuth.mockResolvedValue({
                user: { id: "7", organizationId: 99, userType: "standard" },
            });
            const ctx = await getUserContext();
            expect(ctx.userId).toBe(7);
            expect(ctx.organizationId).toBe(99);

            // A second session that switches orgs must be honoured.
            mockAuth.mockResolvedValue({
                user: { id: "7", organizationId: 201, userType: "standard" },
            });
            const ctx2 = await getUserContext();
            expect(ctx2.organizationId).toBe(201);
            expect(ctx2.organizationId).not.toBe(99);
        });
    });

    describe("requireAdmin", () => {
        it("throws when session is null (unauthenticated)", async () => {
            mockAuth.mockResolvedValue(null);
            await expect(requireAdmin()).rejects.toThrow("Unauthorized");
        });

        it("throws when user is not an admin", async () => {
            mockAuth.mockResolvedValue({
                user: { id: "1", organizationId: 1, userType: "standard" },
            });
            await expect(requireAdmin()).rejects.toThrow(
                "Forbidden: Admin access required"
            );
        });

        it("returns admin-only context scoped to the session org", async () => {
            mockAuth.mockResolvedValue({
                user: { id: "1", organizationId: 5, userType: "admin" },
            });
            const result = await requireAdmin();
            expect(result).toEqual({ userId: 1, organizationId: 5 });
        });

        it("never trusts a client-supplied organizationId", async () => {
            mockAuth.mockResolvedValue({
                user: { id: "1", organizationId: 7, userType: "admin" },
            });
            // @ts-expect-error - argument is intentionally ignored by the implementation
            const result = await requireAdmin("client-org-id");
            expect(result.organizationId).toBe(7);
            expect(mockAuth).toHaveBeenCalled();
        });
    });
});
