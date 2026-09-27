import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";
import { OwnerType } from "@prisma/client";

const { mockDb, resetMockDb, mockAuth } = vi.hoisted(() => {
    const mockDb: any = {
        record: {
            findFirst: vi.fn(),
            findMany: vi.fn(),
            count: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            findUnique: vi.fn(),
        },
        user: { findUnique: vi.fn(), findFirst: vi.fn() },
        objectDefinition: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
        fieldDefinition: { findMany: vi.fn() },
        fieldData: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            createMany: vi.fn(),
            upsert: vi.fn(),
            deleteMany: vi.fn(),
            updateMany: vi.fn(),
        },
        assignmentRule: { findMany: vi.fn() },
        sharingRule: { findMany: vi.fn() },
        recordShare: { deleteMany: vi.fn(), upsert: vi.fn() },
        notification: { createMany: vi.fn(), create: vi.fn() },
        queue: { findFirst: vi.fn() },
        queueMember: { findMany: vi.fn() },
        $transaction: vi.fn(async (cb: any) => cb(mockDb)),
    };

    const resetMockDb = () => {
        mockDb.record.findFirst.mockReset();
        mockDb.record.findUnique.mockReset();
        mockDb.record.findMany.mockReset();
        mockDb.record.count.mockReset();
        mockDb.record.create.mockReset();
        mockDb.record.update.mockReset();
        mockDb.record.delete.mockReset();
        mockDb.user.findUnique.mockReset();
        mockDb.user.findFirst.mockReset();
        mockDb.objectDefinition.findUnique.mockReset();
        mockDb.objectDefinition.findFirst.mockReset();
        mockDb.objectDefinition.findMany.mockReset();
        mockDb.fieldDefinition.findMany.mockReset();
        mockDb.fieldData.findMany.mockReset();
        mockDb.fieldData.findUnique.mockReset();
        mockDb.fieldData.createMany.mockReset();
        mockDb.fieldData.upsert.mockReset();
        mockDb.fieldData.deleteMany.mockReset();
        mockDb.fieldData.updateMany.mockReset();
        mockDb.assignmentRule.findMany.mockReset();
        mockDb.sharingRule.findMany.mockReset();
        mockDb.recordShare.deleteMany.mockReset();
        mockDb.recordShare.upsert.mockReset();
        mockDb.notification.createMany.mockReset();
        mockDb.notification.create.mockReset();
        mockDb.queue.findFirst.mockReset();
        mockDb.queueMember.findMany.mockReset();
        mockDb.$transaction.mockReset();
        mockDb.$transaction.mockImplementation(async (cb: any) => cb(mockDb));
    };

    return { mockDb, resetMockDb, mockAuth: vi.fn() };
});

vi.mock("@/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/permissions", () => ({
    checkPermission: vi.fn(),
    getUserPermissionSetIds: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/record-access", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/record-access")>();
    return {
        ...actual,
        getUserQueueIds: vi.fn().mockResolvedValue([]),
        getUserAccessContext: vi.fn().mockResolvedValue({ userId: 1, organizationId: 1, queueIds: [], userGroupId: null, permissionSetIds: [] }),
    };
});
vi.mock("@/lib/duplicates/duplicate-rules", () => ({
    findDuplicateMatches: vi.fn().mockResolvedValue({
        blockingRuleIds: [],
        warningRuleIds: [],
    }),
}));

import {
    getRecord,
    getRecords,
    updateRecord,
    deleteRecord,
    restoreRecord,
    purgeRecord,
    createRecord,
} from "@/actions/standard/record-actions";
import { checkPermission } from "@/lib/permissions";
import { buildRecordAccessFilter, buildRecordAccessSql } from "@/lib/record-access";
import { getUserContext } from "@/lib/auth/context";

const mockedCheckPermission = checkPermission as unknown as Mock;

// Organization A is the authenticated tenant for these tests.
const ORG_A = 1;
const ORG_B = 2;
const ORG_B_RECORD_ID = 5000;

const contactObjectDef = {
    id: 1,
    apiName: "contact",
    label: "Contact",
    pluralLabel: "Contacts",
    fields: [
        {
            id: 10,
            apiName: "name",
            label: "Name",
            type: "Text",
            required: true,
            isUnique: false,
            isExternalId: false,
            options: {},
            lookupTargetId: null,
            picklistOptions: [],
        },
        {
            id: 11,
            apiName: "first_name",
            label: "First Name",
            type: "Text",
            required: false,
            isUnique: false,
            isExternalId: false,
            options: {},
            lookupTargetId: null,
            picklistOptions: [],
        },
    ],
    validationRules: [],
    notifyOnAssignment: false,
};

function loginOrgA() {
    mockAuth.mockResolvedValue({
        user: { id: "1", organizationId: ORG_A, userType: "standard" },
    });
}

function loginOrgB() {
    mockAuth.mockResolvedValue({
        user: { id: "2", organizationId: ORG_B, userType: "admin" },
    });
}

function allowRead() {
    mockedCheckPermission.mockImplementation(async (_uid, _org, _obj, perm) => {
        const blocked = ["viewAll", "modifyAll"];
        return !blocked.includes(perm);
    });
}

function allowAdmin() {
    mockedCheckPermission.mockResolvedValue(true);
}

describe("record tenant isolation", () => {
    beforeEach(() => {
        resetMockDb();
        mockedCheckPermission.mockReset();
        mockAuth.mockReset();
        mockDb.$transaction.mockImplementation(async (cb: any) => cb(mockDb));
    });

    describe("getUserContext derives organizationId from the session", () => {
        it("returns the session organizationId for an Org A user", async () => {
            mockAuth.mockResolvedValue({
                user: { id: "1", organizationId: ORG_A, userType: "standard" },
            });
            const ctx = await getUserContext();
            expect(ctx.organizationId).toBe(ORG_A);
            expect(ctx.userId).toBe(1);
        });

        it("reflects the session organization when the session switches to Org B", async () => {
            mockAuth.mockResolvedValue({
                user: { id: "2", organizationId: ORG_B, userType: "admin" },
            });
            const ctx = await getUserContext();
            expect(ctx.organizationId).toBe(ORG_B);
        });

        it("takes no client-supplied arguments (orgId cannot be injected)", async () => {
            mockAuth.mockResolvedValue({
                user: { id: "1", organizationId: ORG_A, userType: "admin" },
            });
            expect(getUserContext.length).toBe(0);
            const ctx = await getUserContext();
            expect(ctx.organizationId).toBe(ORG_A);
            expect(mockAuth).toHaveBeenCalled();
        });
    });

    describe("buildRecordAccessFilter / buildRecordAccessSql cross-org scoping", () => {
        it("buildRecordAccessFilter only matches records owned by the user, their queue, or shares", () => {
            const filter = buildRecordAccessFilter(1, [2], null, "read");

            // The first clause restricts to the user's own records only.
            expect(filter.OR).toContainEqual({ ownerId: 1, ownerType: OwnerType.USER });

            // Edit/delete must drop queue-owned records (which may live in another org).
            const editFilter = buildRecordAccessFilter(1, [2], null, "edit");
            expect(editFilter.OR).toContainEqual({ ownerId: 1, ownerType: OwnerType.USER });
            expect(editFilter.OR).not.toContainEqual(
                expect.objectContaining({ ownerQueueId: { in: [2] } })
            );
        });

        it("buildRecordAccessSql scopes record shares to a single organizationId", () => {
            const sql = buildRecordAccessSql(1, ORG_A, [2], null, "read");
            // The share subquery is constrained by organizationId so shares from
            // other organizations can never grant access.
            expect(sql.sql).toContain('"organizationId"');
        });

        it("buildRecordAccessSql does not reference another organization's shares", () => {
            const orgASql = buildRecordAccessSql(1, ORG_A, [], null, "read");
            const orgBSql = buildRecordAccessSql(1, ORG_B, [], null, "read");

            expect(orgASql.sql).not.toContain(`"organizationId" = ${ORG_B}`);
            expect(orgBSql.sql).not.toContain(`"organizationId" = ${ORG_A}`);
        });
    });

    describe("Organization A cannot READ Organization B's records", () => {
        it("getRecord scopes its query by the session organizationId", async () => {
            loginOrgA();
            allowRead();
            mockDb.user.findUnique.mockResolvedValue({ groupId: null });
            // Org B's record exists but is invisible to an Org A-scoped query.
            mockDb.record.findFirst.mockResolvedValue(null);
            mockDb.record.findUnique.mockResolvedValue(null);

            const result = await getRecord("contact", ORG_B_RECORD_ID);

            expect(result).toEqual({ success: false, error: "NOT_FOUND" });
            const findFirstWhere = mockDb.record.findFirst.mock.calls[0][0].where;
            expect(findFirstWhere.organizationId).toBe(ORG_A);
            expect(findFirstWhere.id).toBe(ORG_B_RECORD_ID);
            expect(findFirstWhere.isDeleted).toBe(false);
        });

        it("an admin in Org A still cannot read Organization B's records", async () => {
            loginOrgA();
            mockAuth.mockResolvedValue({
                user: { id: "1", organizationId: ORG_A, userType: "admin" },
            });
            allowAdmin();
            mockDb.user.findUnique.mockResolvedValue({ groupId: null });
            mockDb.record.findFirst.mockResolvedValue(null);

            const result = await getRecord("contact", ORG_B_RECORD_ID);

            expect(result).toEqual({ success: false, error: "NOT_FOUND" });
            const findFirstWhere = mockDb.record.findFirst.mock.calls[0][0].where;
            expect(findFirstWhere.organizationId).toBe(ORG_A);
        });

        it("getRecords only returns records for the session organization", async () => {
            loginOrgA();
            allowRead();
            mockDb.user.findUnique.mockResolvedValue({ groupId: null });
            mockDb.objectDefinition.findUnique.mockResolvedValue(contactObjectDef);
            mockDb.record.count.mockResolvedValue(0);
            mockDb.record.findMany.mockResolvedValue([]);

            const result = await getRecords("contact", 1, 25);

            expect(result.data).toEqual([]);
            expect(mockDb.record.count.mock.calls[0][0].where.organizationId).toBe(
                ORG_A
            );
            expect(mockDb.record.findMany.mock.calls[0][0].where.organizationId).toBe(
                ORG_A
            );
        });
    });

    describe("Organization A cannot UPDATE Organization B's records", () => {
        it("updateRecord scopes its query by the session organizationId", async () => {
            loginOrgA();
            mockedCheckPermission.mockImplementation(async (_u, _o, _obj, perm) => {
                return !["modifyAll", "viewAll"].includes(perm);
            });
            mockDb.user.findUnique.mockResolvedValue({ groupId: null });
            mockDb.record.findFirst.mockResolvedValue(null);

            const result = await updateRecord("contact", ORG_B_RECORD_ID, {
                first_name: "Attacker",
            });

            expect(result).toEqual({ success: false, error: "Record not found" });
            const where = mockDb.record.findFirst.mock.calls[0][0].where;
            expect(where.organizationId).toBe(ORG_A);
            expect(where.id).toBe(ORG_B_RECORD_ID);
            expect(where.isDeleted).toBe(false);
        });

        it("the organizationId used by actions follows the authenticated session org", async () => {
    });
    });

    describe("Organization A cannot DELETE Organization B's records", () => {
        it("deleteRecord scopes its query by the session organizationId", async () => {
            loginOrgA();
            mockedCheckPermission.mockImplementation(async (_u, _o, _obj, perm) => {
                return perm !== "modifyAll";
            });
            mockDb.user.findUnique.mockResolvedValue({ groupId: null });
            mockDb.record.findFirst.mockResolvedValue(null);

            const result = await deleteRecord("crm", "contact", ORG_B_RECORD_ID);

            expect(result).toEqual({ success: false, error: "Record not found" });
            const where = mockDb.record.findFirst.mock.calls[0][0].where;
            expect(where.organizationId).toBe(ORG_A);
            expect(where.id).toBe(ORG_B_RECORD_ID);
            expect(where.isDeleted).toBe(false);
            expect(mockDb.record.delete).not.toHaveBeenCalled();
        });
    });

    describe("Organization A cannot restore or purge Organization B's records", () => {
        it("restoreRecord scopes its query by the session organizationId", async () => {
            loginOrgA();
            mockedCheckPermission.mockImplementation(async (_u, _o, _obj, perm) => {
                return perm !== "modifyAll";
            });
            mockDb.user.findUnique.mockResolvedValue({ groupId: null });
            mockDb.record.findFirst.mockResolvedValue(null);

            const result = await restoreRecord("crm", "contact", ORG_B_RECORD_ID);

            expect(result).toEqual({ success: false, error: "Record not found" });
            const where = mockDb.record.findFirst.mock.calls[0][0].where;
            expect(where.organizationId).toBe(ORG_A);
            expect(where.id).toBe(ORG_B_RECORD_ID);
            expect(where.isDeleted).toBe(true);
        });

        it("purgeRecord scopes its query by the session organizationId", async () => {
            loginOrgA();
            mockedCheckPermission.mockImplementation(async (_u, _o, _obj, perm) => {
                return perm !== "modifyAll";
            });
            mockDb.user.findUnique.mockResolvedValue({ groupId: null });
            mockDb.record.findFirst.mockResolvedValue(null);

            const result = await purgeRecord("crm", "contact", ORG_B_RECORD_ID);

            expect(result).toEqual({ success: false, error: "Record not found" });
            const where = mockDb.record.findFirst.mock.calls[0][0].where;
            expect(where.organizationId).toBe(ORG_A);
            expect(where.id).toBe(ORG_B_RECORD_ID);
            expect(where.isDeleted).toBe(true);
        });
    });

    describe("Organization A cannot WRITE records into Organization B", () => {
        it("createRecord persists the record under the session organization, ignoring client-supplied orgId", async () => {
            loginOrgA();
            allowRead();
            mockDb.user.findUnique.mockResolvedValue({ groupId: null });
            mockDb.user.findFirst.mockResolvedValue({ id: 1 });
            mockDb.objectDefinition.findUnique.mockResolvedValue(contactObjectDef);
            mockDb.objectDefinition.findFirst.mockResolvedValue({
                apiName: "contact",
            });
            mockDb.assignmentRule.findMany.mockResolvedValue([]);
            mockDb.sharingRule.findMany.mockResolvedValue([]);
            mockDb.record.create.mockResolvedValue({ id: 999, name: "Test" });
            mockDb.fieldData.createMany.mockResolvedValue({ count: 1 });

            // A malicious client attempts to create the record in Organization B.
            const result = await createRecord("contact", {
                name: "Test",
                organizationId: ORG_B,
            });

            expect(result).toEqual({ success: true, data: { id: 999, name: "Test" } });
            const createArgs = mockDb.record.create.mock.calls[0][0];
            expect(createArgs.data.organizationId).toBe(ORG_A);
            expect(createArgs.data.organizationId).not.toBe(ORG_B);
        });

        it("the organizationId used by actions follows the authenticated session org", async () => {
            // Same call surface, but the session is Organization B.
            loginOrgB();
            allowRead();
            mockDb.user.findUnique.mockResolvedValue({ groupId: null });
            mockDb.user.findFirst.mockResolvedValue({ id: 2 });
            mockDb.objectDefinition.findUnique.mockResolvedValue(contactObjectDef);
            mockDb.objectDefinition.findFirst.mockResolvedValue({
                apiName: "contact",
            });
            mockDb.assignmentRule.findMany.mockResolvedValue([]);
            mockDb.sharingRule.findMany.mockResolvedValue([]);
            mockDb.record.create.mockResolvedValue({ id: 1001, name: "B Record" });
            mockDb.fieldData.createMany.mockResolvedValue({ count: 1 });

            const result = await createRecord("contact", {
                name: "B Record",
                organizationId: ORG_A,
            });

            expect(result.success).toBe(true);
            const createArgs = mockDb.record.create.mock.calls[0][0];
            // The client tried to pin the record to Org A, but the session is Org B.
            expect(createArgs.data.organizationId).toBe(ORG_B);
        });
    });
});
