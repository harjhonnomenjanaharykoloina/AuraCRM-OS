-- Fix Account records: migrate from providerId='username' to providerId='credential'
-- Run this in your production database:
--   railway run psql < scripts/fix-accounts.sql
-- or paste directly in your database client

-- First, delete duplicate username accounts when a credential account already exists
DELETE FROM "Account"
WHERE "providerId" = 'username'
  AND "userId" IN (
    SELECT c."userId"
    FROM "Account" c
    WHERE c."providerId" = 'credential'
  );

-- Then update remaining username accounts to credential
UPDATE "Account"
SET "providerId" = 'credential',
    "accountId" = "userId"::text
WHERE "providerId" = 'username';

-- Show remaining accounts for verification
SELECT id, "userId", "providerId", "accountId" FROM "Account";
