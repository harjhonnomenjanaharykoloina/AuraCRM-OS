import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const email = "admin@demo.com";
    const username = "admin";
    const password = "admin123";
    const orgName = "Demo Organization";

    console.log("🌱 Seeding demo data...");

    // Check if admin user already exists
    const existingUser = await prisma.user.findUnique({
        where: { username },
    });

    if (existingUser) {
        console.log("⚠️  Admin user already exists, skipping user creation.");
    } else {
        console.log("👤 Creating admin user...");
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create organization
        const organization = await prisma.organization.create({
            data: {
                name: orgName,
                slug: "demo-organization",
            },
        });

        // Create user
        const user = await prisma.user.create({
            data: {
                name: "Admin",
                username,
                email,
                password: hashedPassword,
                userType: "admin",
                organizationId: organization.id,
                emailVerified: true,
            },
        });

        // Create Account record for better-auth username login
        await prisma.account.create({
            data: {
                id: crypto.randomUUID(),
                userId: user.id,
                accountId: String(user.id),
                providerId: "credential",
                password: hashedPassword,
            },
        });

        // Link organization owner
        await prisma.organization.update({
            where: { id: organization.id },
            data: { ownerId: user.id },
        });

        console.log(`✅ Admin user created: ${username} / ${password}`);
        console.log(`✅ Organization created: ${orgName} (id: ${organization.id})`);
    }

    // Now seed demo data using the same pattern as seed-demo-data.ts
    console.log("\n🏗️  Seeding demo data (apps, objects, etc.)...");
    await seedDemoData(prisma, 1);

    console.log("\n🎉 Demo seeding complete!");
    console.log("\n📋 Login credentials:");
    console.log("   Username: admin");
    console.log("   Password: admin123");
    console.log("   URL: http://localhost:3000/login");
}

async function seedDemoData(prisma: PrismaClient, organizationId: number) {
    const adminUserId = 1; // The admin user we just created
    const adminEmail = "admin@demo.com";
    const [emailLocal, emailDomain] = adminEmail.split("@");
    const baseUsername = "demo";

    const hashedPassword = await bcrypt.hash("123123", 10);

    const buildUserIdentity = (index: number) => ({
        email: `${emailLocal}.user${index}@${emailDomain}`,
        username: `${baseUsername}user${index}`,
    });

    await prisma.$transaction(async (tx) => {
        // Groups
        const adminGroup = await tx.group.create({
            data: { organizationId, name: "Admin Group", description: "Administrators across all apps." },
        });
        const jiraGroup = await tx.group.create({
            data: { organizationId, name: "Jira Team", description: "Delivery team for Jira projects and issues." },
        });
        const healthGroup = await tx.group.create({
            data: { organizationId, name: "Healthcare Team", description: "Clinical staff with shared access to patient records." },
        });

        await tx.user.update({
            where: { id: adminUserId },
            data: { groupId: adminGroup.id },
        });

        // Queues
        const jiraQueue = await tx.queue.create({
            data: { organizationId, name: "Jira Triage", description: "Critical issues awaiting assignment." },
        });
        const healthQueue = await tx.queue.create({
            data: { organizationId, name: "Health Intake", description: "Incoming appointments to be routed." },
        });

        // Demo users
        const demoUsers = [
            { identity: buildUserIdentity(2), name: "Jira Lead", groupId: jiraGroup.id },
            { identity: buildUserIdentity(3), name: "Jira Developer", groupId: jiraGroup.id },
            { identity: buildUserIdentity(4), name: "Jira QA", groupId: jiraGroup.id },
            { identity: buildUserIdentity(5), name: "Clinic Manager", groupId: healthGroup.id },
            { identity: buildUserIdentity(6), name: "Nurse Taylor", groupId: healthGroup.id },
        ];

        const createdUsers = [];
        for (const { identity, name, groupId } of demoUsers) {
            const user = await tx.user.create({
                data: {
                    organizationId,
                    name,
                    username: identity.username,
                    email: identity.email,
                    password: hashedPassword,
                    userType: "standard",
                    groupId,
                },
            });
            await tx.account.create({
                data: {
                    id: crypto.randomUUID(),
                    userId: user.id,
                    accountId: String(user.id),
                    providerId: "credential",
                    password: hashedPassword,
                },
            });
            createdUsers.push(user);
        }

        // User companion records for demo users (skip admin - createOrgTemplate handles differently)
        const jiraUsers = [createdUsers[0].id, createdUsers[1].id, createdUsers[2].id];
        const healthUsers = [createdUsers[3].id, createdUsers[4].id];

        await tx.queueMember.createMany({
            data: [
                ...jiraUsers.map((userId) => ({ queueId: jiraQueue.id, userId })),
                ...healthUsers.map((userId) => ({ queueId: healthQueue.id, userId })),
            ],
        });

        // Apps
        const jiraApp = await tx.appDefinition.create({
            data: { organizationId, name: "Jira", apiName: "jira", description: "Projects, epics, and issue tracking", icon: "KanbanSquare" },
        });
        const healthcareApp = await tx.appDefinition.create({
            data: { organizationId, name: "Healthcare", apiName: "healthcare", description: "Patients, providers, and appointments", icon: "HeartPulse" },
        });

        // Jira Objects
        const projectObj = await tx.objectDefinition.create({
            data: { organizationId, apiName: "project", label: "Project", pluralLabel: "Projects", icon: "FolderKanban", description: "Jira projects" },
        });
        const epicObj = await tx.objectDefinition.create({
            data: { organizationId, apiName: "epic", label: "Epic", pluralLabel: "Epics", icon: "Flag", description: "Epic-level initiatives" },
        });
        const issueObj = await tx.objectDefinition.create({
            data: { organizationId, apiName: "issue", label: "Issue", pluralLabel: "Issues", icon: "Bug", description: "Stories, tasks, and bugs" },
        });

        // Healthcare Objects
        const providerObj = await tx.objectDefinition.create({
            data: { organizationId, apiName: "provider", label: "Provider", pluralLabel: "Providers", icon: "Stethoscope", description: "Clinicians and staff" },
        });
        const patientObj = await tx.objectDefinition.create({
            data: { organizationId, apiName: "patient", label: "Patient", pluralLabel: "Patients", icon: "UserRound", description: "Patient records" },
        });
        const appointmentObj = await tx.objectDefinition.create({
            data: { organizationId, apiName: "appointment", label: "Appointment", pluralLabel: "Appointments", icon: "CalendarClock", description: "Visits and consultations" },
        });

        // Create fields for each object
        const createFields = async (obj: any, fields: any[]) => {
            return tx.fieldDefinition.createMany({ data: fields.map(f => ({ ...f, objectDefId: obj.id })) });
        };

        await createFields(projectObj, [
            { apiName: "name", label: "Project Name", type: "Text", required: true },
            { apiName: "key", label: "Project Key", type: "Text" },
            { apiName: "status", label: "Status", type: "Picklist" },
            { apiName: "start_date", label: "Start Date", type: "Date" },
            { apiName: "end_date", label: "Target End", type: "Date" },
            { apiName: "lead", label: "Project Lead", type: "Text" },
        ]);

        await createFields(epicObj, [
            { apiName: "name", label: "Epic Name", type: "Text", required: true },
            { apiName: "status", label: "Status", type: "Picklist" },
            { apiName: "project", label: "Project", type: "Lookup", lookupTargetId: projectObj.id },
            { apiName: "owner", label: "Owner", type: "Text" },
            { apiName: "target_date", label: "Target Date", type: "Date" },
        ]);

        await createFields(issueObj, [
            { apiName: "name", label: "Summary", type: "Text", required: true },
            { apiName: "status", label: "Status", type: "Picklist" },
            { apiName: "priority", label: "Priority", type: "Picklist" },
            { apiName: "issue_type", label: "Type", type: "Picklist" },
            { apiName: "points", label: "Story Points", type: "Number" },
            { apiName: "due_date", label: "Due Date", type: "Date" },
            { apiName: "project", label: "Project", type: "Lookup", lookupTargetId: projectObj.id },
            { apiName: "epic", label: "Epic", type: "Lookup", lookupTargetId: epicObj.id },
            { apiName: "assignee", label: "Assignee", type: "Text" },
            { apiName: "reporter", label: "Reporter", type: "Text" },
            { apiName: "blocked", label: "Blocked", type: "Checkbox" },
        ]);

        await createFields(providerObj, [
            { apiName: "name", label: "Provider Name", type: "Text", required: true },
            { apiName: "specialty", label: "Specialty", type: "Picklist" },
            { apiName: "email", label: "Email", type: "Email" },
            { apiName: "phone", label: "Phone", type: "Phone" },
        ]);

        await createFields(patientObj, [
            { apiName: "name", label: "Full Name", type: "Text", required: true },
            { apiName: "email", label: "Email", type: "Email" },
            { apiName: "phone", label: "Phone", type: "Phone" },
            { apiName: "dob", label: "Date of Birth", type: "Date" },
            { apiName: "insurance", label: "Insurance", type: "Picklist" },
            { apiName: "status", label: "Status", type: "Picklist" },
            { apiName: "high_risk", label: "High Risk", type: "Checkbox" },
        ]);

        await createFields(appointmentObj, [
            { apiName: "name", label: "Visit Title", type: "Text", required: true },
            { apiName: "date", label: "Date", type: "Date" },
            { apiName: "status", label: "Status", type: "Picklist" },
            { apiName: "patient", label: "Patient", type: "Lookup", lookupTargetId: patientObj.id },
            { apiName: "provider", label: "Provider", type: "Lookup", lookupTargetId: providerObj.id },
            { apiName: "reason", label: "Reason", type: "Text" },
            { apiName: "follow_up", label: "Follow Up Needed", type: "Checkbox" },
        ]);

        // Default list views
        const createDefaultListView = async (objectDefId: number, pluralLabel: string, columnApiNames: string[]) => {
            const fields = await tx.fieldDefinition.findMany({ where: { objectDefId }, select: { id: true, apiName: true } });
            const fieldByApi = new Map(fields.map((f) => [f.apiName, f.id]));
            const columns = columnApiNames.map((a) => fieldByApi.get(a)).filter((id): id is number => Boolean(id));
            if (columns.length === 0) return;
            await tx.listView.create({
                data: {
                    organizationId, objectDefId, name: `All ${pluralLabel}`, isDefault: true, isGlobal: true,
                    criteria: { logic: "ALL", filters: [], ownerScope: "any", ownerQueueId: null },
                    columns: { create: columns.map((fieldDefId, index) => ({ fieldDefId, sortOrder: index })) },
                },
            });
        };

        await createDefaultListView(projectObj.id, projectObj.pluralLabel, ["name", "key", "status", "lead"]);
        await createDefaultListView(epicObj.id, epicObj.pluralLabel, ["name", "status", "project", "owner"]);
        await createDefaultListView(issueObj.id, issueObj.pluralLabel, ["name", "status", "priority", "assignee"]);
        await createDefaultListView(providerObj.id, providerObj.pluralLabel, ["name", "specialty", "email"]);
        await createDefaultListView(patientObj.id, patientObj.pluralLabel, ["name", "status", "insurance", "phone"]);
        await createDefaultListView(appointmentObj.id, appointmentObj.pluralLabel, ["name", "date", "status", "patient"]);

        // Create a User object (like createOrgTemplate does)
        const userObj = await tx.objectDefinition.create({
            data: { organizationId, apiName: "user", label: "User", pluralLabel: "Users", icon: "Users", isSystem: true, description: "Represents an application user." },
        });
        await tx.fieldDefinition.createMany({
            data: [
                { objectDefId: userObj.id, apiName: "name", label: "Name", type: "Text", required: true },
                { objectDefId: userObj.id, apiName: "user_id", label: "UserId", type: "Text", required: true, isExternalId: true, isUnique: true },
            ],
        });
        await createDefaultListView(userObj.id, userObj.pluralLabel, ["name", "user_id"]);

        // Company object
        const companyObj = await tx.objectDefinition.create({
            data: { organizationId, apiName: "company", label: "Company", pluralLabel: "Companies", icon: "Building", isSystem: true, description: "Represents a business or account." },
        });
        await tx.fieldDefinition.createMany({
            data: [
                { objectDefId: companyObj.id, apiName: "name", label: "Company Name", type: "Text", required: true },
                { objectDefId: companyObj.id, apiName: "website", label: "Website", type: "Url" },
                { objectDefId: companyObj.id, apiName: "industry", label: "Industry", type: "Picklist" },
            ],
        });
        const companyIndustryField = await tx.fieldDefinition.findFirst({ where: { objectDefId: companyObj.id, apiName: "industry" }, select: { id: true } });
        if (companyIndustryField) {
            await tx.picklistOption.createMany({ data: ["Tech", "Finance", "Retail", "Other"].map((label, index) => ({ organizationId, fieldDefId: companyIndustryField.id, apiName: label.toLowerCase(), label, sortOrder: index, isActive: true })) });
        }
        await createDefaultListView(companyObj.id, companyObj.pluralLabel, ["name", "website", "industry"]);

        // Contact object
        const contactObj = await tx.objectDefinition.create({
            data: { organizationId, apiName: "contact", label: "Contact", pluralLabel: "Contacts", icon: "User", isSystem: true, description: "Represents a person." },
        });
        await tx.fieldDefinition.createMany({
            data: [
                { objectDefId: contactObj.id, apiName: "name", label: "Full Name", type: "Text", required: true },
                { objectDefId: contactObj.id, apiName: "first_name", label: "First Name", type: "Text", required: true },
                { objectDefId: contactObj.id, apiName: "last_name", label: "Last Name", type: "Text", required: true },
                { objectDefId: contactObj.id, apiName: "email", label: "Email", type: "Email" },
                { objectDefId: contactObj.id, apiName: "phone", label: "Phone", type: "Phone" },
                { objectDefId: contactObj.id, apiName: "title", label: "Title", type: "Text" },
                { objectDefId: contactObj.id, apiName: "company", label: "Company", type: "Lookup", lookupTargetId: companyObj.id },
            ],
        });
        await createDefaultListView(contactObj.id, contactObj.pluralLabel, ["name", "email", "phone"]);

        // Opportunity object
        const opportunityObj = await tx.objectDefinition.create({
            data: { organizationId, apiName: "opportunity", label: "Opportunity", pluralLabel: "Opportunities", icon: "DollarSign", isSystem: true, description: "Represents a potential deal." },
        });
        await tx.fieldDefinition.createMany({
            data: [
                { objectDefId: opportunityObj.id, apiName: "name", label: "Opportunity Name", type: "Text", required: true },
                { objectDefId: opportunityObj.id, apiName: "amount", label: "Amount", type: "Number" },
                { objectDefId: opportunityObj.id, apiName: "stage", label: "Stage", type: "Picklist", required: true },
                { objectDefId: opportunityObj.id, apiName: "close_date", label: "Close Date", type: "Date" },
                { objectDefId: opportunityObj.id, apiName: "company", label: "Company", type: "Lookup", lookupTargetId: companyObj.id },
            ],
        });
        const opportunityStageField = await tx.fieldDefinition.findFirst({ where: { objectDefId: opportunityObj.id, apiName: "stage" }, select: { id: true } });
        if (opportunityStageField) {
            await tx.picklistOption.createMany({ data: ["Prospecting", "Negotiation", "Closed Won", "Closed Lost"].map((label, index) => ({ organizationId, fieldDefId: opportunityStageField.id, apiName: label.toLowerCase(), label, sortOrder: index, isActive: true })) });
        }
        await createDefaultListView(opportunityObj.id, opportunityObj.pluralLabel, ["name", "stage", "amount"]);

        // Case object
        const caseObj = await tx.objectDefinition.create({
            data: { organizationId, apiName: "case", label: "Case", pluralLabel: "Cases", icon: "Briefcase", isSystem: true, description: "Represents a support issue." },
        });
        await tx.fieldDefinition.createMany({
            data: [
                { objectDefId: caseObj.id, apiName: "name", label: "Case Number", type: "AutoNumber", required: false, options: { autoNumber: { prefix: "CASE-", minDigits: 4, nextValue: 1 } } },
                { objectDefId: caseObj.id, apiName: "subject", label: "Subject", type: "Text", required: true },
                { objectDefId: caseObj.id, apiName: "description", label: "Description", type: "Text" },
                { objectDefId: caseObj.id, apiName: "status", label: "Status", type: "Picklist", required: true },
                { objectDefId: caseObj.id, apiName: "priority", label: "Priority", type: "Picklist" },
                { objectDefId: caseObj.id, apiName: "company", label: "Company", type: "Lookup", lookupTargetId: companyObj.id },
            ],
        });
        const caseStatusField = await tx.fieldDefinition.findFirst({ where: { objectDefId: caseObj.id, apiName: "status" }, select: { id: true } });
        const casePriorityField = await tx.fieldDefinition.findFirst({ where: { objectDefId: caseObj.id, apiName: "priority" }, select: { id: true } });
        if (caseStatusField) {
            await tx.picklistOption.createMany({ data: ["New", "Open", "Closed"].map((label, index) => ({ organizationId, fieldDefId: caseStatusField.id, apiName: label.toLowerCase(), label, sortOrder: index, isActive: true })) });
        }
        if (casePriorityField) {
            await tx.picklistOption.createMany({ data: ["Low", "Medium", "High"].map((label, index) => ({ organizationId, fieldDefId: casePriorityField.id, apiName: label.toLowerCase(), label, sortOrder: index, isActive: true })) });
        }
        await createDefaultListView(caseObj.id, caseObj.pluralLabel, ["name", "subject", "status", "priority"]);

        // Queue + Group default (from createOrgTemplate)
        await tx.queue.create({ data: { organizationId, name: "Unassigned", description: "Default queue for new records." } });
        await tx.group.create({ data: { organizationId, name: "All Users", description: "Default sharing group." } });

        // Create permission sets
        const orgAdminSet = await tx.permissionSet.create({ data: { organizationId, name: "Org Admin", description: "Full access to all demo objects", allowDataLoading: true } });
        const jiraAdminSet = await tx.permissionSet.create({ data: { organizationId, name: "Jira Admin", description: "Manage Jira projects and issues", allowDataLoading: true } });
        const jiraAgentSet = await tx.permissionSet.create({ data: { organizationId, name: "Jira Agent", description: "Work on Jira issues" } });
        const healthAdminSet = await tx.permissionSet.create({ data: { organizationId, name: "Health Admin", description: "Manage patient operations", allowDataLoading: true } });
        const healthStaffSet = await tx.permissionSet.create({ data: { organizationId, name: "Health Staff", description: "Handle appointments and patient intake" } });

        const jiraObjectIds = [projectObj.id, epicObj.id, issueObj.id];
        const healthObjectIds = [patientObj.id, appointmentObj.id, providerObj.id];
        const allObjectIds = [...jiraObjectIds, ...healthObjectIds];

        const createObjectPermissions = async (permissionSetId: number, objectIds: number[], permissions: any) => {
            await tx.objectPermission.createMany({ data: objectIds.map((objectDefId) => ({ permissionSetId, objectDefId, ...permissions })) });
        };

        await createObjectPermissions(orgAdminSet.id, allObjectIds, { allowRead: true, allowCreate: true, allowEdit: true, allowDelete: true, allowViewAll: true, allowModifyAll: true, allowModifyListViews: true });
        await createObjectPermissions(jiraAdminSet.id, jiraObjectIds, { allowRead: true, allowCreate: true, allowEdit: true, allowDelete: true, allowViewAll: true, allowModifyAll: true, allowModifyListViews: true });
        await createObjectPermissions(jiraAgentSet.id, jiraObjectIds, { allowRead: true, allowCreate: true, allowEdit: true, allowDelete: false, allowViewAll: false, allowModifyAll: false, allowModifyListViews: false });
        await createObjectPermissions(healthAdminSet.id, healthObjectIds, { allowRead: true, allowCreate: true, allowEdit: true, allowDelete: true, allowViewAll: true, allowModifyAll: true, allowModifyListViews: true });
        await createObjectPermissions(healthStaffSet.id, healthObjectIds, { allowRead: true, allowCreate: true, allowEdit: true, allowDelete: false, allowViewAll: false, allowModifyAll: false, allowModifyListViews: false });

        // Permission assignments for demo users
        const jiraLeadId = createdUsers[0].id;
        const jiraDevId = createdUsers[1].id;
        const jiraQaId = createdUsers[2].id;
        const clinicMgrId = createdUsers[3].id;
        const nurseId = createdUsers[4].id;

        await tx.permissionSetAssignment.createMany({
            data: [
                { userId: jiraLeadId, permissionSetId: jiraAdminSet.id },
                { userId: jiraDevId, permissionSetId: jiraAgentSet.id },
                { userId: jiraQaId, permissionSetId: jiraAgentSet.id },
                { userId: clinicMgrId, permissionSetId: healthAdminSet.id },
                { userId: nurseId, permissionSetId: healthStaffSet.id },
            ],
        });

        // Admin user gets org admin permission
        await tx.permissionSetAssignment.create({ data: { userId: adminUserId, permissionSetId: orgAdminSet.id } });

        // Dashboard widgets for Jira
        await tx.dashboardWidget.createMany({
            data: [
                { appId: jiraApp.id, objectDefId: issueObj.id, type: "metric", title: "In Progress Issues", sortOrder: 0, layout: { colSpan: 3 }, config: { objectDefId: issueObj.id, aggregation: "count", filters: [{ id: "issue-status-in-progress", fieldDefId: 1, operator: "equals", value: "1", filterLogic: "ALL", colorTheme: "ocean", icon: "Gauge", color: "#2563eb" }] } },
                { appId: jiraApp.id, objectDefId: issueObj.id, type: "metric", title: "Critical Issues", sortOrder: 1, layout: { colSpan: 3 }, config: { objectDefId: issueObj.id, aggregation: "count", filters: [{ id: "issue-priority-critical", fieldDefId: 2, operator: "equals", value: "1", filterLogic: "ALL", colorTheme: "sunset", icon: "AlertTriangle", color: "#f97316" }] } },
                { appId: jiraApp.id, objectDefId: projectObj.id, type: "list", title: "Projects Near Target", sortOrder: 3, layout: { colSpan: 6 }, config: { objectDefId: projectObj.id, limit: 6, fieldDefIds: [1, 5], sortFieldDefId: 5, sortDirection: "asc", filterLogic: "ALL", colorTheme: "indigo", icon: "FolderKanban", color: "#4f46e5" } },
            ],
        });

        // Dashboard widgets for Healthcare
        await tx.dashboardWidget.createMany({
            data: [
                { appId: healthcareApp.id, objectDefId: patientObj.id, type: "metric", title: "Active Patients", sortOrder: 0, layout: { colSpan: 3 }, config: { objectDefId: patientObj.id, aggregation: "count", filters: [{ id: "patient-status-active", fieldDefId: 5, operator: "equals", value: "1", filterLogic: "ALL", colorTheme: "forest", icon: "Users", color: "#10b981" }] } },
                { appId: healthcareApp.id, objectDefId: appointmentObj.id, type: "metric", title: "Scheduled Visits", sortOrder: 1, layout: { colSpan: 3 }, config: { objectDefId: appointmentObj.id, aggregation: "count", filters: [{ id: "appointment-status-scheduled", fieldDefId: 1, operator: "equals", value: "1", filterLogic: "ALL", colorTheme: "sky", icon: "CalendarClock", color: "#0ea5e9" }] } },
            ],
        });

        // App navigation items
        await tx.appNavItem.createMany({
            data: [
                { appId: jiraApp.id, objectDefId: issueObj.id, sortOrder: 0 },
                { appId: jiraApp.id, objectDefId: projectObj.id, sortOrder: 1 },
                { appId: jiraApp.id, objectDefId: epicObj.id, sortOrder: 2 },
                { appId: healthcareApp.id, objectDefId: patientObj.id, sortOrder: 0 },
                { appId: healthcareApp.id, objectDefId: appointmentObj.id, sortOrder: 1 },
                { appId: healthcareApp.id, objectDefId: providerObj.id, sortOrder: 2 },
            ],
        });

        // Record Page Assignments for Jira
        const createRecordPageLayout = async (objectDefId: number, name: string, highlightFields: string[]) => {
            const fields = await tx.fieldDefinition.findMany({ where: { objectDefId }, select: { id: true, apiName: true, required: true } });
            const fieldByApi = new Map(fields.map((f) => [f.apiName, f.id]));
            const highlightIds = highlightFields.map((a) => fieldByApi.get(a)).filter((id): id is number => Boolean(id));
            const config = { columns: fields.length, highlights: { columns: 4, fields: highlightIds.slice(0, 4) } };
            const layout = await tx.recordPageLayout.create({ data: { organizationId, objectDefId, name: `${name} Layout`, isDefault: true, config } });
            await tx.recordPageAssignment.create({ data: { organizationId, objectDefId, appId: (name === "Project" ? jiraApp.id : jiraApp.id), layoutId: layout.id } });
            return layout;
        };

        // Simplified - just create basic page layouts for all objects
        for (const obj of [projectObj, epicObj, issueObj, providerObj, patientObj, appointmentObj]) {
            const fields = await tx.fieldDefinition.findMany({ where: { objectDefId: obj.id }, select: { id: true } });
            if (fields.length > 0) {
                const layout = await tx.recordPageLayout.create({
                    data: { organizationId, objectDefId: obj.id, name: `${obj.label} Layout`, isDefault: true, config: { columns: fields.length, highlights: { columns: 4, fields: fields.slice(0, 4).map(f => f.id) } } },
                });
                const appId = (obj.apiName === "project" || obj.apiName === "epic" || obj.apiName === "issue") ? jiraApp.id : healthcareApp.id;
                await tx.recordPageAssignment.create({ data: { organizationId, objectDefId: obj.id, appId, layoutId: layout.id } });
            }
        }

        console.log("✅ Demo data seeded successfully!");
    });
}

main().catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
    await pool.end();
});
