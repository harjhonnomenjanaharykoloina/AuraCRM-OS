import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("Finding Account records with providerId = \"username\"...");

    const accounts = await prisma.account.findMany({
        where: { providerId: "username" },
    });

    if (accounts.length === 0) {
        console.log("No records found. Nothing to fix.");
        return;
    }

    console.log(`Found ${accounts.length} account record(s) to fix.`);

    for (const account of accounts) {
        const existing = await prisma.account.findFirst({
            where: {
                providerId: "credential",
                accountId: String(account.userId),
            },
        });

        if (existing) {
            // A credential record already exists for this user
            // Delete the old username record to avoid duplicates
            await prisma.account.delete({
                where: { id: account.id },
            });
            console.log(`  Deleted duplicate username account ${account.id} (userId: ${account.userId}) — credential record already exists`);
        } else {
            await prisma.account.update({
                where: { id: account.id },
                data: {
                    providerId: "credential",
                    accountId: String(account.userId),
                },
            });
            console.log(`  Fixed account ${account.id} (userId: ${account.userId})`);
        }
    }

    console.log(`✅ Fixed ${accounts.length} account record(s).`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
