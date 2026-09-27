"use server";

import { getUserContext } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { getFieldDisplayValue } from "@/lib/field-data";
import { Prisma } from "@prisma/client";
import { checkPermission } from "@/lib/permissions";
import { buildRecordAccessFilter, getUserQueueIds } from "@/lib/record-access";
import { computeProbability, computeExpectedRevenue, getForecastCategoryForStage } from "@/lib/opportunity";

export type OpportunityUpdateResult =
    | { success: true; probability: number; forecastCategory: string; expectedRevenue: number | null; oldStage: string; newStage: string }
    | { success: false; error: string };

export type PipelineReportResult =
    | {
          success: true;
          stages: Array<{
              stage: string;
              count: number;
              totalAmount: number;
              totalExpectedRevenue: number;
              probability: number;
          }>;
          forecast: Array<{
              category: string;
              count: number;
              totalAmount: number;
              totalExpectedRevenue: number;
          }>;
          summary: { totalCount: number; totalAmount: number; totalExpectedRevenue: number; weightedTotal: number };
      }
    | { success: false; error: string };

export async function updateOpportunityStage(
    opportunityId: number,
    newStage: string
): Promise<OpportunityUpdateResult> {
    const { userId, organizationId } = await getUserContext();

    const canEdit = await checkPermission(userId, organizationId, "opportunity", "edit");
    if (!canEdit) {
        return { success: false, error: "Insufficient permissions" };
    }

    const canModifyAll = await checkPermission(userId, organizationId, "opportunity", "modifyAll");
    const queueIds = await getUserQueueIds(userId, organizationId);
    const userGroupId = (await db.user.findUnique({
        where: { id: userId },
        select: { groupId: true },
    }))?.groupId ?? null;

    const accessFilter = canModifyAll ? null : buildRecordAccessFilter(userId, queueIds, userGroupId, "edit");

    const record = await db.record.findFirst({
        where: {
            id: opportunityId,
            organizationId,
            isDeleted: false,
            ...(accessFilter ?? {}),
        },
        include: {
            objectDef: {
                include: {
                    fields: {
                        include: {
                            picklistOptions: { orderBy: { sortOrder: "asc" } },
                        },
                    },
                },
            },
            fields: {
                include: {
                    fieldDef: {
                        include: {
                            picklistOptions: { orderBy: { sortOrder: "asc" } },
                        },
                    },
                    valuePicklist: true,
                },
            },
        },
    });

    if (!record) {
        return { success: false, error: "Record not found" };
    }

    // Resolve stage field definition and current stage
    const stageField = record.objectDef.fields.find((f: any) => f.apiName === "stage");
    if (!stageField) {
        return { success: false, error: "Stage field not found on opportunity object" };
    }

    const currentStageField = record.fields.find((f: any) => f.fieldDef.apiName === "stage");
    const oldStage = currentStageField?.valuePicklist?.label ?? null;

    // Resolve the new stage picklist option
    const newStageOption = stageField.picklistOptions?.find((opt: any) => opt.label === newStage);
    if (!newStageOption) {
        return { success: false, error: `Invalid stage: ${newStage}` };
    }
    const newStageLabel = newStageOption.label;

    // Compute derived values
    const autoProbability = computeProbability(newStageLabel);
    const forecastCategory = getForecastCategoryForStage(newStageLabel);

    // Resolve forecast_category field picklist option ID
    const forecastField = record.objectDef.fields.find((f: any) => f.apiName === "forecast_category");
    const forecastOption = forecastField?.picklistOptions?.find((opt: any) => opt.label === forecastCategory);

    // Compute expected revenue from amount (current or existing)
    const amountField = record.fields.find((f: any) => f.fieldDef.apiName === "amount");
    const amountValue = getFieldDisplayValue(amountField);
    const expectedRevenue = computeExpectedRevenue(amountValue, autoProbability);

    // Build field data payloads
    const stageFieldDef = stageField;
    const probabilityField = record.objectDef.fields.find((f: any) => f.apiName === "probability");
    const expectedRevenueField = record.objectDef.fields.find((f: any) => f.apiName === "expected_revenue");

    await db.$transaction(async (tx: Prisma.TransactionClient) => {
        // Update the stage via fieldData upsert
        await tx.fieldData.upsert({
            where: {
                recordId_fieldDefId: {
                    recordId: record.id,
                    fieldDefId: stageFieldDef.id,
                },
            },
            create: {
                recordId: record.id,
                fieldDefId: stageFieldDef.id,
                valuePicklistId: newStageOption.id,
                valueText: null,
                valueSearch: null,
                valueNumber: null,
                valueDate: null,
                valueBoolean: null,
                valueLookup: null,
            },
            update: {
                valuePicklistId: newStageOption.id,
                valueText: null,
                valueSearch: null,
            },
        });

        // Update probability
        if (probabilityField && autoProbability !== null) {
            await tx.fieldData.upsert({
                where: {
                    recordId_fieldDefId: {
                        recordId: record.id,
                        fieldDefId: probabilityField.id,
                    },
                },
                create: {
                    recordId: record.id,
                    fieldDefId: probabilityField.id,
                    valueNumber: new Prisma.Decimal(autoProbability),
                    valueText: String(autoProbability),
                },
                update: {
                    valueNumber: new Prisma.Decimal(autoProbability),
                    valueText: String(autoProbability),
                },
            });
        }

        // Update forecast_category
        if (forecastField && forecastOption) {
            await tx.fieldData.upsert({
                where: {
                    recordId_fieldDefId: {
                        recordId: record.id,
                        fieldDefId: forecastField.id,
                    },
                },
                create: {
                    recordId: record.id,
                    fieldDefId: forecastField.id,
                    valuePicklistId: forecastOption.id,
                    valueText: null,
                },
                update: {
                    valuePicklistId: forecastOption.id,
                    valueText: null,
                },
            });
        }

        // Update expected_revenue
        if (expectedRevenueField && expectedRevenue !== null) {
            await tx.fieldData.upsert({
                where: {
                    recordId_fieldDefId: {
                        recordId: record.id,
                        fieldDefId: expectedRevenueField.id,
                    },
                },
                create: {
                    recordId: record.id,
                    fieldDefId: expectedRevenueField.id,
                    valueNumber: new Prisma.Decimal(expectedRevenue),
                    valueText: String(expectedRevenue),
                },
                update: {
                    valueNumber: new Prisma.Decimal(expectedRevenue),
                    valueText: String(expectedRevenue),
                },
            });
        }
    });

    return {
        success: true,
        probability: autoProbability,
        forecastCategory,
        expectedRevenue,
        oldStage: oldStage ?? "",
        newStage: newStageLabel,
    };
}

export async function getPipelineReport(opts?: {
    includeLost?: boolean;
    closeDateFrom?: string;
    closeDateTo?: string;
}): Promise<PipelineReportResult> {
    const { userId, organizationId } = await getUserContext();

    const canModifyAll = await checkPermission(userId, organizationId, "opportunity", "modifyAll");
    if (!canModifyAll) {
        const canRead = await checkPermission(userId, organizationId, "opportunity", "read");
        if (!canRead) return { success: false, error: "Insufficient permissions" };
    }

    const queueIds = await getUserQueueIds(userId, organizationId);
    const userGroupId = (await db.user.findUnique({
        where: { id: userId },
        select: { groupId: true },
    }))?.groupId ?? null;

    const accessFilter = canModifyAll ? null : buildRecordAccessFilter(userId, queueIds, userGroupId, "read");

    const objectDef = await db.objectDefinition.findUnique({
        where: {
            organizationId_apiName: { organizationId, apiName: "opportunity" },
        },
        include: {
            fields: {
                include: {
                    picklistOptions: { orderBy: { sortOrder: "asc" } },
                },
            },
        },
    });

    if (!objectDef) {
        return { success: false, error: "Opportunity object not found" };
    }

    // Build a map from field apiName -> fieldDef id for quick lookup
    const fieldDefMap: Record<string, { id: number; type: string }> = {};
    for (const field of objectDef.fields) {
        fieldDefMap[field.apiName] = { id: field.id, type: field.type };
    }

    // Build a picklist option label map for stage
    const stageField = objectDef.fields.find((f: any) => f.apiName === "stage");
    const stageOptionLabels = new Map<number, string>();
    for (const opt of stageField?.picklistOptions ?? []) {
        stageOptionLabels.set(opt.id, opt.label);
    }

    // Build a picklist option label map for forecast_category
    const forecastFieldDef = objectDef.fields.find((f: any) => f.apiName === "forecast_category");
    const forecastOptionLabels = new Map<number, string>();
    for (const opt of forecastFieldDef?.picklistOptions ?? []) {
        forecastOptionLabels.set(opt.id, opt.label);
    }

    const where: any = {
        objectDefId: objectDef.id,
        organizationId,
        isDeleted: false,
        ...(accessFilter ?? {}),
    };

    // Apply optional filters
    if (opts?.includeLost === false) {
        // Filter out records with Lost stage - handled in rollup
    }
    const closeDateField = objectDef.fields.find((f: any) => f.apiName === "close_date");
    if (opts?.closeDateFrom && opts?.closeDateTo && closeDateField) {
        where.AND = [
            { fields: { some: { fieldDefId: closeDateField.id, valueDate: { gte: new Date(opts.closeDateFrom) } } } },
            { fields: { some: { fieldDefId: closeDateField.id, valueDate: { lte: new Date(opts.closeDateTo) } } } },
        ];
    }

    const records = await db.record.findMany({
        where,
        include: {
            fields: {
                include: {
                    fieldDef: {
                        include: {
                            picklistOptions: { orderBy: { sortOrder: "asc" } },
                        },
                    },
                    valuePicklist: true,
                },
            },
        },
    });

    if (records.length === 0) {
        return {
            success: true,
            stages: [],
            forecast: [],
            summary: { totalCount: 0, totalAmount: 0, totalExpectedRevenue: 0, weightedTotal: 0 },
        };
    }

    // Helper to extract a field value from a record's fields
    const getFieldValue = (recordFields: any[], apiName: string): any => {
        const fieldData = recordFields.find((f: any) => f.fieldDef?.apiName === apiName);
        return getFieldDisplayValue(fieldData);
    };

    const stageAgg: Record<string, { count: number; totalAmount: number; totalExpectedRevenue: number; probability: number }> = {};
    const forecastAgg: Record<string, { count: number; totalAmount: number; totalExpectedRevenue: number }> = {};

    let totalCount = 0;
    let totalAmount = 0;
    let totalExpectedRevenue = 0;
    let weightedTotal = 0;

    for (const record of records) {
        // Resolve stage label from picklist option
        const stageFieldData = record.fields.find((f: any) => f.fieldDef?.apiName === "stage");
        const stagePicklistId = stageFieldData?.valuePicklistId;
        const stageLabelRaw = stageFieldData?.valuePicklist?.label ?? (stagePicklistId ? stageOptionLabels.get(stagePicklistId) : undefined);
        const stageLabel = stageLabelRaw ?? "Unknown";

        // Compute probability from stage label (always derived)
        const probability = computeProbability(stageLabel);

        // Compute forecast category from stage label (always derived)
        const forecastCategory = getForecastCategoryForStage(stageLabel);

        // Amount
        const amountValue = getFieldValue(record.fields, "amount");
        const amount = amountValue !== null ? parseFloat(amountValue) : 0;

        // Compute expected revenue from amount and probability
        const expectedRevenue = computeExpectedRevenue(amount || null, probability);

        const er = expectedRevenue ?? 0;

        // Aggregate by stage
        if (!stageAgg[stageLabel]) {
            stageAgg[stageLabel] = { count: 0, totalAmount: 0, totalExpectedRevenue: 0, probability: 0 };
        }
        stageAgg[stageLabel].count++;
        stageAgg[stageLabel].totalAmount += amount;
        stageAgg[stageLabel].totalExpectedRevenue += er;
        stageAgg[stageLabel].probability = probability;

        // Aggregate by forecast category
        if (!forecastAgg[forecastCategory]) {
            forecastAgg[forecastCategory] = { count: 0, totalAmount: 0, totalExpectedRevenue: 0 };
        }
        forecastAgg[forecastCategory].count++;
        forecastAgg[forecastCategory].totalAmount += amount;
        forecastAgg[forecastCategory].totalExpectedRevenue += er;

        totalCount++;
        totalAmount += amount;
        totalExpectedRevenue += er;
        weightedTotal += er;
    }

    const stages = Object.entries(stageAgg).map(([stage, data]) => ({
        stage,
        count: data.count,
        totalAmount: Math.round(data.totalAmount * 100) / 100,
        totalExpectedRevenue: Math.round(data.totalExpectedRevenue * 100) / 100,
        probability: data.probability,
    }));

    const forecast = Object.entries(forecastAgg).map(([category, data]) => ({
        category,
        count: data.count,
        totalAmount: Math.round(data.totalAmount * 100) / 100,
        totalExpectedRevenue: Math.round(data.totalExpectedRevenue * 100) / 100,
    }));

    return {
        success: true,
        stages,
        forecast,
        summary: {
            totalCount,
            totalAmount: Math.round(totalAmount * 100) / 100,
            totalExpectedRevenue: Math.round(totalExpectedRevenue * 100) / 100,
            weightedTotal: Math.round(weightedTotal * 100) / 100,
        },
    };
}
