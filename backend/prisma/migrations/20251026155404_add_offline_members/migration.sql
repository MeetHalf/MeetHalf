-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Member" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "groupId" INTEGER NOT NULL,
    "lat" REAL,
    "lng" REAL,
    "address" TEXT,
    "travelMode" TEXT DEFAULT 'driving',
    "nickname" TEXT,
    "isOffline" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Member_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Member" ("address", "createdAt", "groupId", "id", "lat", "lng", "travelMode", "updatedAt", "userId") SELECT "address", "createdAt", "groupId", "id", "lat", "lng", "travelMode", "updatedAt", "userId" FROM "Member";
DROP TABLE "Member";
ALTER TABLE "new_Member" RENAME TO "Member";
CREATE INDEX "Member_groupId_idx" ON "Member"("groupId");
CREATE INDEX "Member_userId_idx" ON "Member"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
