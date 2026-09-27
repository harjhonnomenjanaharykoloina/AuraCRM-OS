-- Add organizationId to QueueMember for multi-tenant isolation (P0-1 prep).
-- QueueMember is a join between Queue (has organizationId) and User (has organizationId).
-- Denormalizing organizationId here enables efficient tenant-scoped queries.
ALTER TABLE "QueueMember" ADD COLUMN IF NOT EXISTS "organizationId" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS "QueueMember_organizationId_idx" ON "QueueMember"("organizationId");

-- Backfill organizationId from the related Queue for existing rows.
UPDATE "QueueMember" qm
SET "organizationId" = q."organizationId"
FROM "Queue" q
WHERE qm."queueId" = q."id" AND qm."organizationId" = 1;
