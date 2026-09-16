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

    // Check if admin user already exists
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
        console.log("Admin user already exists.");
        return;
    }

    console.log("Creating admin user and organization...");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create organization
    const organization = await prisma.organization.create({
        data: { name: orgName, slug: "demo-organization" },
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

    // Create Account record (required by better-auth username plugin)
    await prisma.account.create({
        data: {
            id: crypto.randomUUID(),
            userId: user.id,
            accountId: username,
            providerId: "username",
            password: hashedPassword,
        },
    });

    // Link organization owner
    await prisma.organization.update({
        where: { id: organization.id },
        data: { ownerId: user.id },
    });

    console.log("✅ Admin user created successfully!");
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Email: ${email}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => {
    await prisma.$disconnect();
    await pool.end();
});
