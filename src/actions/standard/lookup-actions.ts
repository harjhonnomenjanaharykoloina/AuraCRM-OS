"use server";

import { getUserContext } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { checkPermission } from "@/lib/permissions";
import { getFieldDisplayValue } from "@/lib/field-data";
import { buildRecordAccessFilter, getUserQueueIds } from "@/lib/record-access";

export async function getLookupOptions(targetObjectDefId: number) {
    const { userId, organizationId } = await getUserContext();
    const queueIds = await getUserQueueIds(userId, organizationId);
    const userGroupId = (await db.user.findUnique({
        where: { id: userId },
        select: { groupId: true },
    }))?.groupId ?? null;

    // 1. Get Target Object Definition
    const targetObjectDef = await db.objectDefinition.findUnique({
        where: { id: targetObjectDefId, organizationId },
        include: { fields: true },
    });

    if (!targetObjectDef) {
        return [];
    }

    // Permission Check (Read access to target object)
    const canViewAll = await checkPermission(userId, organizationId, targetObjectDef.apiName, "viewAll");

    if (!canViewAll) {
        // Can only see owned records
        const canRead = await checkPermission(userId, organizationId, targetObjectDef.apiName, "read");
        if (!canRead) return [];
    }

    const accessFilter = canViewAll ? null : buildRecordAccessFilter(userId, queueIds, userGroupId);

    // 2. Determine Label Field
    // Prefer the first "Text" field, otherwise use ID
    const labelField = targetObjectDef.fields.find(f => f.type === "Text");

    // 3. Fetch Records
    const records = await db.record.findMany({
        where: {
            organizationId,
            objectDefId: targetObjectDefId,
            isDeleted: false,
            ...(accessFilter ?? {}),
        },
        include: {
            fields: {
                where: {
                    fieldDefId: labelField?.id,
                },
            },
        },
        take: 100, // Limit for dropdown
        orderBy: { createdAt: "desc" },
    });

    // 4. Transform
    return records.map(record => {
        const fallback = labelField && record.fields.length > 0 ? getFieldDisplayValue(record.fields[0]) : null;
        const label = record.name || fallback || `Record #${record.id}`;
        return {
            id: String(record.id),
            label,
        };
    });
}

export async function getLookupLabel(targetObjectDefId: number, recordId: number) {
    const { userId: _userId, organizationId } = await getUserContext();

    // 1. Get Target Object Definition
    const targetObjectDef = await db.objectDefinition.findUnique({
        where: { id: targetObjectDefId, organizationId },
        include: { fields: true },
    });

    if (!targetObjectDef) return null;

    // 2. Determine Label Field
    const labelField = targetObjectDef.fields.find(f => f.type === "Text");

    // 3. Fetch Record (Bypass standard permission check just to get the label for display)
    // We assume if they have access to the parent record, they can see the ID/Label of the related record
    // even if they can't "read" the full related record.
    const record = await db.record.findUnique({
        where: {
            id: recordId,
            organizationId,
            isDeleted: false,
        },
        include: {
            fields: {
                where: {
                    fieldDefId: labelField?.id,
                },
            },
        },
    });

    if (!record) return null;

    const fallback = labelField && record.fields.length > 0 ? getFieldDisplayValue(record.fields[0]) : null;
    const label = record.name || fallback || `Record #${record.id}`;

    return {
        id: String(record.id),
        label,
    };
}
