-- Add Better-Auth required fields to User and Session models.
ALTER TABLE "User" ADD COLUMN "banned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "banReason" TEXT;
ALTER TABLE "User" ADD COLUMN "banExpires" TIMESTAMP;
ALTER TABLE "Session" ADD COLUMN "impersonatedBy" TEXT;

-- User.role was added to schema but not migrated.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'user';
