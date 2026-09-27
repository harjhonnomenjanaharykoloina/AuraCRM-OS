import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb, resetMockDb } = vi.hoisted(() => {
    const mockDb: any = {
        record: {
            findFirst: vi.fn(),
            findMany: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
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
        $transaction: vi.fn(async (cb: any) => cb(mockDb)),
    };

    const resetMockDb = () => {
        mockDb.record.findFirst.mockReset();
        mockDb.record.findUnique.mockReset();
        mockDb.record.findMany.mockReset();
        mockDb.record.create.mockReset();
        mockDb.record.update.mockReset();
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
        mockDb.$transaction.mockReset();
        mockDb.$transaction.mockImplementation(async (cb: any) => cb(mockDb));
    };

    return { mockDb, resetMockDb };
});

const { mockGetUserContext, mockCheckPermission, mockGetUserQueueIds } = vi.hoisted(() => ({
    mockGetUserContext: vi.fn().mockResolvedValue({ userId: 1, organizationId: 1, userType: "admin" }),
    mockCheckPermission: vi.fn().mockResolvedValue(true),
    mockGetUserQueueIds: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/auth/context", () => ({ getUserContext: mockGetUserContext }));
vi.mock("@/lib/permissions", () => ({
    checkPermission: mockCheckPermission,
    getUserPermissionSetIds: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/record-access", () => ({
    getUserQueueIds: mockGetUserQueueIds,
    getUserAccessContext: vi.fn().mockResolvedValue({ userId: 1, organizationId: 1, queueIds: [], userGroupId: null, permissionSetIds: [] }),
    buildRecordAccessFilter: vi.fn().mockReturnValue(null),
    buildRecordAccessSql: vi.fn().mockReturnValue(null),
}));
vi.mock("lucide-react", () => {
    const icons: Record<string, any> = {};
    const names = ["Calendar", "Clock", "FileText", "Mail", "MoreHorizontal", "Phone", "CheckSquare"];
    for (const name of names) {
        icons[name] = { displayName: name };
    }
    return icons;
});
vi.mock("@/components/ui/badge", () => ({
    Badge: ({ children, variant }: any) => null,
}));
vi.mock("@/components/ui/card", () => ({
    Card: ({ children }: any) => null,
    CardContent: ({ children }: any) => null,
    CardHeader: ({ children }: any) => null,
    CardTitle: ({ children }: any) => null,
}));
vi.mock("@/lib/temporal", () => ({
    formatDateTimeForDisplay: vi.fn().mockReturnValue(null),
    formatDateOnlyForDisplay: vi.fn().mockReturnValue(null),
    parseDateTimeValue: vi.fn().mockImplementation((rawValue: unknown) => {
        if (!rawValue) return null;
        const date = rawValue instanceof Date ? rawValue : new Date(String(rawValue));
        return Number.isNaN(date.getTime()) ? null : date;
    }),
    parseDateOnlyValue: vi.fn().mockImplementation((rawValue: unknown) => {
        if (!rawValue) return null;
        const date = rawValue instanceof Date ? rawValue : new Date(String(rawValue));
        return Number.isNaN(date.getTime()) ? null : date;
    }),
    isDateTimeFieldType: (type: string) => type === "DateTime",
    isDateOnlyFieldType: (type: string) => type === "Date",
    isTemporalFieldType: (type: string) => type === "Date" || type === "DateTime",
    formatDateOnlyForInput: vi.fn().mockReturnValue(""),
    formatDateTimeForInput: vi.fn().mockReturnValue(""),
    getDateOnlyKey: vi.fn(),
    buildUtcDate: vi.fn(),
    MS_PER_DAY: 86400000,
    DAY_MS: 86400000,
}));

import { logActivity, getActivityTimeline } from "@/actions/activity-actions";

const mockedCheckPermission = mockCheckPermission as unknown as Mock;

const ACTIVITY_OBJ_DEF = {
    id: 99,
    apiName: "activity",
    label: "Activity",
    pluralLabel: "Activities",
    fields: [
        { id: 1001, apiName: "name", label: "Subject", type: "Text", required: true, picklistOptions: [] },
        { id: 1002, apiName: "activity_type", label: "Activity Type", type: "Picklist", required: true, picklistOptions: [
            { id: 1, label: "Call", apiName: "call", sortOrder: 0, isActive: true },
            { id: 2, label: "Meeting", apiName: "meeting", sortOrder: 1, isActive: true },
            { id: 3, label: "Email", apiName: "email", sortOrder: 2, isActive: true },
            { id: 4, label: "Task", apiName: "task", sortOrder: 3, isActive: true },
            { id: 5, label: "Custom", apiName: "custom", sortOrder: 4, isActive: true },
        ] },
        { id: 1003, apiName: "activity_date", label: "Activity Date", type: "DateTime", picklistOptions: [] },
        { id: 1004, apiName: "description", label: "Description", type: "TextArea", picklistOptions: [] },
        { id: 1005, apiName: "duration_minutes", label: "Duration (Minutes)", type: "Number", picklistOptions: [] },
        { id: 1006, apiName: "related_record_id", label: "Related Record", type: "Lookup", picklistOptions: [] },
        { id: 1007, apiName: "related_object_type", label: "Related Object Type", type: "Text", picklistOptions: [] },
        { id: 1008, apiName: "status", label: "Status", type: "Picklist", required: true, picklistOptions: [
            { id: 10, label: "Completed", apiName: "completed", sortOrder: 0, isActive: true },
            { id: 11, label: "Pending", apiName: "pending", sortOrder: 1, isActive: true },
            { id: 12, label: "Scheduled", apiName: "scheduled", sortOrder: 2, isActive: true },
        ] },
    ],
};

const RELATED_RECORD = { id: 42, organizationId: 1, isDeleted: false, objectDef: { apiName: "contact" } };

function setupDefaults() {
    mockDb.$transaction.mockImplementation(async (cb: any) => cb(mockDb));
    mockDb.record.findFirst.mockResolvedValue(RELATED_RECORD);
    mockDb.objectDefinition.findUnique.mockResolvedValue(ACTIVITY_OBJ_DEF);
    mockDb.user.findUnique.mockResolvedValue({ groupId: null });
    mockedCheckPermission.mockResolvedValue(true);
    mockGetUserQueueIds.mockResolvedValue([]);
    mockDb.record.create.mockResolvedValue({ id: 1, createdAt: new Date(), updatedAt: new Date() });
}

describe("logActivity", () => {
    beforeEach(() => {
        resetMockDb();
        setupDefaults();
    });

    it("creates an activity record with correct fields via tx.record.create and tx.fieldData.createMany", async () => {
        const result = await logActivity({
            recordId: 42,
            activityType: "call",
            subject: "Called the prospect",
            description: "Discussed pricing",
            durationMinutes: 15,
            status: "completed",
            activityDate: "2025-01-15T10:00:00Z",
        });

        expect(result.success).toBe(true);
        if (!result.success) return;

        expect(result.activity?.subject).toBe("Called the prospect");
        expect(result.activity?.activityType).toBe("call");
        expect(result.activity?.status).toBe("completed");
        expect(result.activity?.durationMinutes).toBe(15);
        expect(result.activity?.relatedRecordId).toBe(42);

        // Verify tx.record.create was called inside the transaction
        expect(mockDb.record.create).toHaveBeenCalledTimes(1);
        const createCall = mockDb.record.create.mock.calls[0][0];
        expect(createCall.data.objectDefId).toBe(ACTIVITY_OBJ_DEF.id);
        expect(createCall.data.name).toBe("Called the prospect");

        // Verify tx.fieldData.createMany was called with correct payloads
        expect(mockDb.fieldData.createMany).toHaveBeenCalledTimes(1);
        const createManyCall = mockDb.fieldData.createMany.mock.calls[0][0];
        const data = createManyCall.data;

        // Should have entries for all 8 fields: name, activity_type, activity_date,
        // description, duration_minutes, related_record_id, related_object_type, status
        expect(data).toHaveLength(8);

        // Check name field (subject stored as name field value)
        const nameEntry = data.find((d: any) => d.fieldDefId === 1001);
        expect(nameEntry).toBeDefined();
        expect(nameEntry.valueText).toBe("Called the prospect");

        // Check activity_type field (resolved to picklist option id)
        const typeEntry = data.find((d: any) => d.fieldDefId === 1002);
        expect(typeEntry.valuePicklistId).toBe(1); // "Call" option id = 1

        // Check status field (resolved to picklist option id)
        const statusEntry = data.find((d: any) => d.fieldDefId === 1008);
        expect(statusEntry.valuePicklistId).toBe(10); // "Completed" option id = 10

        // Check related_record_id field (lookup value)
        const relatedEntry = data.find((d: any) => d.fieldDefId === 1006);
        expect(relatedEntry.valueLookup).toBe(42);

        // Check related_object_type field
        const objTypeEntry = data.find((d: any) => d.fieldDefId === 1007);
        expect(objTypeEntry.valueText).toBe("contact");

        // Check duration_minutes field (number)
        const durationEntry = data.find((d: any) => d.fieldDefId === 1005);
        expect(durationEntry.valueNumber).toBeDefined();

        // Check activity_date field (datetime)
        const dateEntry = data.find((d: any) => d.fieldDefId === 1003);
        expect(dateEntry.valueDate).toBeInstanceOf(Date);

        // Check description field (textarea)
        const descEntry = data.find((d: any) => d.fieldDefId === 1004);
        expect(descEntry.valueText).toBe("Discussed pricing");
    });

    it("defaults status to 'pending' and activityDate to now when not provided", async () => {
        const result = await logActivity({
            recordId: 42,
            activityType: "meeting",
            subject: "Team sync",
        });

        expect(result.success).toBe(true);
        if (!result.success) return;

        expect(result.activity?.status).toBe("pending");

        const createManyCall = mockDb.fieldData.createMany.mock.calls[0][0];
        const data = createManyCall.data;

        // activity_type should resolve to "Meeting" option id = 2
        const typeEntry = data.find((d: any) => d.fieldDefId === 1002);
        expect(typeEntry.valuePicklistId).toBe(2);

        // status should resolve to "Pending" option id = 11
        const statusEntry = data.find((d: any) => d.fieldDefId === 1008);
        expect(statusEntry.valuePicklistId).toBe(11);

        // activity_date should be set to a Date
        const dateEntry = data.find((d: any) => d.fieldDefId === 1003);
        expect(dateEntry.valueDate).toBeInstanceOf(Date);
    });

    it("returns an error when the related record is not found", async () => {
        mockDb.record.findFirst.mockResolvedValue(null);

        const result = await logActivity({
            recordId: 999,
            activityType: "task",
            subject: "Follow up",
        });

        expect(result).toEqual({
            success: false,
            error: "Related record not found.",
        });
        expect(mockDb.record.create).not.toHaveBeenCalled();
    });

    it("returns an error when the user lacks read permission on the related record's object", async () => {
        // First call: read permission on the related record's object (contact) -> false
        mockedCheckPermission.mockResolvedValueOnce(false);

        const result = await logActivity({
            recordId: 42,
            activityType: "email",
            subject: "Intro email",
        });

        expect(result).toEqual({
            success: false,
            error: "Access denied to related record.",
        });
        expect(mockDb.record.create).not.toHaveBeenCalled();
    });

    it("returns an error for an unrecognized activity type", async () => {
        const result = await logActivity({
            recordId: 42,
            activityType: "unknown_type",
            subject: "Something",
        });

        expect(result.success).toBe(false);
        expect(result.error).toMatch(/Invalid activity type/);
        expect(mockDb.record.create).not.toHaveBeenCalled();
    });
});

describe("getActivityTimeline", () => {
    beforeEach(() => {
        resetMockDb();
        setupDefaults();
    });

    it("returns activities ordered by activityDate DESC", async () => {
        const fieldMap = (activityDate: string) => ({
            fields: [
                { fieldDefId: 1001, fieldDef: { id: 1001, apiName: "name", type: "Text" }, valueText: "Call with prospect", valuePicklist: null },
                { fieldDefId: 1003, fieldDef: { id: 1003, apiName: "activity_date", type: "DateTime" }, valueDate: new Date(activityDate), valuePicklist: null },
                { fieldDefId: 1002, fieldDef: { id: 1002, apiName: "activity_type", type: "Picklist" }, valuePicklist: { id: 1, label: "Call" }, valueText: null },
                { fieldDefId: 1008, fieldDef: { id: 1008, apiName: "status", type: "Picklist" }, valuePicklist: { id: 10, label: "Completed" }, valueText: null },
                { fieldDefId: 1005, fieldDef: { id: 1005, apiName: "duration_minutes", type: "Number" }, valueNumber: 15, valuePicklist: null },
            ],
            createdBy: { name: "Alice" },
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        mockDb.record.findMany.mockResolvedValue([
            { id: 2, ...fieldMap("2025-01-14T08:00:00Z") },
            { id: 1, ...fieldMap("2025-01-15T10:00:00Z") },
            { id: 3, ...fieldMap("2025-01-13T12:00:00Z") },
        ]);

        const result = await getActivityTimeline(42);

        expect(result.success).toBe(true);
        if (!result.success) return;

        // Should be sorted by activityDate DESC
        expect(result.activities).toHaveLength(3);
        expect(result.activities![0].id).toBe(1); // 2025-01-15 (first)
        expect(result.activities![1].id).toBe(2); // 2025-01-14 (second)
        expect(result.activities![2].id).toBe(3); // 2025-01-13 (third)

        // Verify the query included isDeleted: false and fields filter
        const queryCall = mockDb.record.findMany.mock.calls[0][0];
        expect(queryCall.where.isDeleted).toBe(false);
        expect(queryCall.where.objectDefId).toBe(ACTIVITY_OBJ_DEF.id);
        expect(queryCall.where.fields.some.fieldDefId).toBe(1006); // related_record_id field def id
        expect(queryCall.where.fields.some.valueLookup).toBe(42);
    });

    it("excludes soft-deleted activities (isDeleted: false in query)", async () => {
        mockDb.record.findMany.mockResolvedValue([]);

        await getActivityTimeline(42);

        const queryCall = mockDb.record.findMany.mock.calls[0][0];
        expect(queryCall.where.isDeleted).toBe(false);
    });

    it("returns INSUFFICIENT_PERMISSIONS when user lacks both read and viewAll on activity", async () => {
        mockedCheckPermission.mockResolvedValue(false);

        const result = await getActivityTimeline(42);

        expect(result).toEqual({
            success: false,
            error: "INSUFFICIENT_PERMISSIONS",
        });
        expect(mockDb.record.findMany).not.toHaveBeenCalled();
    });

    it("returns empty list when no activities exist for the record", async () => {
        mockDb.record.findMany.mockResolvedValue([]);

        const result = await getActivityTimeline(999);

        expect(result.success).toBe(true);
        expect(result.activities).toEqual([]);
    });
});
