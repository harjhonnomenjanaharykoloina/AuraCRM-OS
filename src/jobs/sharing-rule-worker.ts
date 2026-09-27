import PgBoss from "pg-boss";
import { recomputeSharingRulesForObject } from "../lib/sharing-rule-recompute";
import { SHARING_RULE_RECOMPUTE_JOB, SharingRuleRecomputePayload } from "../lib/jobs/sharing-rule-jobs";
import { IMPORT_PROCESS_JOB, ImportProcessPayload } from "../lib/jobs/import-jobs";
import { EMAIL_SEND_JOB, EmailSendPayload } from "../lib/jobs/email-jobs";
import { sendEmail } from "../lib/email/service";
import { processImportJob } from "../lib/import-processing";
import { logInfo, logError, logWarn, logDebug } from "@/lib/logger";

async function startWorker() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error("DATABASE_URL is not set");
    }

    logInfo("Worker started", { jobTypes: [SHARING_RULE_RECOMPUTE_JOB, IMPORT_PROCESS_JOB, EMAIL_SEND_JOB] });

    const boss = new PgBoss({ connectionString, schema: "pgboss" });
    boss.on("error", (error) => {
        logError("pg-boss worker error", { error: error instanceof Error ? error.message : String(error) });
    });

    await boss.start();

    await boss.createQueue(SHARING_RULE_RECOMPUTE_JOB);
    await boss.createQueue(IMPORT_PROCESS_JOB);
    await boss.createQueue(EMAIL_SEND_JOB);

    await boss.work<SharingRuleRecomputePayload>(SHARING_RULE_RECOMPUTE_JOB, async (jobs) => {
        for (const job of jobs) {
            const payload = job?.data ?? null;
            if (!payload?.organizationId || !payload?.objectDefId) {
                logWarn("Skipping sharing-rule.recompute job with missing payload", {
                    jobId: job?.id,
                    data: job?.data,
                });
                continue;
            }

            logDebug("Job received", { jobId: job?.id, queue: SHARING_RULE_RECOMPUTE_JOB, payload });

            try {
                const result = await recomputeSharingRulesForObject({
                    organizationId: payload.organizationId,
                    objectDefId: payload.objectDefId,
                });
                logInfo("Recompute completed", { jobId: job?.id, result });
            } catch (error) {
                logError("Job failed", {
                    jobId: job?.id,
                    queue: SHARING_RULE_RECOMPUTE_JOB,
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                });
            }
        }
    });

    await boss.work<ImportProcessPayload>(IMPORT_PROCESS_JOB, async (jobs) => {
        for (const job of jobs) {
            const payload = job?.data ?? null;
            if (!payload?.jobId) {
                logWarn("Skipping import.process job with missing payload", {
                    jobId: job?.id,
                    data: job?.data,
                });
                continue;
            }

            logDebug("Job received", { jobId: job?.id, queue: IMPORT_PROCESS_JOB, payload });

            try {
                await processImportJob(payload.jobId);
                logInfo("Import job completed", { jobId: job?.id });
            } catch (error) {
                logError("Import job failed", {
                    jobId: job?.id,
                    queue: IMPORT_PROCESS_JOB,
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                });
            }
        }
    });

    await boss.work<EmailSendPayload>(EMAIL_SEND_JOB, async (jobs) => {
        for (const job of jobs) {
            const payload = job?.data ?? null;
            if (!payload?.to || !payload?.subject) {
                logWarn("Skipping email.send job with missing payload", {
                    jobId: job?.id,
                    data: job?.data,
                });
                continue;
            }

            logDebug("Job received", { jobId: job?.id, queue: EMAIL_SEND_JOB, payload });

            try {
                await sendEmail(payload.to, payload.subject, undefined, {
                    html: payload.html,
                    text: payload.text,
                });
                logInfo("Email job completed", { jobId: job?.id });
            } catch (error) {
                logError("Email job failed", {
                    jobId: job?.id,
                    queue: EMAIL_SEND_JOB,
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                });
            }
        }
    });

    const shutdown = async () => {
        logInfo("Worker stopping");
        await boss.stop();
        process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}

startWorker().catch((error) => {
    logError("Failed to start sharing rule worker", { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
});
