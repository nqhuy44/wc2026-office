CREATE TABLE "ProviderStanding" (
    "id" TEXT NOT NULL,
    "competitionCode" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "teamExternalId" TEXT NOT NULL,
    "teamId" TEXT,
    "teamName" TEXT NOT NULL,
    "shortName" TEXT,
    "countryCode" TEXT,
    "flagUrl" TEXT,
    "playedGames" INTEGER NOT NULL,
    "won" INTEGER NOT NULL,
    "draw" INTEGER NOT NULL,
    "lost" INTEGER NOT NULL,
    "goalsFor" INTEGER NOT NULL,
    "goalsAgainst" INTEGER NOT NULL,
    "goalDifference" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderStanding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProviderStanding_competitionCode_group_teamExternalId_key" ON "ProviderStanding"("competitionCode", "group", "teamExternalId");
CREATE INDEX "ProviderStanding_competitionCode_group_position_idx" ON "ProviderStanding"("competitionCode", "group", "position");
CREATE INDEX "ProviderStanding_teamId_idx" ON "ProviderStanding"("teamId");

ALTER TABLE "ProviderStanding" ADD CONSTRAINT "ProviderStanding_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
