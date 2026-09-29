import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb, resetMockDb, mockAuth } = vi.hoisted(() => {
    const mockDb: any = {
        record: {
            findFirst: vi.fn(),
            findMany: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        user: { findUnique: vi.fn(), findFirst: vi.fn() },
        objectDefinition: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
        fieldDefinition: { findMany: vi.fn() },
        fieldData: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            createMany: vi.fn(),
            upsert: vi.fn(),
            update: vi.fn(),
            create: vi.fn(),
            deleteMany: vi.fn(),
            updateMany: vi.fn(),
        },
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
        mockDb.record.findUnique.mockReset();
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
        mockDb.fieldData.update.mockReset();
        mockDb.fieldData.create.mockReset();
        mockDb.fieldData.deleteMany.mockReset();
        mockDb.fieldData.updateMany.mockReset();
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

    return { mockDb, resetMockDb, mockAuth: vi.fn() };
});

vi.mock("@/auth", () => ({ auth: mockAuth, assertAuthRuntimeEnv: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/permissions", () => ({
    checkPermission: vi.fn(),
}));
vi.mock("@/lib/record-access", () => ({
    getUserQueueIds: vi.fn().mockResolvedValue([]),
    getUserAccessContext: vi.fn().mockResolvedValue({ userId: 1, organizationId: 1, queueIds: [], userGroupId: null, permissionSetIds: [] }),
    buildRecordAccessFilter: vi.fn().mockReturnValue({}),
}));
vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
}));

import { checkPermission } from "@/lib/permissions";
import { getUserQueueIds } from "@/lib/record-access";
import { updateOpportunityStage, getPipelineReport } from "@/actions/standard/opportunity-actions";

const mockedCheckPermission = checkPermission as unknown as Mock;
const mockedGetUserQueueIds = getUserQueueIds as unknown as Mock;

// Mock field definitions for opportunity object
const STAGE_OPT = { id: 10, label: "Lead", apiName: "lead", sortOrder: 0, isActive: true };
const STAGE_OPT_QUAL = { id: 20, label: "Qualified", apiName: "qualified", sortOrder: 1, isActive: true };
const STAGE_OPT_DEMO = { id: 30, label: "Demo", apiName: "demo", sortOrder: 2, isActive: true };
const STAGE_OPT_PROP = { id: 40, label: "Proposal", apiName: "proposal", sortOrder: 3, isActive: true };
const STAGE_OPT_NEG = { id: 50, label: "Negotiation", apiName: "negotiation", sortOrder: 4, isActive: true };
const STAGE_OPT_WON = { id: 60, label: "Won", apiName: "won", sortOrder: 5, isActive: true };
const STAGE_OPT_LOST = { id: 70, label: "Lost", apiName: "lost", sortOrder: 6, isActive: true };

const FORECAST_OPT_PIPELINE = { id: 100, label: "Pipeline", apiName: "pipeline", sortOrder: 0, isActive: true };
const FORECAST_OPT_BEST = { id: 110, label: "Best Case", apiName: "best_case", sortOrder: 1, isActive: true };
const FORECAST_OPT_COMMIT = { id: 120, label: "Commit", apiName: "commit", sortOrder: 2, isActive: true };
const FORECAST_OPT_WON = { id: 130, label: "Closed Won", apiName: "closed_won", sortOrder: 3, isActive: true };

const opportunityObjectDef = {
    id: 3,
    apiName: "opportunity",
    label: "Opportunity",
    fields: [
        { id: 1001, apiName: "name", label: "Opportunity Name", type: "Text", required: true, picklistOptions: [] },
        { id: 1002, apiName: "stage", label: "Stage", type: "Picklist", required: true, picklistOptions: [
            STAGE_OPT, STAGE_OPT_QUAL, STAGE_OPT_DEMO, STAGE_OPT_PROP, STAGE_OPT_NEG, STAGE_OPT_WON, STAGE_OPT_LOST,
        ] },
        { id: 1003, apiName: "amount", label: "Amount", type: "Number", picklistOptions: [] },
        { id: 1004, apiName: "probability", label: "Probability (%)", type: "Number", picklistOptions: [] },
        { id: 1005, apiName: "expected_revenue", label: "Expected Revenue", type: "Number", picklistOptions: [] },
        { id: 1006, apiName: "forecast_category", label: "Forecast Category", type: "Picklist", required: true, picklistOptions: [
            FORECAST_OPT_PIPELINE, FORECAST_OPT_BEST, FORECAST_OPT_COMMIT, FORECAST_OPT_WON,
        ] },
        { id: 1007, apiName: "close_date", label: "Close Date", type: "Date", picklistOptions: [] },
    ],
};

function mockOpportunityRecord(opts?: { stage?: any; amount?: any; closeDate?: any }) {
    const stageOpt = opts?.stage ?? STAGE_OPT;
    const fields: any[] = [];
    const addField = (fdId: number, apiName: string, type: string, value: any) => {
        fields.push({
            fieldDefId: fdId,
            fieldDef: { id: fdId, apiName, label: apiName, type, picklistOptions: [] },
            ...value,
        });
    };
    addField(1001, "name", "Text", { valueText: "Test Opp" });
    addField(1002, "stage", "Picklist", { valuePicklistId: stageOpt.id, valuePicklist: stageOpt, valueText: null });
    addField(1003, "amount", "Number", { valueNumber: opts?.amount ?? 1000, valueText: String(opts?.amount ?? 1000) });
    addField(1004, "probability", "Number", { valueNumber: 10, valueText: "10" });
    addField(1005, "expected_revenue", "Number", { valueNumber: 100, valueText: "100" });
    addField(1006, "forecast_category", "Picklist", { valuePicklistId: FORECAST_OPT_PIPELINE.id, valuePicklist: FORECAST_OPT_PIPELINE, valueText: null });
    if (opts?.closeDate) {
        addField(1007, "close_date", "Date", { valueDate: opts.closeDate, valueText: "2025-01-15" });
    }
    return {
        id: 1,
        organizationId: 1,
        isDeleted: false,
        objectDefId: 3,
        objectDef: opportunityObjectDef,
        fields,
    };
}

function loginOrgA() {
    mockAuth.mockResolvedValue({
        user: { id: "1", organizationId: 1, userType: "admin" },
    });
}

function allowAll() {
    mockedCheckPermission.mockResolvedValue(true);
}

describe("updateOpportunityStage", () => {
    beforeEach(() => {
        resetMockDb();
        mockedCheckPermission.mockReset();
        mockAuth.mockReset();
        mockedGetUserQueueIds.mockReset();
        mockedGetUserQueueIds.mockResolvedValue([]);
        loginOrgA();
        allowAll();
        mockDb.user.findUnique.mockResolvedValue({ groupId: null });
    });

    it("success: computes probability, forecast_category, expected_revenue and updates field data", async () => {
        const record = mockOpportunityRecord({ stage: STAGE_OPT });
        mockDb.record.findFirst.mockResolvedValue(record);

        const result = await updateOpportunityStage(1, "Proposal");

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.probability).toBe(75);
            expect(result.forecastCategory).toBe("Best Case");
            expect(result.expectedRevenue).toBe(750);
            expect(result.oldStage).toBe("Lead");
            expect(result.newStage).toBe("Proposal");
        }

        // tx.record.update should NOT be called (stage is in fieldData, not standard record fields)
        // But tx.fieldData.upsert should be called for stage, probability, forecast_category, expected_revenue
        const upsertCalls = mockDb.fieldData.upsert.mock.calls;
        expect(upsertCalls.length).toBeGreaterThanOrEqual(4);

        // Check stage field upsert
        const stageUpsert = upsertCalls.find((c: any) => c[0].create.valuePicklistId === 40);
        expect(stageUpsert).toBeDefined();
        expect(stageUpsert[0].update.valuePicklistId).toBe(40);

        // Check probability field upsert (valueNumber may be Prisma.Decimal)
        const probUpsert = upsertCalls.find((c: any) => {
            const vn = c[0].create.valueNumber;
            return vn !== null && (Number(vn) === 75 || vn === 75);
        });
        expect(probUpsert).toBeDefined();

        // Check forecast_category field upsert
        const forecastUpsert = upsertCalls.find((c: any) => c[0].create.valuePicklistId === 110);
        expect(forecastUpsert).toBeDefined();
        expect(forecastUpsert[0].update.valuePicklistId).toBe(110);

        // Check expected_revenue field upsert (valueNumber may be Prisma.Decimal)
        const revenueUpsert = upsertCalls.find((c: any) => {
            const vn = c[0].create.valueNumber;
            return vn !== null && (Number(vn) === 750 || vn === 750);
        });
        expect(revenueUpsert).toBeDefined();
    });

    it("success: handles Won stage with 100% probability", async () => {
        const record = mockOpportunityRecord({ stage: STAGE_OPT_NEG });
        mockDb.record.findFirst.mockResolvedValue(record);

        const result = await updateOpportunityStage(1, "Won");

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.probability).toBe(100);
            expect(result.forecastCategory).toBe("Closed Won");
            expect(result.expectedRevenue).toBe(1000);
            expect(result.oldStage).toBe("Negotiation");
            expect(result.newStage).toBe("Won");
        }
    });

    it("success: handles Lost stage with 0% probability", async () => {
        const record = mockOpportunityRecord({ stage: STAGE_OPT_DEMO });
        mockDb.record.findFirst.mockResolvedValue(record);

        const result = await updateOpportunityStage(1, "Lost");

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.probability).toBe(0);
            expect(result.forecastCategory).toBe("Pipeline");
            expect(result.expectedRevenue).toBe(0);
            expect(result.oldStage).toBe("Demo");
            expect(result.newStage).toBe("Lost");
        }
    });

    it("returns Insufficient permissions when edit permission is denied", async () => {
        const record = mockOpportunityRecord({ stage: STAGE_OPT });
        mockDb.record.findFirst.mockResolvedValue(record);
        mockedCheckPermission.mockResolvedValueOnce(false);

        const result = await updateOpportunityStage(1, "Proposal");

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBe("Insufficient permissions");
        }
        expect(mockDb.fieldData.upsert).not.toHaveBeenCalled();
    });

    it("returns Record not found when record does not exist", async () => {
        mockDb.record.findFirst.mockResolvedValue(null);

        const result = await updateOpportunityStage(999, "Proposal");

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBe("Record not found");
        }
    });

    it("returns error for invalid stage", async () => {
        const record = mockOpportunityRecord({ stage: STAGE_OPT });
        mockDb.record.findFirst.mockResolvedValue(record);

        const result = await updateOpportunityStage(1, "NonExistentStage");

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBe("Invalid stage: NonExistentStage");
        }
        expect(mockDb.fieldData.upsert).not.toHaveBeenCalled();
    });

    it("computes expected_revenue correctly with decimal amount", async () => {
        const record = mockOpportunityRecord({ stage: STAGE_OPT, amount: 3333.33 });
        mockDb.record.findFirst.mockResolvedValue(record);

        const result = await updateOpportunityStage(1, "Proposal");

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.expectedRevenue).toBe(2500); // 3333.33 * 75 / 100 = 2499.9975 -> rounds to 2500
            // Actually computeExpectedRevenue rounds: Math.round(3333.33 * 75 / 100) = Math.round(2499.9975) = 2500
        }
    });
});

describe("getPipelineReport", () => {
    beforeEach(() => {
        resetMockDb();
        mockedCheckPermission.mockReset();
        mockAuth.mockReset();
        mockedGetUserQueueIds.mockReset();
        mockedGetUserQueueIds.mockResolvedValue([]);
        loginOrgA();
        allowAll();
        mockDb.user.findUnique.mockResolvedValue({ groupId: null });
    });

    it("returns rollup by stage and forecast category", async () => {
        mockDb.objectDefinition.findUnique.mockResolvedValue(opportunityObjectDef);
        mockDb.record.findMany.mockResolvedValue([
            mockOpportunityRecord({ stage: STAGE_OPT_LOST, amount: 2000 }),
            mockOpportunityRecord({ stage: STAGE_OPT_WON, amount: 5000 }),
            mockOpportunityRecord({ stage: STAGE_OPT_PROP, amount: 3000 }),
        ]);

        const result = await getPipelineReport();

        expect(result.success).toBe(true);
        if (result.success) {
            // Stages rollup
            const proposalStage = result.stages.find(s => s.stage === "Lost");
            expect(proposalStage).toMatchObject({ stage: "Lost", count: 1, probability: 0 });
            const wonStage = result.stages.find(s => s.stage === "Won");
            expect(wonStage).toMatchObject({ stage: "Won", count: 1, probability: 100 });
            const propStage = result.stages.find(s => s.stage === "Proposal");
            expect(propStage).toMatchObject({ stage: "Proposal", count: 1, probability: 75 });

            // Forecast categories rollup
            const closedWon = result.forecast.find(f => f.category === "Closed Won");
            expect(closedWon).toMatchObject({ category: "Closed Won", count: 1 });
            const pipeline = result.forecast.find(f => f.category === "Pipeline");
            expect(pipeline).toMatchObject({ category: "Pipeline", count: 1 });

            // Summary
            expect(result.summary.totalCount).toBe(3);
            expect(result.summary.totalAmount).toBe(10000);
            expect(result.summary.weightedTotal).toBe(5000 + 0 + 2250); // 5000 + 0 + 2250 = 7250
        }
    });

    it("excludes soft-deleted records (isDeleted: false in query)", async () => {
        mockDb.objectDefinition.findUnique.mockResolvedValue(opportunityObjectDef);
        mockDb.record.findMany.mockResolvedValue([]);

        await getPipelineReport();

        expect(mockDb.record.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    isDeleted: false,
                }),
            })
        );
    });

    it("handles empty result set", async () => {
        mockDb.objectDefinition.findUnique.mockResolvedValue(opportunityObjectDef);
        mockDb.record.findMany.mockResolvedValue([]);

        const result = await getPipelineReport();

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.stages).toEqual([]);
            expect(result.forecast).toEqual([]);
            expect(result.summary).toEqual({
                totalCount: 0,
                totalAmount: 0,
                totalExpectedRevenue: 0,
                weightedTotal: 0,
            });
        }
    });

    it("returns Insufficient permissions when read permission is denied", async () => {
        mockedCheckPermission.mockResolvedValueOnce(false);
        mockedCheckPermission.mockResolvedValueOnce(false);

        const result = await getPipelineReport();

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBe("Insufficient permissions");
        }
    });
});
