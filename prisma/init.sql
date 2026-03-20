CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "secondMeUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "bio" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_secondMeUserId_key" ON "User"("secondMeUserId");

CREATE TABLE IF NOT EXISTS "Dream" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "content" TEXT NOT NULL,
    "contentShort" TEXT,
    "mood" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "isGhost" BOOLEAN NOT NULL DEFAULT false,
    "safetyLevel" TEXT NOT NULL DEFAULT 'safe',
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Dream_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Dream_isGhost_idx" ON "Dream"("isGhost");
CREATE INDEX IF NOT EXISTS "Dream_userId_date_idx" ON "Dream"("userId", "date");

CREATE TABLE IF NOT EXISTS "AgentConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentAUserId" TEXT NOT NULL,
    "agentBUserId" TEXT,
    "ghostDreamId" TEXT,
    "rounds" INTEGER NOT NULL DEFAULT 0,
    "fullContent" TEXT NOT NULL DEFAULT '',
    "fragments" TEXT NOT NULL DEFAULT '[]',
    "emotion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentConversation_agentAUserId_fkey" FOREIGN KEY ("agentAUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AgentConversation_agentBUserId_fkey" FOREIGN KEY ("agentBUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "EveningDream" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "story" TEXT NOT NULL,
    "audioUrl" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EveningDream_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "EveningDream_userId_date_idx" ON "EveningDream"("userId", "date");

CREATE TABLE IF NOT EXISTS "Segment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dreamId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Segment_dreamId_fkey" FOREIGN KEY ("dreamId") REFERENCES "Dream" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Segment_dreamId_idx" ON "Segment"("dreamId");
