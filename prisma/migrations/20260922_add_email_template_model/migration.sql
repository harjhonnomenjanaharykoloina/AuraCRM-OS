-- Phase 8: EmailTemplate model for DB-stored email templates
CREATE TABLE "EmailTemplate" (
    "id"             SERIAL PRIMARY KEY,
    "organizationId" INTEGER NOT NULL,
    "name"           TEXT NOT NULL,
    "subject"        TEXT NOT NULL,
    "bodyHtml"       TEXT NOT NULL,
    "bodyText"       TEXT,
    "isActive"       BOOLEAN NOT NULL DEFAULT true,
    "createdAt"      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "EmailTemplate_organizationId_name_key" ON "EmailTemplate"("organizationId", "name");
CREATE INDEX "EmailTemplate_organizationId_idx" ON "EmailTemplate"("organizationId");

ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_organizationId_fkey" 
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
