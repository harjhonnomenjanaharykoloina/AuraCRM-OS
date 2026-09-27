import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    // 1. Find the Jira Agent permission set
    const jiraAgentSet = await prisma.permissionSet.findFirst({
        where: { organizationId: 1, name: "Jira Agent" },
        select: { id: true, name: true },
    });
    console.log("Jira Agent permission set:", jiraAgentSet);

    // 2. Find the Jira app definition
    const jiraApp = await prisma.appDefinition.findFirst({
        where: { organizationId: 1, apiName: "jira" },
        select: { id: true, name: true, apiName: true },
    });
    console.log("Jira app:", jiraApp);

    if (!jiraAgentSet || !jiraApp) {
        console.error("❌ Missing permission set or app - cannot proceed");
        return;
    }

    // 3. Ensure app permission link exists
    let appPerm = await prisma.appPermission.findFirst({
        where: { permissionSetId: jiraAgentSet.id, appId: jiraApp.id },
    });
    if (!appPerm) {
        appPerm = await prisma.appPermission.create({
            data: { permissionSetId: jiraAgentSet.id, appId: jiraApp.id },
        });
        console.log("✅ Created app permission link:", appPerm);
    } else {
        console.log("App permission link:", appPerm);
    }

    // 4. Check if developer is already assigned
    const existing = await prisma.permissionSetAssignment.findFirst({
        where: { userId: 7, permissionSetId: jiraAgentSet.id },
    });
    console.log("Existing assignment:", existing);

    // 5. If not assigned, create the assignment
    if (!existing) {
        await prisma.permissionSetAssignment.create({
            data: {
                userId: 7,
                permissionSetId: jiraAgentSet.id,
            },
        });
        console.log("✅ Assigned developer (ID 7) to Jira Agent permission set");
    } else {
        console.log("✅ developer already has Jira Agent permission set");
    }

    // 6. Verify the assignment
    const assignment = await prisma.permissionSetAssignment.findFirst({
        where: { userId: 7 },
        include: { permissionSet: { select: { name: true } } },
    });
    console.log("Developer permission assignments:", assignment);
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
