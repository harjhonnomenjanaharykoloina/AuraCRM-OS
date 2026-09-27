import "dotenv/config";
import { PrismaClient, OrganizationMemberRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const userId = 7;
    const username = "developer";
    const password = "123123";

    console.log(`🔧 Fixing credential login for user: ${username} (id: ${userId})`);

    const user = await prisma.user.findUnique({
        where: { id: userId },
    });
    if (!user) {
        throw new Error(`User with id ${userId} not found.`);
    }
    console.log(`✅ Found user: ${user.username} (${user.email})`);

    const existingAccount = await prisma.account.findFirst({
        where: {
            userId,
            providerId: "credential",
        },
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    if (existingAccount) {
        console.log("⚠️  Existing credential Account record found — updating password.");
        await prisma.account.update({
            where: { id: existingAccount.id },
            data: { password: hashedPassword, accountId: String(userId) },
        });
    } else {
        console.log("👤 No credential Account record found — creating one.");
        await prisma.account.create({
            data: {
                id: crypto.randomUUID(),
                userId,
                accountId: String(userId),
                providerId: "credential",
                password: hashedPassword,
            },
        });
    }

    const existingMembership = await prisma.organizationMember.findFirst({
        where: { userId, organizationId: user.organizationId },
    });

    if (existingMembership) {
        console.log("⚠️  Existing OrganizationMember record found — updating role to org_member.");
        await prisma.organizationMember.update({
            where: { id: existingMembership.id },
            data: { role: OrganizationMemberRole.org_member, isActive: true, isDefault: false },
        });
    } else {
        console.log("👥 No OrganizationMember record found — creating one.");
        await prisma.organizationMember.create({
            data: {
                userId,
                organizationId: user.organizationId ?? 1,
                role: OrganizationMemberRole.org_member,
                isDefault: false,
                isActive: true,
            },
        });
    }

    console.log("\n📋 Verification:");
    const accountRow = await prisma.account.findFirst({
        where: { userId, providerId: "credential" },
        select: { id: true, userId: true, providerId: true, accountId: true, password: true },
    });
    console.log("   Account record:", accountRow ? `✅ created (providerId=${accountRow.providerId}, accountId=${accountRow.accountId})` : "❌ MISSING");

    const memberRow = await prisma.organizationMember.findFirst({
        where: { userId, organizationId: user.organizationId ?? 1 },
        select: { userId: true, organizationId: true, role: true, isActive: true, isDefault: true },
    });
    console.log("   OrgMember record:", memberRow ? `✅ created (role=${memberRow.role}, isActive=${memberRow.isActive})` : "❌ MISSING");

    console.log("\n🎉 Done. The `developer` user can now log in with username `developer` / password `123123`.");
}

main()
    .catch((e) => {
        console.error("❌ Script failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
