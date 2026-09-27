import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";

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
        $queryRaw: vi.fn(),
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
        mockDb.$queryRaw.mockReset();
        mockDb.$queryRaw.mockResolvedValue([]);
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
vi.mock("@/lib/temporal", () => ({
    getTemporalComparableValue: vi.fn(),
}));

import { deleteRecord, restoreRecord, purgeRecord, getRecord, getRecords } from "@/actions/standard/record-actions";
import { checkPermission } from "@/lib/permissions";

const mockedCheckPermission = checkPermission as unknown as Mock;

const ORG_A = 1;
const _USER_A = 1;
const CONTACT_DEF = {
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
    ],
    validationRules: [],
    notifyOnAssignment: false,
};

function loginOrgA() {
    mockAuth.mockResolvedValue({
        user: { id: "1", organizationId: ORG_A, userType: "admin" },
    });
}

function allowAdmin() {
    mockedCheckPermission.mockResolvedValue(true);
}

describe("soft delete end-to-end", () => {
    beforeEach(() => {
        resetMockDb();
        mockedCheckPermission.mockReset();
        mockAuth.mockReset();
        mockDb.$transaction.mockImplementation(async (cb: any) => cb(mockDb));
    });

    describe("deleteRecord performs a soft-delete", () => {
        beforeEach(() => {
            loginOrgA();
            allowAdmin();
            mockDb.user.findUnique.mockResolvedValue({ groupId: null });
        });

        it("sets isDeleted=true and does NOT hard-delete the record", async () => {
            mockDb.record.findFirst.mockResolvedValue({ id: 1, organizationId: ORG_A, isDeleted: false, objectDefId: 1 });

            const result = await deleteRecord("crm", "contact", 1);

            expect(result.success).toBe(true);
            const _tx = mockDb.$transaction.mock.calls[0][0];
            // tx.record.update was called with isDeleted: true
            expect(mockDb.record.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 1, organizationId: ORG_A },
                    data: expect.objectContaining({ isDeleted: true }),
                })
            );
            // tx.record.delete was NOT called
            expect(mockDb.record.delete).not.toHaveBeenCalled();
        });

        it("does not clear inbound lookups or delete files during soft-delete", async () => {
            mockDb.record.findFirst.mockResolvedValue({ id: 1, organizationId: ORG_A, isDeleted: false, objectDefId: 1 });

            await deleteRecord("crm", "contact", 1);

            expect(mockDb.fieldData.updateMany).not.toHaveBeenCalled();
            expect(mockDb.record.delete).not.toHaveBeenCalled();
        });

        it("returns not found when the record does not exist or is already deleted", async () => {
            mockDb.record.findFirst.mockResolvedValue(null);

            const result = await deleteRecord("crm", "contact", 999);

            expect(result).toEqual({ success: false, error: "Record not found" });
        });

        it("includes isDeleted:false in the findFirst lookup", async () => {
            mockDb.record.findFirst.mockResolvedValue(null);

            await deleteRecord("crm", "contact", 999);

            const where = mockDb.record.findFirst.mock.calls[0][0].where;
            expect(where.isDeleted).toBe(false);
            expect(where.organizationId).toBe(ORG_A);
            expect(where.id).toBe(999);
        });

        it("denies restore/purge without delete permission", async () => {
            mockedCheckPermission.mockImplementation(async (_uid: number, _org: number, _obj: string, perm: string) => {
                return perm !== "modifyAll" && perm !== "delete";
            });
            mockDb.user.findUnique.mockResolvedValue({ groupId: null });

            const restoreResult = await restoreRecord("crm", "contact", 1);
            expect(restoreResult).toEqual({ success: false, error: "Insufficient permissions" });

            const purgeResult = await purgeRecord("crm", "contact", 1);
            expect(purgeResult).toEqual({ success: false, error: "Insufficient permissions" });
        });
    });

    describe("restoreRecord sets isDeleted=false", () => {
        beforeEach(() => {
            loginOrgA();
            allowAdmin();
            mockDb.user.findUnique.mockResolvedValue({ groupId: null });
        });

        it("finds the soft-deleted record and marks it active", async () => {
            mockDb.record.findFirst.mockResolvedValue({ id: 1, organizationId: ORG_A, isDeleted: true, objectDefId: 1, objectDef: { apiName: "contact" } });

            const result = await restoreRecord("crm", "contact", 1);

            expect(result.success).toBe(true);
            const where = mockDb.record.findFirst.mock.calls[0][0].where;
            expect(where.isDeleted).toBe(true);
            expect(mockDb.record.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 1, organizationId: ORG_A },
                    data: expect.objectContaining({ isDeleted: false }),
                })
            );
        });

        it("returns not found when no soft-deleted record exists", async () => {
            mockDb.record.findFirst.mockResolvedValue(null);

            const result = await restoreRecord("crm", "contact", 999);

            expect(result).toEqual({ success: false, error: "Record not found" });
        });
    });

    describe("purgeRecord hard-deletes the soft-deleted record", () => {
        beforeEach(() => {
            loginOrgA();
            allowAdmin();
            mockDb.user.findUnique.mockResolvedValue({ groupId: null });
            mockDb.fieldDefinition.findMany.mockResolvedValue([]);
        });

        it("calls tx.record.delete for the soft-deleted record", async () => {
            mockDb.record.findFirst.mockResolvedValue({
                id: 1,
                organizationId: ORG_A,
                isDeleted: true,
                objectDefId: 1,
                objectDef: { apiName: "contact" },
            });

            const result = await purgeRecord("crm", "contact", 1);

            expect(result.success).toBe(true);
            expect(mockDb.record.delete).toHaveBeenCalledWith({ where: { id: 1 } });
        });

        it("only targets soft-deleted records in the findFirst lookup", async () => {
            mockDb.record.findFirst.mockResolvedValue(null);

            await purgeRecord("crm", "contact", 999);

            const where = mockDb.record.findFirst.mock.calls[0][0].where;
            expect(where.isDeleted).toBe(true);
            expect(where.id).toBe(999);
        });
    });

    describe("getRecords includeDeleted scoping", () => {
        beforeEach(() => {
            loginOrgA();
            allowAdmin();
            mockDb.user.findUnique.mockResolvedValue({ groupId: null });
        });

        it("filters isDeleted=false by default", async () => {
            mockDb.objectDefinition.findUnique.mockResolvedValue(CONTACT_DEF);
            mockDb.record.count.mockResolvedValue(0);
            mockDb.record.findMany.mockResolvedValue([]);

            await getRecords("contact", 1, 25);

            const countWhere = mockDb.record.count.mock.calls[0][0].where;
            expect(countWhere.isDeleted).toBe(false);
        });

        it("does NOT filter isDeleted when includeDeleted is true", async () => {
            mockDb.objectDefinition.findUnique.mockResolvedValue(CONTACT_DEF);
            mockDb.record.count.mockResolvedValue(0);
            mockDb.record.findMany.mockResolvedValue([]);

            await getRecords("contact", 1, 25, undefined, "desc", undefined, { includeDeleted: true });

            const countWhere = mockDb.record.count.mock.calls[0][0].where;
            expect(countWhere.isDeleted).toBeUndefined();
        });
    });

    describe("getRecord includeDeleted scoping", () => {
        beforeEach(() => {
            loginOrgA();
            allowAdmin();
            mockDb.user.findUnique.mockResolvedValue({ groupId: null });
        });

        it("filters isDeleted=false by default", async () => {
            mockDb.record.findFirst.mockResolvedValue(null);

            await getRecord("contact", 1);

            const where = mockDb.record.findFirst.mock.calls[0][0].where;
            expect(where.isDeleted).toBe(false);
        });

        it("does NOT filter isDeleted when includeDeleted is true", async () => {
            mockDb.record.findFirst.mockResolvedValue(null);

            await getRecord("contact", 1, { includeDeleted: true });

            const where = mockDb.record.findFirst.mock.calls[0][0].where;
            expect(where.isDeleted).toBeUndefined();
        });
    });

    describe("getRecords includeDeleted requires viewAll", () => {
        beforeEach(() => {
            loginOrgA();
            mockedCheckPermission.mockImplementation(async (_uid: number, _org: number, _obj: string, perm: string) => {
                return perm !== "viewAll";
            });
            mockDb.user.findUnique.mockResolvedValue({ groupId: null });
        });

        it("includeDeleted is ignored when user lacks viewAll", async () => {
            mockDb.objectDefinition.findUnique.mockResolvedValue(CONTACT_DEF);
            mockDb.record.count.mockResolvedValue(0);
            mockDb.record.findMany.mockResolvedValue([]);

            await getRecords("contact", 1, 25, undefined, "desc", undefined, { includeDeleted: true });

            const countWhere = mockDb.record.count.mock.calls[0][0].where;
            expect(countWhere.isDeleted).toBe(false);
        });

        it("getRecord includeDeleted is ignored when user lacks viewAll", async () => {
            mockDb.record.findFirst.mockResolvedValue(null);

            await getRecord("contact", 1, { includeDeleted: true });

            const where = mockDb.record.findFirst.mock.calls[0][0].where;
            expect(where.isDeleted).toBe(false);
        });
    });
});
