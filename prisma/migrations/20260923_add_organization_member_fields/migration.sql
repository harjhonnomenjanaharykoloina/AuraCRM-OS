-- Multi-org membership fields + role enum (P0-1 follow-up).
-- Adds the OrganizationMemberRole enum and the isDefault/isActive columns to the
-- OrganizationMember table, and aligns the Session.organizationId column type
-- with the schema (Int?) and the better-auth session additional field (type: "number").

-- Role enum for org-level roles.
CREATE TYPE "OrganizationMemberRole" AS ENUM ('org_admin', 'org_manager', 'org_member');

-- Normalize any legacy/free-form role strings to a valid enum value before casting,
-- and backfill NULL roles to the default so we can enforce NOT NULL.
UPDATE "OrganizationMember"
SET "role" = 'org_member'
WHERE "role" IS NULL
   OR "role" NOT IN ('org_admin', 'org_manager', 'org_member');

ALTER TABLE "OrganizationMember"
  ALTER COLUMN "role" DROP DEFAULT,
  ALTER COLUMN "role" TYPE "OrganizationMemberRole" USING "role"::"OrganizationMemberRole",
  ALTER COLUMN "role" SET DEFAULT 'org_member',
  ALTER COLUMN "role" SET NOT NULL;

ALTER TABLE "OrganizationMember" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OrganizationMember" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Fix Session.organizationId column type: TEXT -> INTEGER (matches schema: Int?).
-- Existing text values are expected to be numeric organization ids (or NULL).
ALTER TABLE "Session" ALTER COLUMN "organizationId" TYPE INTEGER USING "organizationId"::INTEGER;

-- Index to quickly resolve a user's default organization.
CREATE INDEX IF NOT EXISTS "OrganizationMember_userId_isDefault_idx" ON "OrganizationMember"("userId") WHERE "isDefault" = true;
