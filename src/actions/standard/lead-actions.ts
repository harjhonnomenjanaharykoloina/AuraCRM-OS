"use server";

import { createRecord, getUserContext, updateRecord } from "./record-actions";
import { getUserQueueIds, buildRecordAccessFilter } from "../../lib/record-access";
import { checkPermission } from "../../lib/permissions";
import { getFieldDisplayValue, getLookupId } from "../../lib/field-data";
import { db } from "../../lib/db";

export async function convertLead(objectApiName: string, leadId: number, _data?: Record<string, any>) {
    const { userId, organizationId } = await getUserContext();
    const queueIds = await getUserQueueIds(userId);

    if (objectApiName !== "lead") {
        return { success: false, error: "Only lead records can be converted" };
    }

    const canEditLead = await checkPermission(userId, organizationId, objectApiName, "edit");
    const canCreateContact = await checkPermission(userId, organizationId, "contact", "create");

    if (!canEditLead || !canCreateContact) {
        return { success: false, error: "Insufficient permissions" };
    }

    const userGroupId = (await db.user.findUnique({
        where: { id: userId },
        select: { groupId: true },
    }))?.groupId ?? null;

    const accessFilter = buildRecordAccessFilter(userId, queueIds, userGroupId, "edit");

    const lead = await db.record.findFirst({
        where: {
            id: leadId,
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

    if (!lead) {
        return { success: false, error: "Lead record not found" };
    }

    const isConvertedField = lead.fields.find((f: any) => f.fieldDef.apiName === "is_converted");
    if (isConvertedField?.valueBoolean === true) {
        return { success: false, error: "Lead has already been converted" };
    }

    const getField = (apiName: string) => lead.fields.find((f: any) => f.fieldDef.apiName === apiName);

    const contactData: Record<string, any> = {
        first_name: getFieldDisplayValue(getField("first_name")),
        last_name: getFieldDisplayValue(getField("last_name")),
        email: getFieldDisplayValue(getField("email")),
        phone: getFieldDisplayValue(getField("phone")),
        title: getFieldDisplayValue(getField("title")),
        company: getLookupId(getField("company")),
    };

    const createResult = await createRecord("contact", contactData);

    if (!createResult.success) {
        return { success: false, error: createResult.error };
    }

    const contactId = createResult.data?.id;
    if (!contactId) {
        return { success: false, error: "Failed to create contact record" };
    }

    const updateResult = await updateRecord("lead", leadId, { is_converted: "true", contact: contactId });

    if (!updateResult.success) {
        return { success: false, error: updateResult.error };
    }

    return { success: true, contactId };
}
