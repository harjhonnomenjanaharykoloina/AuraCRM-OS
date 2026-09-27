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
        picklistOption: { findFirst: vi.fn() },
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
        mockDb.picklistOption.findFirst.mockReset();
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
    buildRecordAccessSql: vi.fn(),
}));
vi.mock("@/lib/duplicates/duplicate-rules", () => ({
    findDuplicateMatches: vi.fn(),
}));
vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
}));
vi.mock("@/lib/temporal", () => ({
    formatDateOnlyForInput: vi.fn((date: Date) => {
        const d = typeof date === "string" ? new Date(date) : date;
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, "0");
        const day = String(d.getUTCDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }),
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

const convertedStatusId = 5;
const oppStageOptionId = 7;

const leadObj = {
    id: 2,
    apiName: "lead",
    fields: [
        { id: 1, apiName: "name", label: "Lead Name", type: "Text", required: true, picklistOptions: [] },
        { id: 2, apiName: "first_name", label: "First Name", type: "Text", required: true, picklistOptions: [] },
        { id: 3, apiName: "last_name", label: "Last Name", type: "Text", required: true, picklistOptions: [] },
        { id: 4, apiName: "email", label: "Email", type: "Email", picklistOptions: [] },
        { id: 5, apiName: "phone", label: "Phone", type: "Phone", picklistOptions: [] },
        { id: 6, apiName: "title", label: "Title", type: "Text", picklistOptions: [] },
        { id: 7, apiName: "company_name", label: "Company Name", type: "Text", picklistOptions: [] },
        { id: 8, apiName: "company", label: "Company", type: "Lookup", lookupTargetId: 1, picklistOptions: [] },
        { id: 9, apiName: "contact", label: "Contact", type: "Lookup", lookupTargetId: 2, picklistOptions: [] },
        { id: 10, apiName: "status", label: "Status", type: "Picklist", required: true, picklistOptions: [
            { id: 1, label: "New", apiName: "new", sortOrder: 0, isActive: true },
            { id: 2, label: "Contacted", apiName: "contacted", sortOrder: 1, isActive: true },
            { id: 3, label: "Qualified", apiName: "qualified", sortOrder: 2, isActive: true },
            { id: 4, label: "Unqualified", apiName: "unqualified", sortOrder: 3, isActive: true },
            { id: convertedStatusId, label: "Converted", apiName: "converted", sortOrder: 4, isActive: true },
            { id: 6, label: "Rejected", apiName: "rejected", sortOrder: 5, isActive: true },
        ] },
        { id: 11, apiName: "is_converted", label: "Is Converted", type: "Checkbox", picklistOptions: [] },
        { id: 12, apiName: "opportunity", label: "Opportunity", type: "Lookup", lookupTargetId: 3, picklistOptions: [] },
        { id: 13, apiName: "source", label: "Source", type: "Picklist", picklistOptions: [] },
        { id: 14, apiName: "score", label: "Score", type: "Number", picklistOptions: [] },
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
        { fieldDef: { apiName: "company_name", type: "Text" }, valueText: null },
        { fieldDef: { apiName: "company", type: "Lookup", lookupTargetId: 1 }, valueLookup: 10 },
        { fieldDef: { apiName: "status", type: "Picklist" }, valuePicklistId: 1, valuePicklist: { id: 1, label: "New", apiName: "new", sortOrder: 0, isActive: true } },
        { fieldDef: { apiName: "is_converted", type: "Checkbox" }, valueBoolean: false },
    ],
};

const leadForCompanyCreation = {
    ...leadRecordWithFields,
    fields: leadRecordWithFields.fields.map((f: any) => {
        if (f.fieldDef.apiName === "company_name") return { ...f, valueText: "Acme Corp" };
        if (f.fieldDef.apiName === "company") return { ...f, valueLookup: null };
        return f;
    }),
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
        mockDb.user.findUnique.mockResolvedValue({ groupId: null });
        mockDb.picklistOption.findFirst.mockResolvedValue({ id: oppStageOptionId });
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

    it("returns 'Insufficient permissions' when create permission on company is false", async () => {
        mockedCheckPermission.mockResolvedValueOnce(true);
        mockedCheckPermission.mockResolvedValueOnce(true);
        mockedCheckPermission.mockResolvedValueOnce(false);
        const result = await convertLead("lead", 5);
        expect(result).toEqual({ success: false, error: "Insufficient permissions" });
        expect(mockedCreateRecord).not.toHaveBeenCalled();
        expect(mockedUpdateRecord).not.toHaveBeenCalled();
    });

    it("returns 'Insufficient permissions' when create permission on opportunity is false", async () => {
        mockedCheckPermission.mockResolvedValueOnce(true);
        mockedCheckPermission.mockResolvedValueOnce(true);
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

    it("returns idempotency response when lead already converted", async () => {
        const convertedLead = {
            ...leadRecordWithFields,
            fields: [
                ...leadRecordWithFields.fields.filter((f: any) => f.fieldDef.apiName !== "is_converted"),
                { fieldDef: { apiName: "is_converted", type: "Checkbox" }, valueBoolean: true },
                { fieldDef: { apiName: "contact", type: "Lookup", lookupTargetId: 2 }, valueLookup: 42 },
                { fieldDef: { apiName: "opportunity", type: "Lookup", lookupTargetId: 3 }, valueLookup: 99 },
            ],
        };
        mockDb.record.findFirst.mockResolvedValue(convertedLead);
        const result = await convertLead("lead", 5);
        expect(result).toEqual({ success: true, alreadyConverted: true, contactId: 42, companyId: 10, opportunityId: 99 });
        expect(mockedCreateRecord).not.toHaveBeenCalled();
        expect(mockedUpdateRecord).not.toHaveBeenCalled();
    });

    it("successfully creates company, contact, opportunity and marks lead as converted", async () => {
        mockDb.record.findFirst.mockResolvedValue(leadForCompanyCreation);
        mockedCreateRecord
            .mockResolvedValueOnce({ success: true, data: { id: 100 } })
            .mockResolvedValueOnce({ success: true, data: { id: 42 } })
            .mockResolvedValueOnce({ success: true, data: { id: 99 } });
        const result = await convertLead("lead", 5);
        expect(result).toEqual({ success: true, contactId: 42, companyId: 100, opportunityId: 99 });
        expect(mockedCreateRecord).toHaveBeenCalledWith("company", { name: "Acme Corp" });
        expect(mockedCreateRecord).toHaveBeenCalledWith("contact", {
            first_name: "John",
            last_name: "Doe",
            email: "john@example.com",
            phone: "123-456-7890",
            title: "CEO",
            company: 100,
        });
        expect(mockedCreateRecord).toHaveBeenCalledWith("opportunity", {
            amount: "0",
            stage: oppStageOptionId,
            close_date: expect.any(String),
            company: 100,
            contact: 42,
        });
        expect(mockedUpdateRecord).toHaveBeenCalledWith("lead", 5, {
            is_converted: "true",
            status: convertedStatusId,
            company: 100,
            contact: 42,
            opportunity: 99,
        });
    });

    it("skips company creation when company_name is empty, uses existing company lookup", async () => {
        mockDb.record.findFirst.mockResolvedValue(leadRecordWithFields);
        mockedCreateRecord
            .mockResolvedValueOnce({ success: true, data: { id: 42 } })
            .mockResolvedValueOnce({ success: true, data: { id: 99 } });
        const result = await convertLead("lead", 5);
        expect(result).toEqual({ success: true, contactId: 42, companyId: 10, opportunityId: 99 });
        expect(mockedCreateRecord).not.toHaveBeenCalledWith("company", expect.anything());
        expect(mockedCreateRecord).toHaveBeenCalledWith("contact", {
            first_name: "John",
            last_name: "Doe",
            email: "john@example.com",
            phone: "123-456-7890",
            title: "CEO",
            company: 10,
        });
        expect(mockedCreateRecord).toHaveBeenCalledWith("opportunity", {
            amount: "0",
            stage: oppStageOptionId,
            close_date: expect.any(String),
            company: 10,
            contact: 42,
        });
        expect(mockedUpdateRecord).toHaveBeenCalledWith("lead", 5, {
            is_converted: "true",
            status: convertedStatusId,
            company: 10,
            contact: 42,
            opportunity: 99,
        });
    });

    it("returns error when createRecord fails for contact", async () => {
        mockDb.record.findFirst.mockResolvedValue(leadForCompanyCreation);
        mockedCreateRecord.mockResolvedValueOnce({ success: true, data: { id: 100 } });
        mockedCreateRecord.mockResolvedValueOnce({ success: false, error: "Failed to create contact" });
        const result = await convertLead("lead", 5);
        expect(result).toEqual({ success: false, error: "Failed to create contact" });
        expect(mockedUpdateRecord).not.toHaveBeenCalled();
    });

    it("returns error when createRecord succeeds but updateRecord fails", async () => {
        mockDb.record.findFirst.mockResolvedValue(leadRecordWithFields);
        mockedCreateRecord
            .mockResolvedValueOnce({ success: true, data: { id: 42 } })
            .mockResolvedValueOnce({ success: true, data: { id: 99 } });
        mockedUpdateRecord.mockResolvedValueOnce({ success: false, error: "Failed to update lead" });
        const result = await convertLead("lead", 5);
        expect(result).toEqual({ success: false, error: "Failed to update lead" });
    });
});
