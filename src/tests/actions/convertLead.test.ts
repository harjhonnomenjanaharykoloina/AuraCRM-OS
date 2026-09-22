import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb, resetMockDb } = vi.hoisted(() => {
    const mockDb: any = {
        record: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
        user: { findUnique: vi.fn(), findFirst: vi.fn() },
        objectDefinition: { findUnique: vi.fn(), findFirst: vi.fn() },
        fieldData: { findMany: vi.fn(), findUnique: vi.fn(), createMany: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
        assignmentRule: { findMany: vi.fn() },
        sharingRule: { findMany: vi.fn() },
        recordShare: { deleteMany: vi.fn(), upsert: vi.fn() },
        notification: { createMany: vi.fn(), create: vi.fn() },
        fieldHistory: { createMany: vi.fn() },
        queue: { findFirst: vi.fn() },
        queueMember: { findMany: vi.fn() },
        recordOwnerHistory: { create: vi.fn() },
        $transaction: vi.fn(async (cb: any) => cb(mockDb)),
    };
    const resetMockDb = () => {
        mockDb.record.findFirst.mockReset();
        mockDb.record.findMany.mockReset();
        mockDb.record.create.mockReset();
        mockDb.record.update.mockReset();
        mockDb.user.findUnique.mockReset();
        mockDb.user.findFirst.mockReset();
        mockDb.objectDefinition.findUnique.mockReset();
        mockDb.objectDefinition.findFirst.mockReset();
        mockDb.fieldData.findMany.mockReset();
        mockDb.fieldData.findUnique.mockReset();
        mockDb.fieldData.createMany.mockReset();
        mockDb.fieldData.create.mockReset();
        mockDb.fieldData.update.mockReset();
        mockDb.fieldData.deleteMany.mockReset();
        mockDb.assignmentRule.findMany.mockReset();
        mockDb.sharingRule.findMany.mockReset();
        mockDb.recordShare.deleteMany.mockReset();
        mockDb.recordShare.upsert.mockReset();
        mockDb.notification.createMany.mockReset();
        mockDb.notification.create.mockReset();
        mockDb.fieldHistory.createMany.mockReset();
        mockDb.queue.findFirst.mockReset();
        mockDb.queueMember.findMany.mockReset();
        mockDb.recordOwnerHistory.create.mockReset();
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
    buildRecordAccessFilter: vi.fn().mockReturnValue({}),
    buildRecordAccessSql: vi.fn(),
}));
vi.mock("@/lib/duplicates/duplicate-rules", () => ({
    findDuplicateMatches: vi.fn(),
}));
vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
}));

const { mockCreateRecord, mockUpdateRecord } = vi.hoisted(() => ({
    mockCreateRecord: vi.fn(),
    mockUpdateRecord: vi.fn(),
}));

vi.mock("@/actions/standard/record-actions", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/actions/standard/record-actions")>();
    return {
        ...actual,
        createRecord: mockCreateRecord,
        updateRecord: mockUpdateRecord,
    };
});

import { checkPermission } from "@/lib/permissions";
import { findDuplicateMatches } from "@/lib/duplicates/duplicate-rules";
import { convertLead } from "@/actions/standard/lead-actions";
import { createRecord, updateRecord } from "@/actions/standard/record-actions";

const mockedCheckPermission = checkPermission as unknown as Mock;
const mockedCreateRecord = createRecord as unknown as Mock;
const mockedUpdateRecord = updateRecord as unknown as Mock;
const _mockedFindDuplicateMatches = findDuplicateMatches as unknown as Mock;

const leadObj = {
    id: 2,
    apiName: "lead",
    fields: [
        { id: 1, apiName: "name", label: "Lead Name", type: "Text", required: true, picklistOptions: [] },
        { id: 2, apiName: "first_name", label: "First Name", type: "Text", required: true, picklistOptions: [] },
        { id: 3, apiName: "last_name", label: "Last Name", type: "Text", required: true, picklistOptions: [] },
        { id: 4, apiName: "email", label: "Email", type: "Email" },
        { id: 5, apiName: "phone", label: "Phone", type: "Phone" },
        { id: 6, apiName: "title", label: "Title", type: "Text" },
        { id: 7, apiName: "company_name", label: "Company Name", type: "Text" },
        { id: 8, apiName: "company", label: "Company", type: "Lookup", lookupTargetId: 1 },
        { id: 9, apiName: "contact", label: "Contact", type: "Lookup", lookupTargetId: 2 },
        { id: 10, apiName: "status", label: "Status", type: "Picklist", required: true, picklistOptions: [] },
        { id: 11, apiName: "is_converted", label: "Is Converted", type: "Checkbox" },
    ],
};

const leadRecordWithFields = {
    id: 5,
    objectDef: leadObj,
    fields: [
        { fieldDef: { apiName: "first_name", type: "Text" }, valueText: "John" },
        { fieldDef: { apiName: "last_name", type: "Text" }, valueText: "Doe" },
        { fieldDef: { apiName: "email", type: "Email" }, valueText: "john@example.com" },
        { fieldDef: { apiName: "phone", type: "Phone" }, valueText: "123-456-7890" },
        { fieldDef: { apiName: "title", type: "Text" }, valueText: "CEO" },
        { fieldDef: { apiName: "company", type: "Lookup", lookupTargetId: 1 }, valueLookup: 10 },
        { fieldDef: { apiName: "is_converted", type: "Checkbox" }, valueBoolean: false },
    ],
};

describe("convertLead", () => {
    beforeEach(() => {
        resetMockDb();
        mockedCheckPermission.mockReset();
        mockedCheckPermission.mockResolvedValue(true);
        mockedCreateRecord.mockReset();
        mockedCreateRecord.mockResolvedValue({ success: true, data: { id: 42 } });
        mockedUpdateRecord.mockReset();
        mockedUpdateRecord.mockResolvedValue({ success: true });
    });

    it("returns error when objectApiName is not 'lead'", async () => {
        const result = await convertLead("opportunity", 5);
        expect(result).toEqual({ success: false, error: "Only lead records can be converted" });
        expect(mockedCreateRecord).not.toHaveBeenCalled();
        expect(mockedUpdateRecord).not.toHaveBeenCalled();
    });

    it("returns 'Insufficient permissions' when edit permission on lead is false", async () => {
        mockedCheckPermission.mockResolvedValueOnce(false);
        const result = await convertLead("lead", 5);
        expect(result).toEqual({ success: false, error: "Insufficient permissions" });
        expect(mockedCreateRecord).not.toHaveBeenCalled();
        expect(mockedUpdateRecord).not.toHaveBeenCalled();
    });

    it("returns 'Insufficient permissions' when create permission on contact is false", async () => {
        mockedCheckPermission.mockResolvedValueOnce(true);
        mockedCheckPermission.mockResolvedValueOnce(false);
        const result = await convertLead("lead", 5);
        expect(result).toEqual({ success: false, error: "Insufficient permissions" });
        expect(mockedCreateRecord).not.toHaveBeenCalled();
        expect(mockedUpdateRecord).not.toHaveBeenCalled();
    });

    it("returns 'Lead record not found' when lead is not in the database", async () => {
        mockDb.record.findFirst.mockResolvedValue(null);
        const result = await convertLead("lead", 5);
        expect(result).toEqual({ success: false, error: "Lead record not found" });
        expect(mockedCreateRecord).not.toHaveBeenCalled();
        expect(mockedUpdateRecord).not.toHaveBeenCalled();
    });

    it("returns 'Lead has already been converted' when is_converted is already true", async () => {
        const convertedLead = {
            ...leadRecordWithFields,
            fields: [
                ...leadRecordWithFields.fields.filter((f: any) => f.fieldDef.apiName !== "is_converted"),
                { fieldDef: { apiName: "is_converted", type: "Checkbox" }, valueBoolean: true },
            ],
        };
        mockDb.record.findFirst.mockResolvedValue(convertedLead);
        const result = await convertLead("lead", 5);
        expect(result).toEqual({ success: false, error: "Lead has already been converted" });
        expect(mockedCreateRecord).not.toHaveBeenCalled();
        expect(mockedUpdateRecord).not.toHaveBeenCalled();
    });

    it("successfully creates contact and marks lead as converted", async () => {
        mockDb.record.findFirst.mockResolvedValue(leadRecordWithFields);
        mockDb.user.findUnique.mockResolvedValue({ groupId: null });
        const result = await convertLead("lead", 5);
        expect(result).toEqual({ success: true, contactId: 42 });
        expect(mockedCreateRecord).toHaveBeenCalledWith("contact", {
            first_name: "John",
            last_name: "Doe",
            email: "john@example.com",
            phone: "123-456-7890",
            title: "CEO",
            company: 10,
        });
        expect(mockedUpdateRecord).toHaveBeenCalledWith("lead", 5, {
            is_converted: "true",
            contact: 42,
        });
    });

    it("returns error when createRecord fails", async () => {
        mockDb.record.findFirst.mockResolvedValue(leadRecordWithFields);
        mockDb.user.findUnique.mockResolvedValue({ groupId: null });
        mockedCreateRecord.mockResolvedValueOnce({ success: false, error: "Failed to create contact" });
        const result = await convertLead("lead", 5);
        expect(result).toEqual({ success: false, error: "Failed to create contact" });
        expect(mockedUpdateRecord).not.toHaveBeenCalled();
    });

    it("returns error when createRecord succeeds but updateRecord fails", async () => {
        mockDb.record.findFirst.mockResolvedValue(leadRecordWithFields);
        mockDb.user.findUnique.mockResolvedValue({ groupId: null });
        mockedUpdateRecord.mockResolvedValueOnce({ success: false, error: "Failed to update lead" });
        const result = await convertLead("lead", 5);
        expect(result).toEqual({ success: false, error: "Failed to update lead" });
    });
});
