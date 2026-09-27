import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { ensureUserCompanionRecord } from "../src/lib/user-companion";

const connectionString = "postgresql://auracrm:auracrm@localhost:5433/aura-crm";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const hashedPassword = await bcrypt.hash("123123", 10);

    const user = await prisma.user.create({
        data: {
            organizationId: 1,
            name: "Dev User",
            username: "developer",
            email: "developer@demo.com",
            password: hashedPassword,
            userType: "standard",
            emailVerified: true,
        },
    });

    await ensureUserCompanionRecord(prisma, 1, user.id);

    console.log("Created user:");
    console.log(JSON.stringify({
        id: user.id,
        username: user.username,
        email: user.email,
        password: hashedPassword,
        userType: user.userType,
    }, null, 2));
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
