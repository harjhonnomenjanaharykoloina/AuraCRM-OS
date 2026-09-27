"use server";

import { db } from "@/lib/db";
import { getUserContext } from "@/lib/auth/context";
import { checkPermission } from "@/lib/permissions";
import { buildRecordAccessFilter, getUserQueueIds } from "@/lib/record-access";
import { buildFieldDataPayload } from "@/lib/field-data";
import { Prisma } from "@prisma/client";

export interface ActivityResult {
    success: boolean;
    activity?: {
        id: number;
        subject: string | null;
        activityType: string | null;
        activityDate: string | null;
        status: string | null;
        durationMinutes: number | null;
        description: string | null;
        relatedRecordId: number | null;
        relatedObjectType: string | null;
        createdAt: string;
        createdBy: { name: string | null } | null;
    };
    error?: string;
}

export interface ActivityTimelineItem {
    id: number;
    subject: string | null;
    activityType: string | null;
    activityDate: string | null;
    status: string | null;
    durationMinutes: number | null;
    createdAt: string;
    createdBy: { name: string | null } | null;
}

export interface TimelineResult {
    success: boolean;
    activities?: ActivityTimelineItem[];
    error?: string;
}

export async function logActivity(input: {
    recordId: number;
    activityType: string;
    subject: string;
    description?: string;
    durationMinutes?: number;
    status?: string;
    activityDate?: string;
}): Promise<ActivityResult> {
    try {
        const { userId, organizationId } = await getUserContext();

        const relatedRecord = await db.record.findFirst({
            where: {
                id: input.recordId,
                organizationId,
                isDeleted: false,
            },
            select: {
                objectDef: {
                    select: { apiName: true },
                },
            },
        });

        if (!relatedRecord) {
            return { success: false, error: "Related record not found." };
        }

        const canRead = await checkPermission(userId, organizationId, relatedRecord.objectDef.apiName, "read");
        if (!canRead) return { success: false, error: "Access denied to related record." };

        const activityObjDef = await db.objectDefinition.findUnique({
            where: {
                organizationId_apiName: {
                    organizationId,
                    apiName: "activity",
                },
            },
            include: {
                fields: {
                    include: {
                        picklistOptions: { orderBy: { sortOrder: "asc" } },
                    },
                },
            },
        });

        if (!activityObjDef) {
            return { success: false, error: "Activity object definition not found." };
        }

        const fieldByApiName = new Map<string, any>();
        for (const field of activityObjDef.fields) {
            fieldByApiName.set(field.apiName, field);
        }

        const nameField = fieldByApiName.get("name");
        if (!nameField) {
            return { success: false, error: "Activity object is missing the 'name' field definition." };
        }

        const picklistLookup = new Map<number, Map<string, number>>();
        for (const field of activityObjDef.fields) {
            if (field.type === "Picklist" && field.picklistOptions) {
                const lookup = new Map<string, number>();
                for (const option of field.picklistOptions) {
                    lookup.set(option.label.toLowerCase(), option.id);
                    lookup.set(option.apiName, option.id);
                    lookup.set(String(option.id), option.id);
                }
                picklistLookup.set(field.id, lookup);
            }
        }

        const resolvePicklistOptionId = (fieldDef: any, value: string | undefined | null): number | null => {
            if (!fieldDef || value === undefined || value === null || value === "") return null;
            const lookup = picklistLookup.get(fieldDef.id);
            if (!lookup) return null;
            return lookup.get(value.toLowerCase()) ?? lookup.get(value) ?? null;
        };

        const activityTypeField = fieldByApiName.get("activity_type");
        const activityTypeId = resolvePicklistOptionId(activityTypeField, input.activityType);
        if (!activityTypeId) {
            return { success: false, error: `Invalid activity type: ${input.activityType}` };
        }

        const statusField = fieldByApiName.get("status");
        const statusId = resolvePicklistOptionId(statusField, input.status ?? "pending");
        if (!statusId) {
            return { success: false, error: `Invalid status: ${input.status}` };
        }

        const fieldDataCreates: Array<{
            recordId: number;
            fieldDefId: number;
            valueText: string | null;
            valueSearch: string | null;
            valueNumber: Prisma.Decimal | null;
            valueDate: Date | null;
            valueBoolean: boolean | null;
            valueLookup: number | null;
            valuePicklistId: number | null;
        }> = [];

        const namePayload = buildFieldDataPayload(nameField, input.subject);
        fieldDataCreates.push({
            recordId: 0,
            fieldDefId: nameField.id,
            ...namePayload,
        });

        const activityTypePayload = buildFieldDataPayload(activityTypeField, activityTypeId);
        fieldDataCreates.push({
            recordId: 0,
            fieldDefId: activityTypeField.id,
            ...activityTypePayload,
        });

        const activityDateField = fieldByApiName.get("activity_date");
        if (activityDateField) {
            const activityDateValue = input.activityDate ?? new Date().toISOString();
            const payload = buildFieldDataPayload(activityDateField, activityDateValue);
            fieldDataCreates.push({
                recordId: 0,
                fieldDefId: activityDateField.id,
                ...payload,
            });
        }

        const descriptionField = fieldByApiName.get("description");
        if (descriptionField && input.description !== undefined) {
            const payload = buildFieldDataPayload(descriptionField, input.description);
            fieldDataCreates.push({
                recordId: 0,
                fieldDefId: descriptionField.id,
                ...payload,
            });
        }

        const durationField = fieldByApiName.get("duration_minutes");
        if (durationField && input.durationMinutes !== undefined) {
            const payload = buildFieldDataPayload(durationField, input.durationMinutes);
            fieldDataCreates.push({
                recordId: 0,
                fieldDefId: durationField.id,
                ...payload,
            });
        }

        const relatedRecordField = fieldByApiName.get("related_record_id");
        if (relatedRecordField) {
            const payload = buildFieldDataPayload(relatedRecordField, input.recordId);
            fieldDataCreates.push({
                recordId: 0,
                fieldDefId: relatedRecordField.id,
                ...payload,
            });
        }

        const relatedObjectTypeField = fieldByApiName.get("related_object_type");
        if (relatedObjectTypeField) {
            const payload = buildFieldDataPayload(relatedObjectTypeField, relatedRecord.objectDef.apiName);
            fieldDataCreates.push({
                recordId: 0,
                fieldDefId: relatedObjectTypeField.id,
                ...payload,
            });
        }

        const statusPayload = buildFieldDataPayload(statusField, statusId);
        fieldDataCreates.push({
            recordId: 0,
            fieldDefId: statusField.id,
            ...statusPayload,
        });

        const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
            const record = await tx.record.create({
                data: {
                    organizationId,
                    objectDefId: activityObjDef.id,
                    ownerId: userId,
                    ownerType: "USER",
                    createdById: userId,
                    lastModifiedById: userId,
                    name: input.subject,
                },
            });

            if (fieldDataCreates.length > 0) {
                await tx.fieldData.createMany({
                    data: fieldDataCreates.map((fd) => ({
                        ...fd,
                        recordId: record.id,
                    })),
                });
            }

            return record;
        });

        return {
            success: true,
            activity: {
                id: result.id,
                subject: input.subject,
                activityType: input.activityType,
                activityDate: input.activityDate ?? null,
                status: input.status ?? "pending",
                durationMinutes: input.durationMinutes ?? null,
                description: input.description ?? null,
                relatedRecordId: input.recordId,
                relatedObjectType: relatedRecord.objectDef.apiName,
                createdAt: result.createdAt.toISOString(),
                createdBy: null,
            },
        };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to log activity." };
    }
}

export async function getActivityTimeline(recordId: number): Promise<TimelineResult> {
    try {
        const { userId, organizationId } = await getUserContext();

        const activityObjDef = await db.objectDefinition.findUnique({
            where: {
                organizationId_apiName: {
                    organizationId,
                    apiName: "activity",
                },
            },
            include: {
                fields: true,
            },
        });

        if (!activityObjDef) {
            return { success: false, error: "Activity object definition not found." };
        }

        const relatedRecordFieldDef = activityObjDef.fields.find((f: any) => f.apiName === "related_record_id");
        if (!relatedRecordFieldDef) {
            return { success: false, error: "Activity object missing 'related_record_id' field." };
        }

        const canViewAll = await checkPermission(userId, organizationId, "activity", "viewAll");
        const canRead = await checkPermission(userId, organizationId, "activity", "read");
        if (!canViewAll && !canRead) return { success: false, error: "INSUFFICIENT_PERMISSIONS" };

        const queueIds = await getUserQueueIds(userId, organizationId);
        const userGroupId =
            (await db.user.findUnique({
                where: { id: userId },
                select: { groupId: true },
            }))?.groupId ?? null;

        const accessFilter = canViewAll ? null : buildRecordAccessFilter(userId, queueIds, userGroupId);

        const records = await db.record.findMany({
            where: {
                organizationId,
                objectDefId: activityObjDef.id,
                isDeleted: false,
                ...(accessFilter ?? {}),
                fields: {
                    some: {
                        fieldDefId: relatedRecordFieldDef.id,
                        valueLookup: recordId,
                    },
                },
            },
            include: {
                fields: {
                    include: {
                        fieldDef: { select: { id: true, apiName: true, type: true } },
                        valuePicklist: { select: { id: true, label: true, apiName: true } },
                    },
                },
                createdBy: {
                    select: { name: true },
                },
            },
        });

        const activityDateFieldDef = activityObjDef.fields.find((f: any) => f.apiName === "activity_date");
        const nameFieldDef = activityObjDef.fields.find((f: any) => f.apiName === "name");
        const activityTypeFieldDef = activityObjDef.fields.find((f: any) => f.apiName === "activity_type");
        const statusFieldDef = activityObjDef.fields.find((f: any) => f.apiName === "status");
        const durationFieldDef = activityObjDef.fields.find((f: any) => f.apiName === "duration_minutes");

        const fieldMap = new Map<number, any>();
        const activities: ActivityTimelineItem[] = records.map((record: any) => {
            fieldMap.clear();
            for (const fd of record.fields) {
                fieldMap.set(fd.fieldDefId, fd);
            }

            const nameData = nameFieldDef ? fieldMap.get(nameFieldDef.id) : null;
            const activityDateData = activityDateFieldDef ? fieldMap.get(activityDateFieldDef.id) : null;
            const activityTypeData = activityTypeFieldDef ? fieldMap.get(activityTypeFieldDef.id) : null;
            const statusData = statusFieldDef ? fieldMap.get(statusFieldDef.id) : null;
            const durationData = durationFieldDef ? fieldMap.get(durationFieldDef.id) : null;

            const activityDateValue = activityDateData?.valueDate ? new Date(activityDateData.valueDate).toISOString() : null;

            const activityTypeLabel = activityTypeData?.valuePicklist ? activityTypeData.valuePicklist.label : activityTypeData?.valueText ?? null;
            const statusLabel = statusData?.valuePicklist ? statusData.valuePicklist.label : statusData?.valueText ?? null;

            const durationNumber = durationData?.valueNumber ? Number(durationData.valueNumber) : null;

            return {
                id: record.id,
                subject: nameData?.valueText ?? nameData?.valueSearch ?? null,
                activityType: activityTypeLabel,
                activityDate: activityDateValue,
                status: statusLabel,
                durationMinutes: durationNumber,
                createdAt: record.createdAt ? new Date(record.createdAt).toISOString() : "",
                createdBy: record.createdBy ?? null,
            };
        });

        activities.sort((a, b) => {
            if (!a.activityDate && !b.activityDate) return 0;
            if (!a.activityDate) return 1;
            if (!b.activityDate) return -1;
            return new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime();
        });

        return { success: true, activities };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to fetch activity timeline." };
    }
}
