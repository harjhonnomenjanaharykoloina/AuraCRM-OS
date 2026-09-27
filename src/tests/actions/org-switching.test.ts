import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb, resetMockDb } = vi.hoisted(() => {
    const mockDb: any = {
        organizationMember: { findFirst: vi.fn(), findMany: vi.fn() },
    };
    const resetMockDb = () => {
        mockDb.organizationMember.findFirst.mockReset();
        mockDb.organizationMember.findMany.mockReset();
    };
    return { mockDb, resetMockDb };
});

const { mockGetUserContext, mockUpdateSession } = vi.hoisted(() => ({
    mockGetUserContext: vi.fn().mockResolvedValue({
        userId: 1,
        organizationId: 1,
        userType: "admin",
    }),
    mockUpdateSession: vi.fn().mockResolvedValue({ status: true }),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/auth", () => ({
    auth: vi.fn().mockResolvedValue({
        user: { id: "1", organizationId: 1, userType: "admin" },
    }),
    betterAuthInstance: { api: { updateSession: mockUpdateSession } },
}));
vi.mock("@/lib/auth/context", () => ({ getUserContext: mockGetUserContext }));
vi.mock("next/headers", () => ({ headers: () => new Headers({}) }));

import { getUserOrganizations, switchOrganization } from "@/actions/auth/org-actions";

const mockedGetUserContext = mockGetUserContext as unknown as Mock;
const mockedUpdateSession = mockUpdateSession as unknown as Mock;

describe("switchOrganization", () => {
    beforeEach(() => {
        resetMockDb();
        mockedGetUserContext.mockReset();
        mockedGetUserContext.mockResolvedValue({
            userId: 1,
            organizationId: 1,
            userType: "admin",
        });
        mockedUpdateSession.mockReset();
        mockedUpdateSession.mockResolvedValue({ status: true });
    });

    it("returns an error and does not call updateSession when the user is not a member", async () => {
        mockDb.organizationMember.findFirst.mockResolvedValueOnce(null);

        const result = await switchOrganization(999);

        expect(result).toEqual({
            success: false,
            error: "Not a member of the requested organization",
        });
        expect(mockedUpdateSession).not.toHaveBeenCalled();
    });

    it("switches organization for a member: calls updateSession with headers + body and returns success", async () => {
        mockDb.organizationMember.findFirst.mockResolvedValueOnce({
            id: 1,
            userId: 1,
            organizationId: 42,
        });

        const result = await switchOrganization(42);

        expect(result).toEqual({ success: true, organizationId: 42 });
        expect(mockedUpdateSession).toHaveBeenCalledTimes(1);
        expect(mockedUpdateSession).toHaveBeenCalledWith({
            headers: expect.any(Headers),
            body: { organizationId: 42 },
        });
    });
});

describe("getUserOrganizations", () => {
    beforeEach(() => {
        resetMockDb();
        mockedGetUserContext.mockReset();
        mockedGetUserContext.mockResolvedValue({
            userId: 1,
            organizationId: 1,
            userType: "admin",
        });
    });

    it("maps membership rows to { id, name, slug } organizations", async () => {
        mockDb.organizationMember.findMany.mockResolvedValueOnce([
            { organization: { id: 1, name: "Acme", slug: "acme" } },
            { organization: { id: 2, name: "Globex", slug: "globex" } },
        ]);

        const result = await getUserOrganizations();

        expect(result.organizations).toEqual([
            { id: 1, name: "Acme", slug: "acme" },
            { id: 2, name: "Globex", slug: "globex" },
        ]);
        expect(result.currentOrganizationId).toBe(1);
        expect(mockDb.organizationMember.findMany).toHaveBeenCalledWith({
            where: { userId: 1 },
            select: { organization: { select: { id: true, name: true, slug: true } } },
        });
    });
});
