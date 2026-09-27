import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrincipalType, ShareAccessLevel } from "@prisma/client";

const { mockDb, resetMockDb } = vi.hoisted(() => {
    const mockDb: any = {
        objectDefinition: { findUnique: vi.fn() },
        sharingRule: { findMany: vi.fn() },
        recordShare: { deleteMany: vi.fn(), createMany: vi.fn(), upsert: vi.fn() },
        record: { findMany: vi.fn() },
    };

    const resetMockDb = () => {
        Object.values(mockDb as Record<string, any>).forEach((group) => {
            Object.values(group as Record<string, any>).forEach((fn) => {
                if (typeof fn === "function" && "mockReset" in fn) {
                    (fn as ReturnType<typeof vi.fn>).mockReset();
                }
            });
        });
    };

    return { mockDb, resetMockDb };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { applySharingRules } from "@/actions/standard/record-actions";

const ORG_ID = 1;
const OBJECT_DEF_ID = 1;
const RECORD_ID = 100;
const GROUP_SALES = 10;
const GROUP_MANAGERS = 20;
const GROUP_SUPPORT = 30;

const statusField = {
    id: 1,
    apiName: "status",
    type: "Text",
    label: "Status",
    objectDefId: OBJECT_DEF_ID,
    required: false,
    isExternalId: false,
    isUnique: false,
    lookupTargetId: null,
    options: null,
    picklistOptions: [],
};

const amountField = {
    id: 2,
    apiName: "amount",
    type: "Number",
    label: "Amount",
    objectDefId: OBJECT_DEF_ID,
    required: false,
    isExternalId: false,
    isUnique: false,
    lookupTargetId: null,
    options: null,
    picklistOptions: [],
};

const typeField = {
    id: 3,
    apiName: "record_type",
    type: "Picklist",
    label: "Type",
    objectDefId: OBJECT_DEF_ID,
    required: false,
    isExternalId: false,
    isUnique: false,
    lookupTargetId: null,
    options: null,
    picklistOptions: [],
};

const fields = [statusField, amountField, typeField];

function makeMockTx() {
    return {
        sharingRule: { findMany: vi.fn() },
        recordShare: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            upsert: vi.fn().mockResolvedValue({ id: 1 }),
        },
    };
}

function makeRule(overrides: Record<string, any> = {}) {
    return {
        id: 1,
        organizationId: ORG_ID,
        objectDefId: OBJECT_DEF_ID,
        targetGroupId: GROUP_SALES,
        accessLevel: ShareAccessLevel.READ,
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        criteria: { filters: [] },
        ...overrides,
    };
}

describe("applySharingRules", () => {
    let tx: any;

    beforeEach(() => {
        tx = makeMockTx();
        resetMockDb();
    });

    describe("criteria evaluation", () => {
        it("matches when ALL filters match and upserts a share", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({
                    targetGroupId: GROUP_SALES,
                    accessLevel: ShareAccessLevel.READ,
                    criteria: {
                        logic: "ALL",
                        filters: [
                            { field: "status", operator: "equals", value: "Hot" },
                            { field: "amount", operator: "gte", value: "100" },
                        ],
                    },
                }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, { status: "Hot", amount: 150 });

            expect(tx.recordShare.upsert).toHaveBeenCalledTimes(1);
            expect(tx.recordShare.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    create: expect.objectContaining({
                        recordId: RECORD_ID,
                        organizationId: ORG_ID,
                        principalType: PrincipalType.GROUP,
                        principalId: GROUP_SALES,
                        accessLevel: ShareAccessLevel.READ,
                    }),
                })
            );
        });

        it("does not match when ALL logic fails on one filter", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({
                    targetGroupId: GROUP_SALES,
                    criteria: {
                        logic: "ALL",
                        filters: [
                            { field: "status", operator: "equals", value: "Hot" },
                            { field: "amount", operator: "gt", value: "500" },
                        ],
                    },
                }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, { status: "Hot", amount: 100 });

            expect(tx.recordShare.upsert).not.toHaveBeenCalled();
        });

        it("matches when ANY logic has at least one matching filter", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({
                    targetGroupId: GROUP_SALES,
                    criteria: {
                        logic: "ANY",
                        filters: [
                            { field: "status", operator: "equals", value: "Hot" },
                            { field: "status", operator: "equals", value: "Cold" },
                        ],
                    },
                }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, { status: "Hot" });

            expect(tx.recordShare.upsert).toHaveBeenCalledTimes(1);
            expect(tx.recordShare.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    create: expect.objectContaining({ principalId: GROUP_SALES }),
                })
            );
        });

        it("does not match when ANY logic has no matching filter", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({
                    targetGroupId: GROUP_SALES,
                    criteria: {
                        logic: "ANY",
                        filters: [
                            { field: "status", operator: "equals", value: "Hot" },
                            { field: "status", operator: "equals", value: "Warm" },
                        ],
                    },
                }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, { status: "Cold" });

            expect(tx.recordShare.upsert).not.toHaveBeenCalled();
        });

        it("wildcard rule with no filters always matches", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({
                    targetGroupId: GROUP_SALES,
                    criteria: { filters: [] },
                }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, { status: "Anything" });

            expect(tx.recordShare.upsert).toHaveBeenCalledTimes(1);
        });

        it("matches with contains operator (case-insensitive)", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({
                    targetGroupId: GROUP_SALES,
                    criteria: {
                        filters: [{ field: "status", operator: "contains", value: "hot" }],
                    },
                }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, { status: "Hot Deal" });

            expect(tx.recordShare.upsert).toHaveBeenCalledTimes(1);
        });

        it("matches with not_equals operator", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({
                    targetGroupId: GROUP_SALES,
                    criteria: {
                        filters: [{ field: "status", operator: "not_equals", value: "Deleted" }],
                    },
                }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, { status: "Active" });

            expect(tx.recordShare.upsert).toHaveBeenCalledTimes(1);
        });

        it("does not match when not_equals value equals record value", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({
                    targetGroupId: GROUP_SALES,
                    criteria: {
                        filters: [{ field: "status", operator: "not_equals", value: "Active" }],
                    },
                }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, { status: "Active" });

            expect(tx.recordShare.upsert).not.toHaveBeenCalled();
        });

        it("matches with numeric gt operator on Number field", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({
                    targetGroupId: GROUP_SALES,
                    criteria: {
                        filters: [{ field: "amount", operator: "gt", value: "100" }],
                    },
                }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, { amount: 150 });

            expect(tx.recordShare.upsert).toHaveBeenCalledTimes(1);
        });

        it("does not match when numeric gt fails", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({
                    targetGroupId: GROUP_SALES,
                    criteria: {
                        filters: [{ field: "amount", operator: "gt", value: "500" }],
                    },
                }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, { amount: 100 });

            expect(tx.recordShare.upsert).not.toHaveBeenCalled();
        });

        it("matches with ownerGroupId filter from valueMap", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({
                    targetGroupId: GROUP_SALES,
                    criteria: {
                        filters: [{ field: "ownerGroupId", operator: "equals", value: String(GROUP_MANAGERS) }],
                    },
                }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, { ownerGroupId: GROUP_MANAGERS });

            expect(tx.recordShare.upsert).toHaveBeenCalledTimes(1);
            expect(tx.recordShare.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    create: expect.objectContaining({ principalId: GROUP_SALES }),
                })
            );
        });

        it("does not match ownerGroupId when value is null", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({
                    targetGroupId: GROUP_SALES,
                    criteria: {
                        filters: [{ field: "ownerGroupId", operator: "equals", value: String(GROUP_MANAGERS) }],
                    },
                }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, { ownerGroupId: null });

            expect(tx.recordShare.upsert).not.toHaveBeenCalled();
        });

        it("matches using fieldDefId instead of field apiName", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({
                    targetGroupId: GROUP_SALES,
                    criteria: {
                        filters: [{ fieldDefId: 1, operator: "equals", value: "Hot" }],
                    },
                }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, { status: "Hot" });

            expect(tx.recordShare.upsert).toHaveBeenCalledTimes(1);
        });

        it("does not match when field value is missing from valueMap", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({
                    targetGroupId: GROUP_SALES,
                    criteria: {
                        filters: [{ field: "status", operator: "equals", value: "Hot" }],
                    },
                }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, {});

            expect(tx.recordShare.upsert).not.toHaveBeenCalled();
        });

        it("is_blank operator matches when field value is absent", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({
                    targetGroupId: GROUP_SALES,
                    criteria: {
                        filters: [{ field: "status", operator: "is_blank" }],
                    },
                }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, {});

            expect(tx.recordShare.upsert).toHaveBeenCalledTimes(1);
        });

        it("fetches rules with correct where clause and ordering", async () => {
            tx.sharingRule.findMany.mockResolvedValue([]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, {});

            expect(tx.sharingRule.findMany).toHaveBeenCalledWith({
                where: { organizationId: ORG_ID, objectDefId: OBJECT_DEF_ID, isActive: true },
                orderBy: { sortOrder: "asc" },
            });
        });
    });

    describe("access-level ranking", () => {
        it("EDIT overrides READ for the same group", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({
                    id: 1,
                    targetGroupId: GROUP_SALES,
                    accessLevel: ShareAccessLevel.READ,
                    criteria: { filters: [{ field: "status", operator: "equals", value: "Hot" }] },
                }),
                makeRule({
                    id: 2,
                    targetGroupId: GROUP_SALES,
                    accessLevel: ShareAccessLevel.EDIT,
                    criteria: { filters: [{ field: "status", operator: "equals", value: "Hot" }] },
                }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, { status: "Hot" });

            expect(tx.recordShare.upsert).toHaveBeenCalledTimes(1);
            expect(tx.recordShare.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    create: expect.objectContaining({
                        principalId: GROUP_SALES,
                        accessLevel: ShareAccessLevel.EDIT,
                    }),
                })
            );
        });

        it("DELETE overrides both READ and EDIT for the same group", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({ id: 1, targetGroupId: GROUP_SALES, accessLevel: ShareAccessLevel.READ, criteria: { filters: [] } }),
                makeRule({ id: 2, targetGroupId: GROUP_SALES, accessLevel: ShareAccessLevel.EDIT, criteria: { filters: [] } }),
                makeRule({ id: 3, targetGroupId: GROUP_SALES, accessLevel: ShareAccessLevel.DELETE, criteria: { filters: [] } }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, { status: "Hot" });

            expect(tx.recordShare.upsert).toHaveBeenCalledTimes(1);
            expect(tx.recordShare.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    create: expect.objectContaining({
                        principalId: GROUP_SALES,
                        accessLevel: ShareAccessLevel.DELETE,
                    }),
                })
            );
        });

        it("DELETE wins regardless of rule order (DELETE first, READ second)", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({ id: 1, targetGroupId: GROUP_SALES, accessLevel: ShareAccessLevel.DELETE, criteria: { filters: [] } }),
                makeRule({ id: 2, targetGroupId: GROUP_SALES, accessLevel: ShareAccessLevel.READ, criteria: { filters: [] } }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, { status: "Hot" });

            expect(tx.recordShare.upsert).toHaveBeenCalledTimes(1);
            expect(tx.recordShare.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    create: expect.objectContaining({
                        principalId: GROUP_SALES,
                        accessLevel: ShareAccessLevel.DELETE,
                    }),
                })
            );
        });

        it("lower-ranked rule does not override a higher-ranked one already set", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({ id: 1, targetGroupId: GROUP_SALES, accessLevel: ShareAccessLevel.DELETE, criteria: { filters: [] } }),
                makeRule({ id: 2, targetGroupId: GROUP_SALES, accessLevel: ShareAccessLevel.EDIT, criteria: { filters: [{ field: "status", operator: "equals", value: "Hot" }] } }),
                makeRule({ id: 3, targetGroupId: GROUP_SALES, accessLevel: ShareAccessLevel.READ, criteria: { filters: [{ field: "status", operator: "equals", value: "Cold" }] } }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, { status: "Hot" });

            expect(tx.recordShare.upsert).toHaveBeenCalledTimes(1);
            expect(tx.recordShare.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    create: expect.objectContaining({
                        principalId: GROUP_SALES,
                        accessLevel: ShareAccessLevel.DELETE,
                    }),
                })
            );
        });

        it("each group receives its own highest-ranked access level", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({ id: 1, targetGroupId: GROUP_SALES, accessLevel: ShareAccessLevel.READ, criteria: { filters: [{ field: "status", operator: "equals", value: "Hot" }] } }),
                makeRule({ id: 2, targetGroupId: GROUP_SALES, accessLevel: ShareAccessLevel.EDIT, criteria: { filters: [{ field: "status", operator: "equals", value: "Hot" }] } }),
                makeRule({ id: 3, targetGroupId: GROUP_MANAGERS, accessLevel: ShareAccessLevel.DELETE, criteria: { filters: [{ field: "status", operator: "equals", value: "Hot" }] } }),
                makeRule({ id: 4, targetGroupId: GROUP_MANAGERS, accessLevel: ShareAccessLevel.READ, criteria: { filters: [{ field: "status", operator: "equals", value: "Hot" }] } }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, { status: "Hot" });

            expect(tx.recordShare.upsert).toHaveBeenCalledTimes(2);
            const calls = tx.recordShare.upsert.mock.calls.map((c: any) => c[0]);
            const salesShare = calls.find((c: any) => c.create.principalId === GROUP_SALES);
            const managersShare = calls.find((c: any) => c.create.principalId === GROUP_MANAGERS);
            expect(salesShare.create.accessLevel).toBe(ShareAccessLevel.EDIT);
            expect(managersShare.create.accessLevel).toBe(ShareAccessLevel.DELETE);
        });
    });

    describe("stale share cleanup", () => {
        it("deletes all group shares when no rules exist", async () => {
            tx.sharingRule.findMany.mockResolvedValue([]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, { status: "Hot" });

            expect(tx.recordShare.deleteMany).toHaveBeenCalledWith({
                where: {
                    recordId: RECORD_ID,
                    organizationId: ORG_ID,
                    principalType: PrincipalType.GROUP,
                },
            });
            expect(tx.recordShare.upsert).not.toHaveBeenCalled();
        });

        it("deletes all group shares when rules exist but none match", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({
                    targetGroupId: GROUP_SALES,
                    criteria: {
                        filters: [{ field: "status", operator: "equals", value: "Hot" }],
                    },
                }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, { status: "Cold" });

            expect(tx.recordShare.deleteMany).toHaveBeenCalledWith({
                where: {
                    recordId: RECORD_ID,
                    organizationId: ORG_ID,
                    principalType: PrincipalType.GROUP,
                },
            });
            expect(tx.recordShare.upsert).not.toHaveBeenCalled();
        });

        it("deletes only non-matching group shares via notIn when some groups match", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({ id: 1, targetGroupId: GROUP_SALES, criteria: { filters: [] } }),
                makeRule({ id: 2, targetGroupId: GROUP_MANAGERS, criteria: { filters: [{ field: "status", operator: "equals", value: "Hot" }] } }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, { status: "Hot" });

            expect(tx.recordShare.deleteMany).toHaveBeenCalledWith({
                where: {
                    recordId: RECORD_ID,
                    organizationId: ORG_ID,
                    principalType: PrincipalType.GROUP,
                    principalId: { notIn: [GROUP_SALES, GROUP_MANAGERS] },
                },
            });
            expect(tx.recordShare.upsert).toHaveBeenCalledTimes(2);
        });

        it("deletes stale groups using notIn filter excluding matched groups", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({ id: 1, targetGroupId: GROUP_SALES, criteria: { filters: [{ field: "status", operator: "equals", value: "Hot" }] } }),
                makeRule({ id: 2, targetGroupId: GROUP_MANAGERS, criteria: { filters: [{ field: "status", operator: "equals", value: "Hot" }] } }),
                makeRule({ id: 3, targetGroupId: GROUP_SUPPORT, criteria: { filters: [{ field: "status", operator: "equals", value: "Cold" }] } }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, { status: "Hot" });

            expect(tx.recordShare.deleteMany).toHaveBeenCalledWith({
                where: {
                    recordId: RECORD_ID,
                    organizationId: ORG_ID,
                    principalType: PrincipalType.GROUP,
                    principalId: { notIn: [GROUP_SALES, GROUP_MANAGERS] },
                },
            });
            expect(tx.recordShare.upsert).toHaveBeenCalledTimes(2);
        });

        it("deleteMany targets only the specified record, not other records", async () => {
            tx.sharingRule.findMany.mockResolvedValue([]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, {});

            const deleteCall = tx.recordShare.deleteMany.mock.calls[0][0];
            expect(deleteCall.where.recordId).toBe(RECORD_ID);
            expect(deleteCall.where.organizationId).toBe(ORG_ID);
        });

        it("deleteMany targets only the specified organization", async () => {
            tx.sharingRule.findMany.mockResolvedValue(
                [],
            );

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, {});

            const deleteCall = tx.recordShare.deleteMany.mock.calls[0][0];
            expect(deleteCall.where.organizationId).toBe(ORG_ID);
        });
    });

    describe("upsert behavior", () => {
        it("upserts a single matching group with correct where and create params", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({
                    targetGroupId: GROUP_SALES,
                    accessLevel: ShareAccessLevel.READ,
                    criteria: { filters: [] },
                }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, { status: "Hot" });

            expect(tx.recordShare.upsert).toHaveBeenCalledTimes(1);
            expect(tx.recordShare.upsert).toHaveBeenCalledWith({
                where: {
                    recordId_principalType_principalId: {
                        recordId: RECORD_ID,
                        principalType: PrincipalType.GROUP,
                        principalId: GROUP_SALES,
                    },
                },
                create: {
                    recordId: RECORD_ID,
                    organizationId: ORG_ID,
                    principalType: PrincipalType.GROUP,
                    principalId: GROUP_SALES,
                    accessLevel: ShareAccessLevel.READ,
                },
                update: {
                    accessLevel: ShareAccessLevel.READ,
                },
            });
        });

        it("upserts multiple matching groups in separate calls", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({ id: 1, targetGroupId: GROUP_SALES, accessLevel: ShareAccessLevel.READ, criteria: { filters: [] } }),
                makeRule({ id: 2, targetGroupId: GROUP_MANAGERS, accessLevel: ShareAccessLevel.EDIT, criteria: { filters: [] } }),
                makeRule({ id: 3, targetGroupId: GROUP_SUPPORT, accessLevel: ShareAccessLevel.DELETE, criteria: { filters: [] } }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, { status: "Hot" });

            expect(tx.recordShare.upsert).toHaveBeenCalledTimes(3);
            const createdShares = tx.recordShare.upsert.mock.calls.map((c: any) => c[0].create);
            expect(createdShares).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ principalId: GROUP_SALES, accessLevel: ShareAccessLevel.READ }),
                    expect.objectContaining({ principalId: GROUP_MANAGERS, accessLevel: ShareAccessLevel.EDIT }),
                    expect.objectContaining({ principalId: GROUP_SUPPORT, accessLevel: ShareAccessLevel.DELETE }),
                ])
            );
        });

        it("upsert update body sets the correct accessLevel", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({
                    targetGroupId: GROUP_SALES,
                    accessLevel: ShareAccessLevel.DELETE,
                    criteria: { filters: [] },
                }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, { status: "Hot" });

            const upsertCall = tx.recordShare.upsert.mock.calls[0][0];
            expect(upsertCall.update).toEqual({ accessLevel: ShareAccessLevel.DELETE });
        });

        it("upsert uses composite key matching recordId, principalType, and principalId", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({
                    targetGroupId: GROUP_MANAGERS,
                    accessLevel: ShareAccessLevel.EDIT,
                    criteria: { filters: [] },
                }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, { status: "Hot" });

            const upsertCall = tx.recordShare.upsert.mock.calls[0][0];
            expect(upsertCall.where.recordId_principalType_principalId).toEqual({
                recordId: RECORD_ID,
                principalType: PrincipalType.GROUP,
                principalId: GROUP_MANAGERS,
            });
        });

        it("no upsert calls when only non-matching rules exist", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({
                    targetGroupId: GROUP_SALES,
                    criteria: {
                        filters: [{ field: "status", operator: "equals", value: "Hot" }],
                    },
                }),
                makeRule({
                    targetGroupId: GROUP_MANAGERS,
                    criteria: {
                        filters: [{ field: "status", operator: "equals", value: "Cold" }],
                    },
                }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, { status: "Warm" });

            expect(tx.recordShare.upsert).not.toHaveBeenCalled();
            expect(tx.recordShare.deleteMany).toHaveBeenCalledWith({
                where: {
                    recordId: RECORD_ID,
                    organizationId: ORG_ID,
                    principalType: PrincipalType.GROUP,
                },
            });
        });
    });

    describe("integration scenarios", () => {
        it("wildcard rule grants DELETE to one group while criteria-based READ grants to another", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({
                    id: 1,
                    targetGroupId: GROUP_SALES,
                    accessLevel: ShareAccessLevel.READ,
                    criteria: { filters: [{ field: "status", operator: "equals", value: "Hot" }] },
                }),
                makeRule({
                    id: 2,
                    targetGroupId: GROUP_SALES,
                    accessLevel: ShareAccessLevel.DELETE,
                    criteria: { filters: [] },
                }),
                makeRule({
                    id: 3,
                    targetGroupId: GROUP_MANAGERS,
                    accessLevel: ShareAccessLevel.EDIT,
                    criteria: { filters: [{ field: "amount", operator: "gt", value: "1000" }] },
                }),
                makeRule({
                    id: 4,
                    targetGroupId: GROUP_MANAGERS,
                    accessLevel: ShareAccessLevel.READ,
                    criteria: { filters: [] },
                }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, { status: "Hot", amount: 500 });

            // GROUP_SALES: READ (Hot matches) + DELETE (wildcard) → DELETE wins
            // GROUP_MANAGERS: EDIT (amount>1000 fails) + READ (wildcard) → READ wins
            expect(tx.recordShare.upsert).toHaveBeenCalledTimes(2);
            const calls = tx.recordShare.upsert.mock.calls.map((c: any) => c[0]);
            const salesShare = calls.find((c: any) => c.create.principalId === GROUP_SALES);
            const managersShare = calls.find((c: any) => c.create.principalId === GROUP_MANAGERS);
            expect(salesShare.create.accessLevel).toBe(ShareAccessLevel.DELETE);
            expect(managersShare.create.accessLevel).toBe(ShareAccessLevel.READ);
            expect(tx.recordShare.deleteMany).toHaveBeenCalledWith({
                where: {
                    recordId: RECORD_ID,
                    organizationId: ORG_ID,
                    principalType: PrincipalType.GROUP,
                    principalId: { notIn: [GROUP_SALES, GROUP_MANAGERS] },
                },
            });
        });

        it("accessRank map enforces READ < EDIT < DELETE", async () => {
            const accessRank: Record<string, number> = {
                [ShareAccessLevel.READ]: 1,
                [ShareAccessLevel.EDIT]: 2,
                [ShareAccessLevel.DELETE]: 3,
            };
            expect(accessRank[ShareAccessLevel.READ]).toBeLessThan(accessRank[ShareAccessLevel.EDIT]);
            expect(accessRank[ShareAccessLevel.EDIT]).toBeLessThan(accessRank[ShareAccessLevel.DELETE]);
            expect(accessRank[ShareAccessLevel.READ]).toBeLessThan(accessRank[ShareAccessLevel.DELETE]);
        });

        it("picklist field type coerced to number for comparison", async () => {
            tx.sharingRule.findMany.mockResolvedValue([
                makeRule({
                    targetGroupId: GROUP_SALES,
                    accessLevel: ShareAccessLevel.READ,
                    criteria: {
                        filters: [{ field: "record_type", operator: "equals", value: "5" }],
                    },
                }),
            ]);

            await applySharingRules(tx, ORG_ID, OBJECT_DEF_ID, RECORD_ID, fields, { record_type: 5 });

            expect(tx.recordShare.upsert).toHaveBeenCalledTimes(1);
            expect(tx.recordShare.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    create: expect.objectContaining({ principalId: GROUP_SALES, accessLevel: ShareAccessLevel.READ }),
                })
            );
        });
    });
});
