-- AlterTable
ALTER TABLE "League" ADD COLUMN "championTeamId" TEXT;

-- CreateTable
CREATE TABLE "ChampionPick" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChampionPick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChampionPick_leagueId_memberId_key" ON "ChampionPick"("leagueId", "memberId");

-- CreateIndex
CREATE INDEX "ChampionPick_leagueId_idx" ON "ChampionPick"("leagueId");

-- AddForeignKey
ALTER TABLE "League" ADD CONSTRAINT "League_championTeamId_fkey" FOREIGN KEY ("championTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChampionPick" ADD CONSTRAINT "ChampionPick_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChampionPick" ADD CONSTRAINT "ChampionPick_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "LeagueMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChampionPick" ADD CONSTRAINT "ChampionPick_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
