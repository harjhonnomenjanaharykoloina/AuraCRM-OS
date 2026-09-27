import "dotenv/config";
import { PrismaClient, OrganizationMemberRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const BATCH_SIZE = 250;

async function main() {
    console.log("🔎 Scanning for users missing an OrganizationMember row...");

    const totalUsers = await prisma.user.count();

    console.log(`Found ${totalUsers} user(s) with an organizationId.`);

    const dbOrgOwners = await prisma.organization.findMany({
        where: { ownerId: { not: null } },
        select: { id: true, ownerId: true },
    });
    const ownerOrg = new Map<number, number>();
    for (const org of dbOrgOwners) {
        ownerOrg.set(org.ownerId!, org.id);
    }

    let processed = 0;
    let created = 0;
    let skipped = 0;

    while (processed < totalUsers) {
        const users = await prisma.user.findMany({
            select: { id: true, organizationId: true },
            skip: processed,
            take: BATCH_SIZE,
            orderBy: { id: "asc" },
        });

        if (users.length === 0) break;

        const userIds = users.map((u) => u.id);
        const existing = await prisma.organizationMember.findMany({
            where: { userId: { in: userIds } },
            select: { userId: true, organizationId: true },
        });
        const existingSet = new Set(existing.map((m) => `${m.userId}:${m.organizationId}`));

        const toCreate = users
            .filter((u) => !existingSet.has(`${u.id}:${u.organizationId}`))
            .map((u) => ({
                userId: u.id,
                organizationId: u.organizationId,
                role: u.organizationId === ownerOrg.get(u.id) ? OrganizationMemberRole.org_admin : OrganizationMemberRole.org_member,
                isDefault: true,
                isActive: true,
            }));

        skipped += users.length - toCreate.length;

        if (toCreate.length > 0) {
            const result = await prisma.organizationMember.createMany({
                data: toCreate,
                skipDuplicates: true,
            });
            created += result.count;
        }

        processed += users.length;
    }

    console.log(`✅ Migration complete. Created ${created} OrganizationMember row(s), skipped ${skipped} already-present membership(s).`);
}

main()
    .catch((e) => {
        console.error("❌ Migration failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
