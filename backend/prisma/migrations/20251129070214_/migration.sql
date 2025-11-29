/*
  Warnings:

  - A unique constraint covering the columns `[googleId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[githubId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable: Rename Event primary key constraint (if it still has the old name)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'Group_pkey' 
    AND conrelid = 'Event'::regclass
  ) THEN
    ALTER TABLE "Event" RENAME CONSTRAINT "Group_pkey" TO "Event_pkey";
  END IF;
END $$;

-- AlterTable: Drop default from updatedAt (safe - won't error if no default exists)
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex: Create unique index for googleId (only if it doesn't exist)
CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId") WHERE "googleId" IS NOT NULL;

-- CreateIndex: Create unique index for githubId (only if it doesn't exist)
CREATE UNIQUE INDEX IF NOT EXISTS "User_githubId_key" ON "User"("githubId") WHERE "githubId" IS NOT NULL;
