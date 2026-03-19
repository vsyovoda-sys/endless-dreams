-- CreateTable
CREATE TABLE "User" (
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

-- CreateTable
CREATE TABLE "Dream" (
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

-- CreateTable
CREATE TABLE "AgentConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentAUserId" TEXT NOT NULL,
    "agentBUserId" TEXT,
    "ghostDreamId" TEXT,
    "rounds" INTEGER NOT NULL DEFAULT 0,
    "fullContent" TEXT NOT NULL DEFAULT '',
    "fragments" TEXT NOT NULL DEFAULT '[]',
    "dreamMixResult" TEXT,
    "emotionTone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "AgentConversation_agentAUserId_fkey" FOREIGN KEY ("agentAUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AgentConversation_agentBUserId_fkey" FOREIGN KEY ("agentBUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EveningDream" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "story" TEXT NOT NULL,
    "audioUrl" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EveningDream_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Segment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eveningDreamId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "originDreamId" TEXT,
    "originUserId" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Segment_eveningDreamId_fkey" FOREIGN KEY ("eveningDreamId") REFERENCES "EveningDream" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Segment_originDreamId_fkey" FOREIGN KEY ("originDreamId") REFERENCES "Dream" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_secondMeUserId_key" ON "User"("secondMeUserId");

-- CreateIndex
CREATE INDEX "Dream_isGhost_idx" ON "Dream"("isGhost");

-- CreateIndex
CREATE INDEX "Dream_userId_date_idx" ON "Dream"("userId", "date");

-- CreateIndex
CREATE INDEX "AgentConversation_status_idx" ON "AgentConversation"("status");

-- CreateIndex
CREATE INDEX "AgentConversation_agentAUserId_idx" ON "AgentConversation"("agentAUserId");

-- CreateIndex
CREATE INDEX "EveningDream_userId_date_idx" ON "EveningDream"("userId", "date");
