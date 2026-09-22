import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrincipalType, ShareAccessLevel } from "@prisma/client";

const { mockDb, resetMockDb } = vi.hoisted(() => {
    const mockDb: any = {
        objectDefinition: {
            findUnique: vi.fn(),
        },
        sharingRule: {
            findMany: vi.fn(),
        },
        recordShare: {
            deleteMany: vi.fn(),
            createMany: vi.fn(),
        },
        record: {
            findMany: vi.fn(),
        },
    };

    const resetMockDb = () => {
        Object.values(mockDb as Record<string, any>).forEach((group) => {
            Object.values(group).forEach((fn) => {
                if (typeof fn === "function" && "mockReset" in fn) {
                    (fn as ReturnType<typeof vi.fn>).mockReset();
                }
            });
        });
    };

    return { mockDb, resetMockDb };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));

import { recomputeSharingRulesForObject } from "@/lib/sharing-rule-recompute";

const statusFieldDef = {
    id: 1,
    apiName: "status",
    type: "Text",
    label: "Status",
    objectDefId: 1,
    required: false,
    isExternalId: false,
    isUnique: false,
    lookupTargetId: null,
    options: null,
    picklistOptions: [],
};

const objectDef = {
    id: 1,
    organizationId: 1,
    fields: [statusFieldDef],
};

function makeFieldData(overrides: Record<string, any> = {}) {
    return {
        id: 1,
        fieldDefId: 1,
        fieldDef: statusFieldDef,
        valueText: null,
        valueNumber: null,
        valueDate: null,
        valueBoolean: null,
        valueLookup: null,
        valuePicklistId: null,
        ...overrides,
    };
}

function makeRecord(overrides: Record<string, any> = {}) {
    return {
        id: 1,
        name: "Test Record",
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        updatedAt: new Date("2024-01-01T00:00:00.000Z"),
        ownerId: 1,
        owner: { groupId: 5 },
        fields: [],
        ...overrides,
    };
}

describe("recomputeSharingRulesForObject", () => {
    beforeEach(() => {
        resetMockDb();
    });

    it("clears stale shares and creates none when no rules exist", async () => {
        mockDb.objectDefinition.findUnique.mockResolvedValue(objectDef);
        mockDb.sharingRule.findMany.mockResolvedValue([]);
        mockDb.recordShare.deleteMany.mockResolvedValue({ count: 3 });

        const result = await recomputeSharingRulesForObject({
            organizationId: 1,
            objectDefId: 1,
        });

        expect(mockDb.recordShare.deleteMany).toHaveBeenCalledWith({
            where: {
                organizationId: 1,
                principalType: PrincipalType.GROUP,
                record: { objectDefId: 1 },
            },
        });
        expect(mockDb.recordShare.createMany).not.toHaveBeenCalled();
        expect(result).toEqual({ deleted: 3, inserted: 0 });
    });

    it("creates RecordShare entries for records matching criteria", async () => {
        mockDb.objectDefinition.findUnique.mockResolvedValue(objectDef);
        mockDb.sharingRule.findMany.mockResolvedValue([
            {
                id: 1,
                organizationId: 1,
                objectDefId: 1,
                targetGroupId: 10,
                accessLevel: ShareAccessLevel.READ,
                isActive: true,
                sortOrder: 0,
                criteria: {
                    logic: "ALL",
                    filters: [{ field: "status", operator: "equals", value: "Hot" }],
                },
            },
        ]);
        mockDb.recordShare.deleteMany.mockResolvedValue({ count: 0 });
        mockDb.recordShare.createMany.mockResolvedValue({ count: 1 });
        mockDb.record.findMany
            .mockResolvedValueOnce([
                makeRecord({
                    id: 1,
                    name: "Hot Deal",
                    fields: [makeFieldData({ id: 1, valueText: "Hot" })],
                }),
                makeRecord({
                    id: 2,
                    name: "Cold Deal",
                    fields: [makeFieldData({ id: 2, valueText: "Cold" })],
                }),
            ])
            .mockResolvedValueOnce([]);

        const result = await recomputeSharingRulesForObject({
            organizationId: 1,
            objectDefId: 1,
        });

        expect(mockDb.recordShare.createMany).toHaveBeenCalledTimes(1);
        const createCall = mockDb.recordShare.createMany.mock.calls[0][0];
        expect(createCall.data).toHaveLength(1);
        expect(createCall.data[0]).toEqual({
            recordId: 1,
            organizationId: 1,
            principalType: PrincipalType.GROUP,
            principalId: 10,
            accessLevel: ShareAccessLevel.READ,
        });
        expect(result).toEqual({ deleted: 0, inserted: 1 });
    });

    it("highest access level wins when multiple rules match same group", async () => {
        mockDb.objectDefinition.findUnique.mockResolvedValue(objectDef);
        mockDb.sharingRule.findMany.mockResolvedValue([
            {
                id: 1,
                organizationId: 1,
                objectDefId: 1,
                targetGroupId: 5,
                accessLevel: ShareAccessLevel.READ,
                isActive: true,
                sortOrder: 0,
                criteria: {
                    logic: "ALL",
                    filters: [{ field: "status", operator: "equals", value: "Hot" }],
                },
            },
            {
                id: 2,
                organizationId: 1,
                objectDefId: 1,
                targetGroupId: 5,
                accessLevel: ShareAccessLevel.EDIT,
                isActive: true,
                sortOrder: 1,
                criteria: { filters: [] },
            },
        ]);
        mockDb.recordShare.deleteMany.mockResolvedValue({ count: 0 });
        mockDb.recordShare.createMany.mockResolvedValue({ count: 1 });
        mockDb.record.findMany
            .mockResolvedValueOnce([
                makeRecord({
                    id: 1,
                    name: "Hot Deal",
                    fields: [makeFieldData({ id: 1, valueText: "Hot" })],
                }),
            ])
            .mockResolvedValueOnce([]);

        const result = await recomputeSharingRulesForObject({
            organizationId: 1,
            objectDefId: 1,
        });

        expect(mockDb.recordShare.createMany).toHaveBeenCalledTimes(1);
        const createCall = mockDb.recordShare.createMany.mock.calls[0][0];
        expect(createCall.data).toHaveLength(1);
        expect(createCall.data[0].accessLevel).toBe(ShareAccessLevel.EDIT);
        expect(createCall.data[0].principalId).toBe(5);
        expect(result).toEqual({ deleted: 0, inserted: 1 });
    });

    it("no records match criteria → stale shares cleared, no new shares", async () => {
        mockDb.objectDefinition.findUnique.mockResolvedValue(objectDef);
        mockDb.sharingRule.findMany.mockResolvedValue([
            {
                id: 1,
                organizationId: 1,
                objectDefId: 1,
                targetGroupId: 10,
                accessLevel: ShareAccessLevel.READ,
                isActive: true,
                sortOrder: 0,
                criteria: {
                    logic: "ALL",
                    filters: [{ field: "status", operator: "equals", value: "Hot" }],
                },
            },
        ]);
        mockDb.recordShare.deleteMany.mockResolvedValue({ count: 0 });
        mockDb.record.findMany
            .mockResolvedValueOnce([
                makeRecord({
                    id: 1,
                    name: "Cold Deal",
                    fields: [makeFieldData({ id: 1, valueText: "Cold" })],
                }),
            ])
            .mockResolvedValueOnce([]);

        const result = await recomputeSharingRulesForObject({
            organizationId: 1,
            objectDefId: 1,
        });

        expect(mockDb.recordShare.deleteMany).toHaveBeenCalledTimes(1);
        expect(mockDb.recordShare.createMany).not.toHaveBeenCalled();
        expect(result).toEqual({ deleted: 0, inserted: 0 });
    });

    it("processes all records across multiple batches", async () => {
        mockDb.objectDefinition.findUnique.mockResolvedValue(objectDef);
        mockDb.sharingRule.findMany.mockResolvedValue([
            {
                id: 1,
                organizationId: 1,
                objectDefId: 1,
                targetGroupId: 10,
                accessLevel: ShareAccessLevel.READ,
                isActive: true,
                sortOrder: 0,
                criteria: { filters: [] },
            },
        ]);
        mockDb.recordShare.deleteMany.mockResolvedValue({ count: 0 });
        mockDb.recordShare.createMany.mockResolvedValue({ count: 2 });
        mockDb.record.findMany
            .mockResolvedValueOnce([
                makeRecord({
                    id: 1,
                    name: "Record One",
                    fields: [makeFieldData({ id: 1, valueText: "Hot" })],
                }),
                makeRecord({
                    id: 2,
                    name: "Record Two",
                    fields: [makeFieldData({ id: 2, valueText: "Cold" })],
                }),
            ])
            .mockResolvedValueOnce([]);

        const result = await recomputeSharingRulesForObject({
            organizationId: 1,
            objectDefId: 1,
        });

        expect(mockDb.record.findMany).toHaveBeenCalledTimes(2);
        expect(mockDb.recordShare.createMany).toHaveBeenCalledTimes(1);
        const createCall = mockDb.recordShare.createMany.mock.calls[0][0];
        expect(createCall.data).toHaveLength(2);
        expect(createCall.data[0].recordId).toBe(1);
        expect(createCall.data[1].recordId).toBe(2);
        expect(result).toEqual({ deleted: 0, inserted: 2 });
    });
});
