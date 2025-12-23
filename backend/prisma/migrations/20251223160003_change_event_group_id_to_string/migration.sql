-- Change Event.id from Int to String
-- First, update all foreign key columns that reference Event.id
ALTER TABLE "Member" ALTER COLUMN "eventId" TYPE TEXT USING "eventId"::TEXT;
ALTER TABLE "PokeRecord" ALTER COLUMN "eventId" TYPE TEXT USING "eventId"::TEXT;
ALTER TABLE "ShareToken" ALTER COLUMN "eventId" TYPE TEXT USING "eventId"::TEXT;
ALTER TABLE "EventInvitation" ALTER COLUMN "eventId" TYPE TEXT USING "eventId"::TEXT;

-- Change Event.id to String
ALTER TABLE "Event" ALTER COLUMN "id" TYPE TEXT USING "id"::TEXT;

-- Change Event.groupId from Int to String (nullable)
ALTER TABLE "Event" ALTER COLUMN "groupId" TYPE TEXT USING "groupId"::TEXT;

-- Change Group.id from Int to String
-- First, update all foreign key columns that reference Group.id
ALTER TABLE "ChatMessage" ALTER COLUMN "groupId" TYPE TEXT USING "groupId"::TEXT;

-- Change Group.id to String
ALTER TABLE "Group" ALTER COLUMN "id" TYPE TEXT USING "id"::TEXT;

