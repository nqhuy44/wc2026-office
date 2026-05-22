-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('PLAYER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('USER', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('INVITED', 'ACTIVE', 'BANNED');

-- CreateEnum
CREATE TYPE "ContributionStatus" AS ENUM ('UNPAID', 'PAID');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'OPEN', 'LOCKED', 'LIVE', 'FINISHED', 'SCORED', 'VOID');

-- CreateEnum
CREATE TYPE "MatchStage" AS ENUM ('GROUP', 'ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'THIRD_PLACE', 'FINAL');

-- CreateEnum
CREATE TYPE "MatchWinner" AS ENUM ('HOME', 'AWAY', 'DRAW', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PredictionResultType" AS ENUM ('PENDING', 'EXACT_SCORE', 'CORRECT_RESULT', 'WRONG', 'VOID');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('LEAGUE', 'LEAGUE_MATCH', 'MEMBER', 'EXPORT', 'TEAM', 'MATCH', 'PREDICTION', 'SETTING');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passcodeHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" "SystemRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueMember" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL DEFAULT 'PLAYER',
    "contributionStatus" "ContributionStatus" NOT NULL DEFAULT 'UNPAID',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeagueMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "externalTeamId" TEXT,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "countryCode" TEXT,
    "flagUrl" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "externalMatchId" TEXT,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "kickoffAt" TIMESTAMP(3) NOT NULL,
    "stage" "MatchStage" NOT NULL,
    "groupName" TEXT,
    "venue" TEXT,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "winner" "MatchWinner" NOT NULL DEFAULT 'UNKNOWN',
    "resultSource" TEXT,
    "scoredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueMatch" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "isPredictionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lockAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeagueMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" TEXT NOT NULL,
    "leagueMatchId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "homeScorePred" INTEGER NOT NULL,
    "awayScorePred" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "resultType" "PredictionResultType" NOT NULL DEFAULT 'PENDING',
    "lockedSnapshotAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT,
    "actorId" TEXT,
    "entityType" "AuditEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "League_slug_key" ON "League"("slug");
CREATE INDEX "League_isActive_idx" ON "League"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueMember_leagueId_userId_key" ON "LeagueMember"("leagueId", "userId");
CREATE UNIQUE INDEX "LeagueMember_leagueId_nickname_key" ON "LeagueMember"("leagueId", "nickname");
CREATE INDEX "LeagueMember_leagueId_idx" ON "LeagueMember"("leagueId");
CREATE INDEX "LeagueMember_userId_idx" ON "LeagueMember"("userId");
CREATE INDEX "LeagueMember_role_idx" ON "LeagueMember"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Team_externalTeamId_key" ON "Team"("externalTeamId");
CREATE INDEX "Team_name_idx" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Match_externalMatchId_key" ON "Match"("externalMatchId");
CREATE INDEX "Match_kickoffAt_idx" ON "Match"("kickoffAt");
CREATE INDEX "Match_status_idx" ON "Match"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueMatch_leagueId_matchId_key" ON "LeagueMatch"("leagueId", "matchId");
CREATE INDEX "LeagueMatch_leagueId_idx" ON "LeagueMatch"("leagueId");
CREATE INDEX "LeagueMatch_matchId_idx" ON "LeagueMatch"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "Prediction_leagueMatchId_memberId_key" ON "Prediction"("leagueMatchId", "memberId");
CREATE INDEX "Prediction_leagueMatchId_idx" ON "Prediction"("leagueMatchId");
CREATE INDEX "Prediction_memberId_idx" ON "Prediction"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "AppSetting_leagueId_key_key" ON "AppSetting"("leagueId", "key");

-- CreateIndex
CREATE INDEX "AuditLog_leagueId_idx" ON "AuditLog"("leagueId");
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMember" ADD CONSTRAINT "LeagueMember_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMember" ADD CONSTRAINT "LeagueMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMatch" ADD CONSTRAINT "LeagueMatch_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMatch" ADD CONSTRAINT "LeagueMatch_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_leagueMatchId_fkey" FOREIGN KEY ("leagueMatchId") REFERENCES "LeagueMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "LeagueMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSetting" ADD CONSTRAINT "AppSetting_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
