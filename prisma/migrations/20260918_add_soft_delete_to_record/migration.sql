-- CreateEnum
CREATE TYPE "OpportunityStage" AS ENUM ('LEAD', 'QUALIFIED', 'DEMO', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST');

-- AlterTable
ALTER TABLE "Record" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Record_organizationId_objectDefId_isDeleted_idx" ON "Record"("organizationId", "objectDefId", "isDeleted");
