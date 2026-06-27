-- Replace pointMultiplier (Int) with isBonus (Boolean)
ALTER TABLE "LeagueMatch"
  ADD COLUMN "isBonus" BOOLEAN NOT NULL DEFAULT false;

-- Mark existing x2/x3 matches as bonus
UPDATE "LeagueMatch" SET "isBonus" = true WHERE "pointMultiplier" > 1;

ALTER TABLE "LeagueMatch"
  DROP COLUMN "pointMultiplier";
