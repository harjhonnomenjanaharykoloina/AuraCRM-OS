import PgBoss from "pg-boss";

// Use globalThis to preserve the boss instance across HMR module re-evaluations
const globalForBoss = globalThis as unknown as {
    boss: PgBoss | null;
    bossStart: Promise<PgBoss> | null;
};

// Graceful shutdown: stop pg-boss and disconnect when the process exits
if (!globalForBoss.boss) {
    const shutdown = async () => {
        if (globalForBoss.boss) {
            try {
                await globalForBoss.boss.stop({ timeout: 5000 });
            } catch (e) {
                console.error("Error stopping pg-boss:", e);
            } finally {
                globalForBoss.boss = null;
            }
        }
        process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}

export async function getBoss(): Promise<PgBoss> {
    if (globalForBoss.boss) return globalForBoss.boss;
    if (globalForBoss.bossStart) return globalForBoss.bossStart;

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error("DATABASE_URL is not set");
    }

    const boss = new PgBoss({ connectionString, schema: "pgboss" });
    boss.on("error", (error) => {
        console.error("pg-boss error:", error);
    });

    globalForBoss.bossStart = boss.start().then(() => {
        globalForBoss.boss = boss;
        globalForBoss.bossStart = null;
        return boss;
    }).catch((error) => {
        globalForBoss.bossStart = null;
        throw error;
    });

    return globalForBoss.bossStart;
}

export async function disconnectBoss() {
    if (globalForBoss.boss) {
        await globalForBoss.boss.stop({ timeout: 5000 });
        globalForBoss.boss = null;
    }
    globalForBoss.bossStart = null;
}
