import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb, resetMockDb } = vi.hoisted(() => {
    const mockDb: any = {
        organizationMember: { findFirst: vi.fn(), findMany: vi.fn() },
        queueMember: { findMany: vi.fn() },
    };
    const resetMockDb = () => {
        mockDb.organizationMember.findFirst.mockReset();
        mockDb.organizationMember.findMany.mockReset();
        mockDb.queueMember.findMany.mockReset();
    };
    return { mockDb, resetMockDb };
});

const { mockGetUserContext, mockUpdateSession, mockUpdateUser } = vi.hoisted(() => ({
    mockGetUserContext: vi.fn(),
    mockUpdateSession: vi.fn().mockResolvedValue({ status: true }),
    mockUpdateUser: vi.fn().mockResolvedValue({ status: true }),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/auth", () => ({
    auth: vi.fn().mockResolvedValue({
        user: { id: "1", organizationId: 1, userType: "admin" },
    }),
    betterAuthInstance: {
        api: { updateSession: mockUpdateSession, updateUser: mockUpdateUser },
    },
}));
vi.mock("@/lib/auth/context", () => ({ getUserContext: mockGetUserContext }));
vi.mock("next/headers", () => ({ headers: () => new Headers({}) }));

import { getUserQueueIds } from "@/lib/record-access";
import { getUserOrganizations, switchOrganization } from "@/actions/auth/org-actions";

const mockedGetUserContext = mockGetUserContext as unknown as Mock;
const mockedUpdateSession = mockUpdateSession as unknown as Mock;
const mockedUpdateUser = mockUpdateUser as unknown as Mock;

const ORG_A = 1;
const ORG_B = 2;
const USER_A = 1;

describe("multi-organization isolation", () => {
    beforeEach(() => {
        resetMockDb();
        mockedGetUserContext.mockReset();
        mockedGetUserContext.mockResolvedValue({
            userId: USER_A,
            organizationId: ORG_A,
            userType: "standard",
        });
        mockedUpdateSession.mockReset();
        mockedUpdateSession.mockResolvedValue({ status: true });
        mockedUpdateUser.mockReset();
        mockedUpdateUser.mockResolvedValue({ status: true });
    });

    describe("OrganizationMember visibility is bound to the session user", () => {
        it("getUsersOrganizations scopes its membership query to the session userId only", async () => {
            mockDb.organizationMember.findMany.mockResolvedValueOnce([
                { organization: { id: ORG_A, name: "Acme", slug: "acme" } },
            ]);

            const result = await getUserOrganizations();

            // The membership lookup must be keyed on the session userId...
            expect(mockDb.organizationMember.findMany).toHaveBeenCalledTimes(1);
            expect(mockDb.organizationMember.findMany).toHaveBeenCalledWith({
                where: { userId: USER_A },
                select: {
                    organization: { select: { id: true, name: true, slug: true } },
                },
            });
            // ...and the function exposes no parameter through which a client
            // could inject a different userId or organizationId.
            expect(getUserOrganizations.length).toBe(0);

            expect(result.organizations).toEqual([
                { id: ORG_A, name: "Acme", slug: "acme" },
            ]);
            expect(result.currentOrganizationId).toBe(ORG_A);
        });

        it("does not allow an Org A user to enumerate OrganizationMember rows for another user or org", async () => {
            // Even when the DB would return membership rows, the query only ever
            // carries the session userId — there is no path for an Org A caller
            // to pull OrganizationMember rows belonging to Org B / a different user.
            mockDb.organizationMember.findMany.mockResolvedValueOnce([]);

            const result = await getUserOrganizations();

            const where = mockDb.organizationMember.findMany.mock.calls[0][0].where;
            expect(where).not.toHaveProperty("organizationId");
            expect(where).toEqual({ userId: USER_A });
            expect(result.organizations).toEqual([]);
        });
    });

    describe("a user in Org A cannot switch to an org they are not a member of", () => {
        it("blocks the switch and never calls updateSession when no membership exists", async () => {
            mockDb.organizationMember.findFirst.mockResolvedValueOnce(null);

            const result = await switchOrganization(ORG_B);

            expect(result).toEqual({
                success: false,
                error: "Not a member of the requested organization",
            });

            // The membership check is bound to the session user AND the target org,
            // so a user cannot switch into an organization using someone else's membership.
            expect(mockDb.organizationMember.findFirst).toHaveBeenCalledWith({
                where: { userId: USER_A, organizationId: ORG_B },
            });
            expect(mockedUpdateSession).not.toHaveBeenCalled();
            expect(mockedUpdateUser).not.toHaveBeenCalled();
        });

        it("uses the session userId (not the target org) in the membership lookup", async () => {
            mockDb.organizationMember.findFirst.mockResolvedValueOnce(null);

            await switchOrganization(ORG_B);

            const where = mockDb.organizationMember.findFirst.mock.calls[0][0].where;
            // userId must be the authenticated session user, organizationId the target.
            expect(where.userId).toBe(USER_A);
            expect(where.organizationId).toBe(ORG_B);
        });
    });

    describe("a member switch is routed through updateSession only", () => {
        it("calls updateSession (never updateUser) and reports the target org", async () => {
            mockDb.organizationMember.findFirst.mockResolvedValueOnce({
                id: 10,
                userId: USER_A,
                organizationId: ORG_B,
            });

            const result = await switchOrganization(ORG_B);

            expect(result).toEqual({ success: true, organizationId: ORG_B });
            expect(mockedUpdateSession).toHaveBeenCalledTimes(1);
            expect(mockedUpdateSession).toHaveBeenCalledWith({
                headers: expect.any(Headers),
                body: { organizationId: ORG_B },
            });
            expect(mockedUpdateUser).not.toHaveBeenCalled();
        });
    });

    describe("getUserQueueIds is scoped per organizationId", () => {
        it("passes the caller-provided organizationId to the queue membership query", async () => {
            mockDb.queueMember.findMany.mockResolvedValueOnce([
                { queueId: 10 },
                { queueId: 20 },
            ]);

            const result = await getUserQueueIds(USER_A, ORG_A);

            expect(mockDb.queueMember.findMany).toHaveBeenCalledWith({
                where: { userId: USER_A, organizationId: ORG_A },
                select: { queueId: true },
            });
            expect(result).toEqual([10, 20]);
        });

        it("does not leak Org A queues into the Org B query scope", async () => {
            // Org A user belongs to queues 10 & 20 in Org A.
            mockDb.queueMember.findMany.mockResolvedValueOnce([
                { queueId: 10 },
                { queueId: 20 },
            ]);

            const orgAIds = await getUserQueueIds(USER_A, ORG_A);
            const orgAQuery = mockDb.queueMember.findMany.mock.calls[0][0];
            expect(orgAQuery.where.organizationId).toBe(ORG_A);
            expect(orgAIds).toEqual([10, 20]);

            // The same user queried against Org B must be scoped to Org B; the DB
            // returns no memberships there, so no Org A queue ids leak across.
            mockDb.queueMember.findMany.mockClear();
            mockDb.queueMember.findMany.mockResolvedValueOnce([]);

            const orgBIds = await getUserQueueIds(USER_A, ORG_B);
            const orgBQuery = mockDb.queueMember.findMany.mock.calls[0][0];
            expect(orgBQuery.where.organizationId).toBe(ORG_B);
            expect(orgBQuery.where.userId).toBe(USER_A);
            expect(orgBIds).toEqual([]);
        });
    });
});
