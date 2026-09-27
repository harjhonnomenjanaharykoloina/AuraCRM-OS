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
import { updateLeadStatus } from "@/actions/standard/lead-actions";
import { createRecord, updateRecord } from "@/actions/standard/record-actions";

const mockedCheckPermission = checkPermission as unknown as Mock;
const mockedCreateRecord = createRecord as unknown as Mock;
const mockedUpdateRecord = updateRecord as unknown as Mock;
const _mockedFindDuplicateMatches = findDuplicateMatches as unknown as Mock;

const convertedStatusId = 5;

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

const makeLeadWithStatus = (statusLabel?: string): any => {
    const statusFieldDef = leadObj.fields.find((f: any) => f.apiName === "status");
    const option = statusLabel
        ? statusFieldDef?.picklistOptions?.find((opt: any) => opt.label === statusLabel)
        : null;
    return {
        ...leadRecordWithFields,
        fields: leadRecordWithFields.fields.map((f: any) => {
            if (f.fieldDef.apiName === "status") {
                return {
                    ...f,
                    valuePicklistId: option?.id ?? null,
                    valuePicklist: option ?? null,
                };
            }
            return f;
        }),
    };
};

describe("updateLeadStatus", () => {
    beforeEach(() => {
        resetMockDb();
        mockedCheckPermission.mockReset();
        mockedCheckPermission.mockResolvedValue(true);
        mockedUpdateRecord.mockReset();
        mockedUpdateRecord.mockResolvedValue({ success: true });
        mockDb.user.findUnique.mockResolvedValue({ groupId: null });
        mockDb.record.findFirst.mockResolvedValue(leadRecordWithFields);
    });

    it("transitions status New -> Contacted", async () => {
        const result = await updateLeadStatus(5, "Contacted");
        expect(result).toEqual({ success: true, status: "Contacted" });
        expect(mockedUpdateRecord).toHaveBeenCalledWith("lead", 5, { status: 2 });
    });

    it("transitions status New -> Qualified", async () => {
        const result = await updateLeadStatus(5, "Qualified");
        expect(result).toEqual({ success: true, status: "Qualified" });
        expect(mockedUpdateRecord).toHaveBeenCalledWith("lead", 5, { status: 3 });
    });

    it("transitions status Contacted -> Qualified", async () => {
        mockDb.record.findFirst.mockResolvedValue(makeLeadWithStatus("Contacted"));
        const result = await updateLeadStatus(5, "Qualified");
        expect(result).toEqual({ success: true, status: "Qualified" });
        expect(mockedUpdateRecord).toHaveBeenCalledWith("lead", 5, { status: 3 });
    });

    it("transitions status Qualified -> Converted", async () => {
        mockDb.record.findFirst.mockResolvedValue(makeLeadWithStatus("Qualified"));
        const result = await updateLeadStatus(5, "Converted");
        expect(result).toEqual({ success: true, status: "Converted" });
        expect(mockedUpdateRecord).toHaveBeenCalledWith("lead", 5, { status: 5 });
    });

    it("rejects backflow Qualified -> New", async () => {
        mockDb.record.findFirst.mockResolvedValue(makeLeadWithStatus("Qualified"));
        const result = await updateLeadStatus(5, "New");
        expect(result).toEqual({ success: false, error: "Cannot transition from 'Qualified' to 'New'" });
        expect(mockedUpdateRecord).not.toHaveBeenCalled();
    });

    it("rejects backflow Qualified -> Contacted", async () => {
        mockDb.record.findFirst.mockResolvedValue(makeLeadWithStatus("Qualified"));
        const result = await updateLeadStatus(5, "Contacted");
        expect(result).toEqual({ success: false, error: "Cannot transition from 'Qualified' to 'Contacted'" });
        expect(mockedUpdateRecord).not.toHaveBeenCalled();
    });

    it("rejects transition from terminal status Unqualified", async () => {
        mockDb.record.findFirst.mockResolvedValue(makeLeadWithStatus("Unqualified"));
        const result = await updateLeadStatus(5, "New");
        expect(result).toEqual({ success: false, error: "Cannot transition from 'Unqualified' to 'New'" });
        expect(mockedUpdateRecord).not.toHaveBeenCalled();
    });

    it("returns error for unknown status label", async () => {
        mockDb.record.findFirst.mockResolvedValue(makeLeadWithStatus(undefined));
        const result = await updateLeadStatus(5, "Foo");
        expect(result).toEqual({ success: false, error: "Status 'Foo' is not a valid option" });
        expect(mockedUpdateRecord).not.toHaveBeenCalled();
    });

    it("returns 'Insufficient permissions' when checkPermission is false", async () => {
        mockedCheckPermission.mockResolvedValue(false);
        const result = await updateLeadStatus(5, "Contacted");
        expect(result).toEqual({ success: false, error: "Insufficient permissions" });
        expect(mockedUpdateRecord).not.toHaveBeenCalled();
    });

    it("returns 'Lead record not found' when lead is not in the database", async () => {
        mockDb.record.findFirst.mockResolvedValue(null);
        const result = await updateLeadStatus(5, "Contacted");
        expect(result).toEqual({ success: false, error: "Lead record not found" });
        expect(mockedUpdateRecord).not.toHaveBeenCalled();
    });
});
