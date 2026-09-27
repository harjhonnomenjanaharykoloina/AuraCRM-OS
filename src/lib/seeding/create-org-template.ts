import { db } from "@/lib/db";
import { normalizePicklistApiName } from "@/lib/api-names";
import { USER_ID_FIELD_API_NAME, USER_OBJECT_API_NAME } from "@/lib/user-companion";
import { createDefaultAppAndPermissionSets } from "@/lib/seeding/create-default-app";

export async function createOrgTemplate(organizationId: number) {
    return await db.$transaction(async (tx) => {
        const createDefaultListView = async (objectDefId: number, pluralLabel: string) => {
            const nameField = await tx.fieldDefinition.findFirst({
                where: { objectDefId, apiName: "name" },
                select: { id: true },
            });

            if (!nameField) return;

            await tx.listView.create({
                data: {
                    organizationId,
                    objectDefId,
                    name: `All ${pluralLabel}`,
                    isDefault: true,
                    isGlobal: true,
                    criteria: {
                        logic: "ALL",
                        filters: [],
                        ownerScope: "any",
                        ownerQueueId: null,
                    },
                    columns: {
                        create: [
                            {
                                fieldDefId: nameField.id,
                                sortOrder: 0,
                            },
                        ],
                    },
                },
            });
        };

        const createPicklistOptions = async (fieldDefId: number | undefined, labels: string[]) => {
            if (!fieldDefId || labels.length === 0) return;
            await tx.picklistOption.createMany({
                data: labels.map((label, index) => ({
                    organizationId,
                    fieldDefId,
                    apiName: normalizePicklistApiName(label),
                    label,
                    sortOrder: index,
                    isActive: true,
                })),
            });
        };

        // Default Queue + Group (optional, can be managed in admin later)
        await tx.queue.create({
            data: {
                organizationId,
                name: "Unassigned",
                description: "Default queue for new records.",
            },
        });
        await tx.group.create({
            data: {
                organizationId,
                name: "All Users",
                description: "Default sharing group.",
            },
        });

        const userObj = await tx.objectDefinition.create({
            data: {
                organizationId,
                apiName: USER_OBJECT_API_NAME,
                label: "User",
                pluralLabel: "Users",
                icon: "Users",
                isSystem: true,
                description: "Represents an application user.",
            },
        });

        await tx.fieldDefinition.createMany({
            data: [
                { objectDefId: userObj.id, apiName: "name", label: "Name", type: "Text", required: true },
                {
                    objectDefId: userObj.id,
                    apiName: USER_ID_FIELD_API_NAME,
                    label: "UserId",
                    type: "Text",
                    required: true,
                    isExternalId: true,
                    isUnique: true,
                },
            ],
        });
        await createDefaultListView(userObj.id, userObj.pluralLabel);

        // 1. Company Object (Created first so others can lookup to it)
        const companyObj = await tx.objectDefinition.create({
            data: {
                organizationId,
                apiName: "company",
                label: "Company",
                pluralLabel: "Companies",
                icon: "Building",
                isSystem: true,
                description: "Represents a business or account.",
            },
        });

        await tx.fieldDefinition.createMany({
            data: [
                { objectDefId: companyObj.id, apiName: "name", label: "Company Name", type: "Text", required: true },
                { objectDefId: companyObj.id, apiName: "website", label: "Website", type: "Url" },
                {
                    objectDefId: companyObj.id,
                    apiName: "industry",
                    label: "Industry",
                    type: "Picklist",
                },
            ],
        });
        const companyIndustryField = await tx.fieldDefinition.findFirst({
            where: { objectDefId: companyObj.id, apiName: "industry" },
            select: { id: true },
        });
        await createPicklistOptions(companyIndustryField?.id, ["Tech", "Finance", "Retail", "Other"]);
        await createDefaultListView(companyObj.id, companyObj.pluralLabel);

        // 2. Contact Object
        const contactObj = await tx.objectDefinition.create({
            data: {
                organizationId,
                apiName: "contact",
                label: "Contact",
                pluralLabel: "Contacts",
                icon: "User",
                isSystem: true,
                description: "Represents a person.",
            },
        });

        await tx.fieldDefinition.createMany({
            data: [
                { objectDefId: contactObj.id, apiName: "name", label: "Full Name", type: "Text", required: true },
                { objectDefId: contactObj.id, apiName: "first_name", label: "First Name", type: "Text", required: true },
                { objectDefId: contactObj.id, apiName: "last_name", label: "Last Name", type: "Text", required: true },
                { objectDefId: contactObj.id, apiName: "email", label: "Email", type: "Email" },
                { objectDefId: contactObj.id, apiName: "phone", label: "Phone", type: "Phone" },
                { objectDefId: contactObj.id, apiName: "title", label: "Title", type: "Text" },
                // Lookup to Company
                { objectDefId: contactObj.id, apiName: "company", label: "Company", type: "Lookup", lookupTargetId: companyObj.id },
            ],
        });
        await createDefaultListView(contactObj.id, contactObj.pluralLabel);

        // 3. Opportunity Object
        const opportunityObj = await tx.objectDefinition.create({
            data: {
                organizationId,
                apiName: "opportunity",
                label: "Opportunity",
                pluralLabel: "Opportunities",
                icon: "DollarSign",
                isSystem: true,
                description: "Represents a potential deal.",
            },
        });

        await tx.fieldDefinition.createMany({
            data: [
                { objectDefId: opportunityObj.id, apiName: "name", label: "Opportunity Name", type: "Text", required: true },
                { objectDefId: opportunityObj.id, apiName: "amount", label: "Amount", type: "Number" },
                { objectDefId: opportunityObj.id, apiName: "probability", label: "Probability (%)", type: "Number" },
                { objectDefId: opportunityObj.id, apiName: "expected_revenue", label: "Expected Revenue", type: "Number" },
                {
                    objectDefId: opportunityObj.id,
                    apiName: "stage",
                    label: "Stage",
                    type: "Picklist",
                    required: true,
                },
                { objectDefId: opportunityObj.id, apiName: "close_date", label: "Close Date", type: "Date" },
                { objectDefId: opportunityObj.id, apiName: "forecast_category", label: "Forecast Category", type: "Picklist", required: true },
                // Lookup to Company
                { objectDefId: opportunityObj.id, apiName: "company", label: "Company", type: "Lookup", lookupTargetId: companyObj.id },
            ],
        });
        const opportunityStageField = await tx.fieldDefinition.findFirst({
            where: { objectDefId: opportunityObj.id, apiName: "stage" },
            select: { id: true },
        });
        await createPicklistOptions(opportunityStageField?.id, ["Lead", "Qualified", "Demo", "Proposal", "Negotiation", "Won", "Lost"]);
        const opportunityForecastField = await tx.fieldDefinition.findFirst({
            where: { objectDefId: opportunityObj.id, apiName: "forecast_category" },
            select: { id: true },
        });
        await createPicklistOptions(opportunityForecastField?.id, ["Pipeline", "Best Case", "Commit", "Closed Won"]);
        await createDefaultListView(opportunityObj.id, opportunityObj.pluralLabel);

        // 4. Case Object
        const caseObj = await tx.objectDefinition.create({
            data: {
                organizationId,
                apiName: "case",
                label: "Case",
                pluralLabel: "Cases",
                icon: "Briefcase",
                isSystem: true,
                description: "Represents a support issue.",
            },
        });

        await tx.fieldDefinition.createMany({
            data: [
                {
                    objectDefId: caseObj.id,
                    apiName: "name",
                    label: "Case Number",
                    type: "AutoNumber",
                    required: false,
                    options: {
                        autoNumber: {
                            prefix: "CASE-",
                            minDigits: 4,
                            nextValue: 1,
                        },
                    },
                },
                { objectDefId: caseObj.id, apiName: "subject", label: "Subject", type: "Text", required: true },
                { objectDefId: caseObj.id, apiName: "description", label: "Description", type: "Text" },
                {
                    objectDefId: caseObj.id,
                    apiName: "status",
                    label: "Status",
                    type: "Picklist",
                    required: true,
                },
                {
                    objectDefId: caseObj.id,
                    apiName: "priority",
                    label: "Priority",
                    type: "Picklist",
                },
                // Lookup to Company
                { objectDefId: caseObj.id, apiName: "company", label: "Company", type: "Lookup", lookupTargetId: companyObj.id },
            ],
        });
        const caseStatusField = await tx.fieldDefinition.findFirst({
            where: { objectDefId: caseObj.id, apiName: "status" },
            select: { id: true },
        });
        const casePriorityField = await tx.fieldDefinition.findFirst({
            where: { objectDefId: caseObj.id, apiName: "priority" },
            select: { id: true },
        });
        await createPicklistOptions(caseStatusField?.id, ["New", "Open", "Closed"]);
        await createPicklistOptions(casePriorityField?.id, ["Low", "Medium", "High"]);
        await createDefaultListView(caseObj.id, caseObj.pluralLabel);

        // 5. Lead Object
        const leadObj = await tx.objectDefinition.create({
            data: {
                organizationId,
                apiName: "lead",
                label: "Lead",
                pluralLabel: "Leads",
                icon: "UserPlus",
                isSystem: true,
                description: "Represents a potential customer.",
            },
        });

        await tx.fieldDefinition.createMany({
            data: [
                { objectDefId: leadObj.id, apiName: "name", label: "Lead Name", type: "Text", required: true },
                { objectDefId: leadObj.id, apiName: "first_name", label: "First Name", type: "Text", required: true },
                { objectDefId: leadObj.id, apiName: "last_name", label: "Last Name", type: "Text", required: true },
                { objectDefId: leadObj.id, apiName: "email", label: "Email", type: "Email" },
                { objectDefId: leadObj.id, apiName: "phone", label: "Phone", type: "Phone" },
                { objectDefId: leadObj.id, apiName: "title", label: "Title", type: "Text" },
                { objectDefId: leadObj.id, apiName: "company_name", label: "Company Name", type: "Text" },
                { objectDefId: leadObj.id, apiName: "company", label: "Company", type: "Lookup", lookupTargetId: companyObj.id },
                { objectDefId: leadObj.id, apiName: "contact", label: "Contact", type: "Lookup", lookupTargetId: contactObj.id },
                { objectDefId: leadObj.id, apiName: "opportunity", label: "Opportunity", type: "Lookup", lookupTargetId: opportunityObj.id },
                { objectDefId: leadObj.id, apiName: "status", label: "Status", type: "Picklist", required: true },
                { objectDefId: leadObj.id, apiName: "source", label: "Source", type: "Picklist" },
                { objectDefId: leadObj.id, apiName: "score", label: "Score", type: "Number" },
                { objectDefId: leadObj.id, apiName: "is_converted", label: "Is Converted", type: "Checkbox" },
            ],
        });
        const leadStatusField = await tx.fieldDefinition.findFirst({
            where: { objectDefId: leadObj.id, apiName: "status" },
            select: { id: true },
        });
        await createPicklistOptions(leadStatusField?.id, ["New", "Contacted", "Qualified", "Unqualified", "Converted", "Rejected"]);
        const leadSourceField = await tx.fieldDefinition.findFirst({
            where: { objectDefId: leadObj.id, apiName: "source" },
            select: { id: true },
        });
        await createPicklistOptions(leadSourceField?.id, ["Web", "Phone Inquiry", "Email", "Social", "Referral", "Trade Show", "Partner", "Other"]);
        await createDefaultListView(leadObj.id, leadObj.pluralLabel);

        // 6. Task Object
        const taskObj = await tx.objectDefinition.create({
            data: {
                organizationId,
                apiName: "task",
                label: "Task",
                pluralLabel: "Tasks",
                icon: "CheckSquare",
                isSystem: true,
                description: "Represents a task or to-do item.",
            },
        });

        await tx.fieldDefinition.createMany({
            data: [
                { objectDefId: taskObj.id, apiName: "name", label: "Task Name", type: "Text", required: true },
                { objectDefId: taskObj.id, apiName: "description", label: "Description", type: "TextArea" },
                { objectDefId: taskObj.id, apiName: "status", label: "Status", type: "Picklist", required: true },
                { objectDefId: taskObj.id, apiName: "lead", label: "Lead", type: "Lookup", lookupTargetId: leadObj.id },
                { objectDefId: taskObj.id, apiName: "contact", label: "Contact", type: "Lookup", lookupTargetId: contactObj.id },
            ],
        });
        const taskStatusField = await tx.fieldDefinition.findFirst({
            where: { objectDefId: taskObj.id, apiName: "status" },
            select: { id: true },
        });
        await createPicklistOptions(taskStatusField?.id, ["Not Started", "In Progress", "Completed", "Deferred"]);
        await createDefaultListView(taskObj.id, taskObj.pluralLabel);

        // 7. Product Object
        const productObj = await tx.objectDefinition.create({
            data: {
                organizationId,
                apiName: "product",
                label: "Product",
                pluralLabel: "Products",
                icon: "Package",
                isSystem: true,
                description: "Represents a product or service offered by the company.",
            },
        });

        await tx.fieldDefinition.createMany({
            data: [
                { objectDefId: productObj.id, apiName: "name", label: "Product Name", type: "Text", required: true },
                { objectDefId: productObj.id, apiName: "sku", label: "SKU", type: "Text" },
                // NOTE: "Number" (not "Currency") — buildFieldDataPayload/record-validation have no Currency case; matches opportunity.amount convention.
                { objectDefId: productObj.id, apiName: "price", label: "Price", type: "Number" },
                { objectDefId: productObj.id, apiName: "description", label: "Description", type: "TextArea" },
                { objectDefId: productObj.id, apiName: "company", label: "Company", type: "Lookup", lookupTargetId: companyObj.id },
            ],
        });
        await createDefaultListView(productObj.id, productObj.pluralLabel);

        // 8. Note Object
        const noteObj = await tx.objectDefinition.create({
            data: {
                organizationId,
                apiName: "note",
                label: "Note",
                pluralLabel: "Notes",
                icon: "Note",
                isSystem: true,
                description: "Represents a free-form note attached to a record.",
            },
        });

        await tx.fieldDefinition.createMany({
            data: [
                { objectDefId: noteObj.id, apiName: "name", label: "Title", type: "Text", required: true },
                { objectDefId: noteObj.id, apiName: "body", label: "Body", type: "TextArea" },
                { objectDefId: noteObj.id, apiName: "related_to", label: "Related To", type: "Lookup", lookupTargetId: contactObj.id },
            ],
        });
        await createDefaultListView(noteObj.id, noteObj.pluralLabel);

        // 9. Call Object
        const callObj = await tx.objectDefinition.create({
            data: {
                organizationId,
                apiName: "call",
                label: "Call",
                pluralLabel: "Calls",
                icon: "Phone",
                isSystem: true,
                description: "Represents a call activity.",
            },
        });

        await tx.fieldDefinition.createMany({
            data: [
                { objectDefId: callObj.id, apiName: "name", label: "Subject", type: "Text", required: true },
                { objectDefId: callObj.id, apiName: "status", label: "Status", type: "Picklist", required: true },
                { objectDefId: callObj.id, apiName: "direction", label: "Direction", type: "Picklist" },
                { objectDefId: callObj.id, apiName: "duration", label: "Duration", type: "Number" },
                { objectDefId: callObj.id, apiName: "related_to", label: "Related To", type: "Lookup", lookupTargetId: contactObj.id },
            ],
        });
        const callStatusField = await tx.fieldDefinition.findFirst({
            where: { objectDefId: callObj.id, apiName: "status" },
            select: { id: true },
        });
        const callDirectionField = await tx.fieldDefinition.findFirst({
            where: { objectDefId: callObj.id, apiName: "direction" },
            select: { id: true },
        });
        await createPicklistOptions(callStatusField?.id, ["Scheduled", "Completed", "Canceled"]);
        await createPicklistOptions(callDirectionField?.id, ["Inbound", "Outbound"]);
        await createDefaultListView(callObj.id, callObj.pluralLabel);

        // 10. Meeting Object
        const meetingObj = await tx.objectDefinition.create({
            data: {
                organizationId,
                apiName: "meeting",
                label: "Meeting",
                pluralLabel: "Meetings",
                icon: "Calendar",
                isSystem: true,
                description: "Represents a meeting or appointment activity.",
            },
        });

        await tx.fieldDefinition.createMany({
            data: [
                { objectDefId: meetingObj.id, apiName: "name", label: "Subject", type: "Text", required: true },
                { objectDefId: meetingObj.id, apiName: "start", label: "Start", type: "DateTime" },
                { objectDefId: meetingObj.id, apiName: "end", label: "End", type: "DateTime" },
                { objectDefId: meetingObj.id, apiName: "status", label: "Status", type: "Picklist", required: true },
                { objectDefId: meetingObj.id, apiName: "related_to", label: "Related To", type: "Lookup", lookupTargetId: contactObj.id },
            ],
        });
        const meetingStatusField = await tx.fieldDefinition.findFirst({
            where: { objectDefId: meetingObj.id, apiName: "status" },
            select: { id: true },
        });
        await createPicklistOptions(meetingStatusField?.id, ["Scheduled", "Completed", "Canceled"]);
        await createDefaultListView(meetingObj.id, meetingObj.pluralLabel);

        // 11. Document Object
        const documentObj = await tx.objectDefinition.create({
            data: {
                organizationId,
                apiName: "document",
                label: "Document",
                pluralLabel: "Documents",
                icon: "FileText",
                isSystem: true,
                description: "Represents an attached document file.",
            },
        });

        await tx.fieldDefinition.createMany({
            data: [
                { objectDefId: documentObj.id, apiName: "name", label: "Title", type: "Text", required: true },
                { objectDefId: documentObj.id, apiName: "file", label: "File", type: "File" },
                { objectDefId: documentObj.id, apiName: "version", label: "Version", type: "Text" },
                { objectDefId: documentObj.id, apiName: "related_to", label: "Related To", type: "Lookup", lookupTargetId: contactObj.id },
            ],
        });
        await createDefaultListView(documentObj.id, documentObj.pluralLabel);

        // 12. Activity Object
        const activityObj = await tx.objectDefinition.create({
            data: {
                organizationId,
                apiName: "activity",
                label: "Activity",
                pluralLabel: "Activities",
                icon: "Activity",
                isSystem: true,
                description: "Represents an activity log entry associated with a record.",
            },
        });

        await tx.fieldDefinition.createMany({
            data: [
                { objectDefId: activityObj.id, apiName: "name", label: "Subject", type: "Text", required: true },
                { objectDefId: activityObj.id, apiName: "activity_type", label: "Activity Type", type: "Picklist", required: true },
                { objectDefId: activityObj.id, apiName: "activity_date", label: "Activity Date", type: "DateTime" },
                { objectDefId: activityObj.id, apiName: "description", label: "Description", type: "TextArea" },
                { objectDefId: activityObj.id, apiName: "duration_minutes", label: "Duration (Minutes)", type: "Number" },
                { objectDefId: activityObj.id, apiName: "related_record_id", label: "Related Record", type: "Lookup" },
                { objectDefId: activityObj.id, apiName: "related_object_type", label: "Related Object Type", type: "Text" },
                { objectDefId: activityObj.id, apiName: "status", label: "Status", type: "Picklist", required: true },
            ],
        });
        const activityTypeField = await tx.fieldDefinition.findFirst({
            where: { objectDefId: activityObj.id, apiName: "activity_type" },
            select: { id: true },
        });
        const activityStatusField = await tx.fieldDefinition.findFirst({
            where: { objectDefId: activityObj.id, apiName: "status" },
            select: { id: true },
        });
        await createPicklistOptions(activityTypeField?.id, ["Call", "Meeting", "Email", "Task", "Custom"]);
        await createPicklistOptions(activityStatusField?.id, ["Completed", "Pending", "Scheduled"]);
        await createDefaultListView(activityObj.id, activityObj.pluralLabel);

        // 13. Contract Object
        const createContractObject = async (accountObj: { id: number; apiName: string }) => {
            const contractObj = await tx.objectDefinition.create({
                data: {
                    organizationId,
                    apiName: "contract",
                    label: "Contract",
                    pluralLabel: "Contracts",
                    icon: "FileSignature",
                    isSystem: true,
                    description: "Represents a contractual agreement with an account.",
                },
            });

            await tx.fieldDefinition.createMany({
                data: [
                    { objectDefId: contractObj.id, apiName: "name", label: "Title", type: "Text", required: true },
                    { objectDefId: contractObj.id, apiName: "value", label: "Value", type: "Currency" },
                    { objectDefId: contractObj.id, apiName: "start_date", label: "Start Date", type: "Date" },
                    { objectDefId: contractObj.id, apiName: "end_date", label: "End Date", type: "Date" },
                    { objectDefId: contractObj.id, apiName: "renewal_reminder_date", label: "Renewal Reminder Date", type: "Date" },
                    { objectDefId: contractObj.id, apiName: "account", label: "Account", type: "Lookup", lookupTargetId: accountObj.id },
                    { objectDefId: contractObj.id, apiName: "status", label: "Status", type: "Picklist", required: true },
                    { objectDefId: contractObj.id, apiName: "currency", label: "Currency", type: "Text" },
                ],
            });
            const contractStatusField = await tx.fieldDefinition.findFirst({
                where: { objectDefId: contractObj.id, apiName: "status" },
                select: { id: true },
            });
            await createPicklistOptions(contractStatusField?.id, ["Draft", "Sent", "Accepted", "Expired", "Cancelled"]);
            await createDefaultListView(contractObj.id, contractObj.pluralLabel);
            return contractObj;
        };

        // 14. Target Object
        const createTargetObject = async (
            accountObj: { id: number; apiName: string },
            contactObj: { id: number; apiName: string },
        ) => {
            const targetObj = await tx.objectDefinition.create({
                data: {
                    organizationId,
                    apiName: "target",
                    label: "Target",
                    pluralLabel: "Targets",
                    icon: "Target",
                    isSystem: true,
                    description: "Represents a marketing target for campaigns.",
                },
            });

            await tx.fieldDefinition.createMany({
                data: [
                    { objectDefId: targetObj.id, apiName: "name", label: "Target Name", type: "Text", required: true },
                    { objectDefId: targetObj.id, apiName: "first_name", label: "First Name", type: "Text", required: true },
                    { objectDefId: targetObj.id, apiName: "last_name", label: "Last Name", type: "Text", required: true },
                    { objectDefId: targetObj.id, apiName: "email", label: "Email", type: "Email" },
                    { objectDefId: targetObj.id, apiName: "phone", label: "Phone", type: "Phone" },
                    { objectDefId: targetObj.id, apiName: "company", label: "Company", type: "Lookup", lookupTargetId: accountObj.id },
                    { objectDefId: targetObj.id, apiName: "linkedin", label: "LinkedIn", type: "Url" },
                    { objectDefId: targetObj.id, apiName: "twitter", label: "Twitter", type: "Url" },
                    { objectDefId: targetObj.id, apiName: "do_not_email", label: "Do Not Email", type: "Checkbox" },
                    { objectDefId: targetObj.id, apiName: "tags", label: "Tags", type: "Text" },
                    { objectDefId: targetObj.id, apiName: "notes", label: "Notes", type: "TextArea" },
                    { objectDefId: targetObj.id, apiName: "lead_source", label: "Lead Source", type: "Picklist", required: true },
                    { objectDefId: targetObj.id, apiName: "converted_account", label: "Converted Account", type: "Lookup", lookupTargetId: accountObj.id },
                    { objectDefId: targetObj.id, apiName: "converted_contact", label: "Converted Contact", type: "Lookup", lookupTargetId: contactObj.id },
                ],
            });
            const targetLeadSourceField = await tx.fieldDefinition.findFirst({
                where: { objectDefId: targetObj.id, apiName: "lead_source" },
                select: { id: true },
            });
            await createPicklistOptions(targetLeadSourceField?.id, ["Web", "Email", "Social", "Referral", "Organic", "Paid", "Other"]);
            await createDefaultListView(targetObj.id, targetObj.pluralLabel);
            return targetObj;
        };

        // 15. Target List Object
        const createTargetListObject = async (targetObj: { id: number; apiName: string }) => {
            const targetListObj = await tx.objectDefinition.create({
                data: {
                    organizationId,
                    apiName: "target_list",
                    label: "Target List",
                    pluralLabel: "Target Lists",
                    icon: "List",
                    isSystem: true,
                    description: "Represents a list of targets for campaigns.",
                },
            });

            await tx.fieldDefinition.createMany({
                data: [
                    { objectDefId: targetListObj.id, apiName: "name", label: "List Name", type: "Text", required: true },
                    { objectDefId: targetListObj.id, apiName: "target_type", label: "Target Type", type: "Picklist", required: true },
                    { objectDefId: targetListObj.id, apiName: "filters", label: "Filters", type: "TextArea" },
                    { objectDefId: targetListObj.id, apiName: "targets", label: "Targets", type: "Lookup", lookupTargetId: targetObj.id },
                ],
            });
            const targetListTypeField = await tx.fieldDefinition.findFirst({
                where: { objectDefId: targetListObj.id, apiName: "target_type" },
                select: { id: true },
            });
            await createPicklistOptions(targetListTypeField?.id, ["Static", "Dynamic"]);
            await createDefaultListView(targetListObj.id, targetListObj.pluralLabel);
            return targetListObj;
        };

        const contractObj = await createContractObject(companyObj);
        const targetObj = await createTargetObject(companyObj, contactObj);
        const targetListObj = await createTargetListObject(targetObj);

        const seededObjects: Array<{ id: number; apiName: string }> = [
            { id: userObj.id, apiName: USER_OBJECT_API_NAME },
            { id: companyObj.id, apiName: companyObj.apiName },
            { id: contactObj.id, apiName: contactObj.apiName },
            { id: opportunityObj.id, apiName: opportunityObj.apiName },
            { id: caseObj.id, apiName: caseObj.apiName },
            { id: leadObj.id, apiName: leadObj.apiName },
            { id: taskObj.id, apiName: taskObj.apiName },
            { id: productObj.id, apiName: productObj.apiName },
            { id: noteObj.id, apiName: noteObj.apiName },
            { id: callObj.id, apiName: callObj.apiName },
            { id: meetingObj.id, apiName: meetingObj.apiName },
            { id: documentObj.id, apiName: documentObj.apiName },
            { id: activityObj.id, apiName: activityObj.apiName },
            { id: contractObj.id, apiName: contractObj.apiName },
            { id: targetObj.id, apiName: targetObj.apiName },
            { id: targetListObj.id, apiName: targetListObj.apiName },
        ];

        const appSetup = await createDefaultAppAndPermissionSets(tx, organizationId, seededObjects);

        return {
            userObj,
            contactObj,
            companyObj,
            opportunityObj,
            caseObj,
            leadObj,
            taskObj,
            productObj,
            noteObj,
            callObj,
            meetingObj,
            documentObj,
            activityObj,
            contractObj,
            targetObj,
            targetListObj,
            app: appSetup.app,
            ownerPermissionSet: appSetup.permissionSets.Owner,
        };
    });
}
