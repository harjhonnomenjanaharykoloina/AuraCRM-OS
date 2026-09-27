"use server";

import { createRecord, getUserContext, updateRecord } from "./record-actions";
import { getUserQueueIds, buildRecordAccessFilter } from "../../lib/record-access";
import { checkPermission } from "../../lib/permissions";
import { getFieldDisplayValue, getLookupId } from "../../lib/field-data";
import { db } from "../../lib/db";
import { formatDateOnlyForInput } from "../../lib/temporal";
import { validateLeadStatusTransition } from "@/lib/validation/lead-state-machine";

export { validateLeadStatusTransition };

const CLOSE_DATE_DAYS_AHEAD = 30;

export async function convertLead(objectApiName: string, leadId: number, _data?: Record<string, any>) {
    const { userId, organizationId } = await getUserContext();
    const queueIds = await getUserQueueIds(userId, organizationId);

    if (objectApiName !== "lead") {
        return { success: false, error: "Only lead records can be converted" };
    }

    const canEditLead = await checkPermission(userId, organizationId, objectApiName, "edit");
    const canCreateContact = await checkPermission(userId, organizationId, "contact", "create");
    const canCreateCompany = await checkPermission(userId, organizationId, "company", "create");
    const canCreateOpportunity = await checkPermission(userId, organizationId, "opportunity", "create");

    if (!canEditLead || !canCreateContact || !canCreateCompany || !canCreateOpportunity) {
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
    const getField = (apiName: string) => lead.fields.find((f: any) => f.fieldDef.apiName === apiName);

    if (isConvertedField?.valueBoolean === true) {
        const contactId = getLookupId(getField("contact"));
        const companyId = getLookupId(getField("company"));
        const opportunityId = getLookupId(getField("opportunity"));
        return { success: true, alreadyConverted: true, contactId, companyId, opportunityId };
    }

    const currentStatusField = lead.fields.find((f: any) => f.fieldDef.apiName === "status");
    const currentStatus = currentStatusField?.valuePicklist?.label ?? null;

    const convertedTransition = validateLeadStatusTransition(currentStatus ?? "", "Converted");
    if (!convertedTransition.valid) {
        return { success: false, error: convertedTransition.error };
    }

    const statusFieldDef = lead.objectDef.fields.find((f: any) => f.apiName === "status");
    const convertedStatusId = statusFieldDef?.picklistOptions?.find((opt: any) => opt.label === "Converted")?.id ?? null;

    const oppStageOption = await db.picklistOption.findFirst({
        where: {
            organizationId,
            fieldDef: {
                objectDef: { organizationId, apiName: "opportunity" },
                apiName: "stage",
            },
            label: "Lead",
        },
        select: { id: true },
    });

    const companyName = getFieldDisplayValue(getField("company_name"));
    const existingCompanyId = getLookupId(getField("company"));
    const firstName = getFieldDisplayValue(getField("first_name"));
    const lastName = getFieldDisplayValue(getField("last_name"));

    let companyId: number | null = existingCompanyId;

    if (companyName && !existingCompanyId) {
        const companyResult = await createRecord("company", { name: companyName });
        if (!companyResult.success) {
            return { success: false, error: companyResult.error };
        }
        companyId = companyResult.data?.id ?? null;
    }

    const contactData: Record<string, any> = {
        first_name: firstName,
        last_name: lastName,
        email: getFieldDisplayValue(getField("email")),
        phone: getFieldDisplayValue(getField("phone")),
        title: getFieldDisplayValue(getField("title")),
        company: companyId,
    };

    const contactResult = await createRecord("contact", contactData);

    if (!contactResult.success) {
        return { success: false, error: contactResult.error };
    }

    const contactId = contactResult.data?.id;
    if (!contactId) {
        return { success: false, error: "Failed to create contact record" };
    }

    const closeDate = new Date();
    closeDate.setDate(closeDate.getDate() + CLOSE_DATE_DAYS_AHEAD);
    const closeDateISO = formatDateOnlyForInput(closeDate);

    const opportunityData: Record<string, any> = {
        amount: "0",
        stage: oppStageOption?.id ?? null,
        close_date: closeDateISO,
        company: companyId,
        contact: contactId,
    };

    const opportunityResult = await createRecord("opportunity", opportunityData);

    if (!opportunityResult.success) {
        return { success: false, error: opportunityResult.error };
    }

    const opportunityId = opportunityResult.data?.id;

    const leadUpdateData: Record<string, any> = {
        is_converted: "true",
        contact: contactId,
        company: companyId ?? null,
        opportunity: opportunityId,
    };
    if (convertedStatusId !== null) {
        leadUpdateData.status = convertedStatusId;
    }

    const updateResult = await updateRecord("lead", leadId, leadUpdateData);

    if (!updateResult.success) {
        return { success: false, error: updateResult.error };
    }

    return { success: true, contactId, companyId: companyId ?? undefined, opportunityId: opportunityId ?? undefined };
}

export async function updateLeadStatus(
    leadId: number,
    newStatus: string,
): Promise<{ success: boolean; error?: string; status?: string }> {
    const { userId, organizationId } = await getUserContext();
    const queueIds = await getUserQueueIds(userId, organizationId);

    const canEditLead = await checkPermission(userId, organizationId, "lead", "edit");

    if (!canEditLead) {
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

    const getField = (apiName: string) => lead.fields.find((f: any) => f.fieldDef.apiName === apiName);

    const currentStatusField = getField("status");
    const currentStatus = currentStatusField?.valuePicklist?.label ?? null;

    const transition = validateLeadStatusTransition(currentStatus ?? "", newStatus);
    if (!transition.valid) {
        return { success: false, error: transition.error };
    }

    const statusFieldDef = lead.objectDef.fields.find((f: any) => f.apiName === "status");
    const newStatusOptionId = statusFieldDef?.picklistOptions?.find((opt: any) => opt.label === newStatus)?.id ?? null;

    if (newStatusOptionId === null) {
        return { success: false, error: `Status '${newStatus}' is not a valid option` };
    }

    const updateResult = await updateRecord("lead", leadId, { status: newStatusOptionId });

    if (!updateResult.success) {
        return { success: false, error: updateResult.error };
    }

    return { success: true, status: newStatus };
}
