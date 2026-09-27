import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb, resetMockDb } = vi.hoisted(() => {
    const mockDb: any = {
        objectDefinition: { findUnique: vi.fn() },
        user: { findUnique: vi.fn() },
        record: { findFirst: vi.fn(), update: vi.fn() },
        fieldData: { upsert: vi.fn() },
        $transaction: vi.fn(async (cb: any) => cb(mockDb)),
    };
    const resetMockDb = () => {
        mockDb.objectDefinition.findUnique.mockReset();
        mockDb.user.findUnique.mockReset();
        mockDb.record.findFirst.mockReset();
        mockDb.record.update.mockReset();
        mockDb.fieldData.upsert.mockReset();
        mockDb.$transaction.mockReset();
        mockDb.$transaction.mockImplementation(async (cb: any) => cb(mockDb));
    };
    return { mockDb, resetMockDb };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/auth", () => ({
    auth: vi.fn().mockResolvedValue({ user: { id: "1", organizationId: 1, userType: "admin" } }),
}));
vi.mock("@/lib/permissions", () => ({
    checkPermission: vi.fn().mockResolvedValue(true),
    getUserPermissionSetIds: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/record-access", () => ({
    getUserQueueIds: vi.fn().mockResolvedValue([]),
    getUserAccessContext: vi.fn().mockResolvedValue({ userId: 1, organizationId: 1, queueIds: [], userGroupId: null, permissionSetIds: [] }),
    buildRecordAccessFilter: vi.fn().mockReturnValue({}),
}));
vi.mock("@/lib/duplicates/duplicate-rules", () => ({
    findDuplicateMatches: vi.fn(),
}));

import { checkPermission } from "@/lib/permissions";
import { moveRecord } from "@/actions/standard/record-actions";

const mockedCheckPermission = checkPermission as unknown as Mock;
const FIELD_ID = 10;
const OBJECT_DEF_ID = 2;
const OPTION_ID = 99;

const baseField = {
    id: FIELD_ID,
    apiName: "status",
    label: "Status",
    type: "Picklist",
    picklistOptions: [{ id: OPTION_ID, label: "Closed Won", isActive: true }],
};

describe("moveRecord", () => {
    beforeEach(() => {
        resetMockDb();
        mockedCheckPermission.mockReset();
        mockedCheckPermission.mockResolvedValue(true);
    });

    it("returns insufficient permissions when edit not allowed", async () => {
        mockedCheckPermission.mockResolvedValueOnce(false);
        const result = await moveRecord("opportunity", 5, FIELD_ID, OPTION_ID);
        expect(result).toEqual({ success: false, error: "Insufficient permissions" });
        expect(mockDb.fieldData.upsert).not.toHaveBeenCalled();
    });

    it("returns 'Object not found' when object missing", async () => {
        mockDb.objectDefinition.findUnique.mockResolvedValue(null);
        const result = await moveRecord("opportunity", 5, FIELD_ID, OPTION_ID);
        expect(result).toEqual({ success: false, error: "Object not found" });
    });

    it("returns 'Field not found' when field missing", async () => {
        mockDb.objectDefinition.findUnique.mockResolvedValue({
            id: OBJECT_DEF_ID,
            fields: [{ id: 1, apiName: "x", type: "Picklist", picklistOptions: [] }],
        });
        const result = await moveRecord("opportunity", 5, FIELD_ID, OPTION_ID);
        expect(result).toEqual({ success: false, error: "Field not found" });
    });

    it("returns error when field is not a picklist", async () => {
        mockDb.objectDefinition.findUnique.mockResolvedValue({
            id: OBJECT_DEF_ID,
            fields: [{ id: FIELD_ID, apiName: "amount", type: "Number", picklistOptions: [] }],
        });
        const result = await moveRecord("opportunity", 5, FIELD_ID, OPTION_ID);
        expect(result).toEqual({ success: false, error: "Field is not a picklist" });
    });

    it("returns error for an invalid picklist option", async () => {
        mockDb.objectDefinition.findUnique.mockResolvedValue({
            id: OBJECT_DEF_ID,
            fields: [baseField],
        });
        const result = await moveRecord("opportunity", 5, FIELD_ID, 9999);
        expect(result).toEqual({ success: false, error: "Invalid picklist option" });
    });

    it("returns 'Record not found' when record missing", async () => {
        mockDb.objectDefinition.findUnique.mockResolvedValue({ id: OBJECT_DEF_ID, fields: [baseField] });
        mockDb.user.findUnique.mockResolvedValue({ groupId: null });
        mockDb.record.findFirst.mockResolvedValue(null);
        const result = await moveRecord("opportunity", 5, FIELD_ID, OPTION_ID);
        expect(result).toEqual({ success: false, error: "Record not found" });
    });

    it("moves the record stage on success", async () => {
        mockDb.objectDefinition.findUnique.mockResolvedValue({ id: OBJECT_DEF_ID, fields: [baseField] });
        mockDb.user.findUnique.mockResolvedValue({ groupId: null });
        mockDb.record.findFirst.mockResolvedValue({ id: 5 });

        const result = await moveRecord("opportunity", 5, FIELD_ID, OPTION_ID);
        expect(result).toEqual({ success: true });

        expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
        expect(mockDb.record.update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 5 } })
        );
        expect(mockDb.fieldData.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { recordId_fieldDefId: { recordId: 5, fieldDefId: FIELD_ID } },
            })
        );
        const upsertArg = mockDb.fieldData.upsert.mock.calls[0][0];
        expect(upsertArg.update.valuePicklistId).toBe(OPTION_ID);
        expect(upsertArg.create.valuePicklistId).toBe(OPTION_ID);
    });
});
