-- Migration: Add OAuth fields to User and rename Group to Event
-- This migration assumes the database is empty (after reset)

-- Step 1: Add OAuth and other fields to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatar" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "githubId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "provider" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Set default name for existing users (if any)
UPDATE "User" SET "name" = "email" WHERE "name" IS NULL;
-- Now make name NOT NULL
ALTER TABLE "User" ALTER COLUMN "name" SET NOT NULL;

-- Step 2: Create unique indexes for OAuth IDs
CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId") WHERE "googleId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "User_githubId_key" ON "User"("githubId") WHERE "githubId" IS NOT NULL;

-- Step 3: Add ownerName to Group table (temporary, will become Event)
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "ownerName" TEXT;

-- Step 4: Populate ownerName from User table using ownerId
UPDATE "Group" 
SET "ownerName" = (
  SELECT COALESCE(u.name, u.email, 'Unknown')
  FROM "User" u
  WHERE u.id = "Group"."ownerId"
)
WHERE "ownerName" IS NULL;

-- Step 5: Make ownerName NOT NULL
ALTER TABLE "Group" ALTER COLUMN "ownerName" SET NOT NULL;

-- Step 6: Rename Group table to Event
ALTER TABLE "Group" RENAME TO "Event";

-- Step 7: Drop foreign key constraint on ownerId
ALTER TABLE "Event" DROP CONSTRAINT IF EXISTS "Group_ownerId_fkey";

-- Step 8: Drop ownerId column
ALTER TABLE "Event" DROP COLUMN IF EXISTS "ownerId";

-- Step 9: Create index on ownerName
CREATE INDEX IF NOT EXISTS "Event_ownerName_idx" ON "Event"("ownerName");

-- Step 10: Rename groupId to eventId in Member table
ALTER TABLE "Member" RENAME COLUMN "groupId" TO "eventId";

-- Step 11: Update foreign key constraint name for eventId
ALTER TABLE "Member" DROP CONSTRAINT IF EXISTS "Member_groupId_fkey";
ALTER TABLE "Member" ADD CONSTRAINT "Member_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 12: Add username column to Member
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "username" TEXT;

-- Step 13: Populate username from User table using userId
UPDATE "Member"
SET "username" = (
  SELECT COALESCE(u.name, u.email, 'Unknown')
  FROM "User" u
  WHERE u.id = "Member"."userId"
)
WHERE "userId" IS NOT NULL AND "username" IS NULL;

-- Step 14: Drop foreign key constraint on userId
ALTER TABLE "Member" DROP CONSTRAINT IF EXISTS "Member_userId_fkey";

-- Step 15: Drop userId column
ALTER TABLE "Member" DROP COLUMN IF EXISTS "userId";

-- Step 16: Update indexes
DROP INDEX IF EXISTS "Member_groupId_idx";
CREATE INDEX IF NOT EXISTS "Member_eventId_idx" ON "Member"("eventId");
CREATE INDEX IF NOT EXISTS "Member_username_idx" ON "Member"("username");
