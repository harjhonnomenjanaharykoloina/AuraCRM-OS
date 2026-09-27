-- Phase 7: Add storageProvider column to FileAttachment for pluggable storage backends
ALTER TABLE "FileAttachment" ADD COLUMN IF NOT EXISTS "storageProvider" TEXT NOT NULL DEFAULT 'local';
CREATE INDEX IF NOT EXISTS "FileAttachment_storageProvider_idx" ON "FileAttachment"("storageProvider");
