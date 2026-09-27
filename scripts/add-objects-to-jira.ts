import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
    const jiraApp = await db.appDefinition.findFirst({
        where: { organizationId: 1, apiName: "jira" },
        select: { id: true, name: true },
    });
    console.log("Jira app:", jiraApp);

    if (!jiraApp) {
        console.log("❌ Jira app not found — aborting.");
        return;
    }

    const objectApiNames = [
        "issue", "project", "epic", "appointment", "case", "contact",
        "company", "invoice", "opportunity", "patient", "provider", "task", "user"
    ];

    let sortOrder = 0;

    for (const apiName of objectApiNames) {
        const obj = await db.objectDefinition.findFirst({
            where: { organizationId: 1, apiName },
            select: { id: true, label: true, apiName: true },
        });
        if (!obj) {
            console.log(`⚠️ Object "${apiName}" not found, skipping`);
            continue;
        }

        // Find existing default layout
        const layout = await db.recordPageLayout.findFirst({
            where: { objectDefId: obj.id, isDefault: true },
            select: { id: true },
        });

        // Create AppNavItem if not exists
        const existingNav = await db.appNavItem.findFirst({
            where: { appId: jiraApp.id, objectDefId: obj.id },
        });
        if (!existingNav) {
            await db.appNavItem.create({
                data: { appId: jiraApp.id, objectDefId: obj.id, sortOrder: sortOrder++ },
            });
            console.log(`✅ Nav item created: ${obj.label} → Jira app (sortOrder: ${sortOrder - 1})`);
        } else {
            console.log(`ℹ️ Nav item already exists: ${obj.label}`);
        }

        // Create RecordPageAssignment if not exists and layout exists
        if (layout) {
            const existingAssignment = await db.recordPageAssignment.findFirst({
                where: { appId: jiraApp.id, objectDefId: obj.id },
            });
            if (!existingAssignment) {
                await db.recordPageAssignment.create({
                    data: {
                        organizationId: 1,
                        objectDefId: obj.id,
                        appId: jiraApp.id,
                        layoutId: layout.id,
                    },
                });
                console.log(`✅ Record page assignment: ${obj.label} → Jira app (layout: ${layout.id})`);
            } else {
                console.log(`ℹ️ Record page already assigned: ${obj.label}`);
            }
        } else {
            console.log(`⚠️ No default layout for ${obj.label} — assign manually via UI`);
        }
    }

    // Print final summary
    const navCount = await db.appNavItem.count({ where: { appId: jiraApp.id } });
    const assignmentCount = await db.recordPageAssignment.count({ where: { appId: jiraApp.id } });
    console.log(`\n📊 Jira app now has ${navCount} nav items and ${assignmentCount} record page assignments.`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
}).finally(async () => {
    await db.$disconnect();
    await pool.end();
});
