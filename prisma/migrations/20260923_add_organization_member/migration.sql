-- Add OrganizationMember table for multi-organization membership (P0-1).
CREATE TABLE "OrganizationMember" (
    "id"             SERIAL PRIMARY KEY,
    "userId"         INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "role"           TEXT,
    "createdAt"      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationMember_userId_organizationId_key" UNIQUE ("userId", "organizationId")
);

CREATE INDEX "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
