ALTER TABLE "League" ADD COLUMN "championPickLockAt" TIMESTAMP(3);

UPDATE "League"
SET "championPickLockAt" = TIMESTAMP '2026-06-11 17:00:00.000'
WHERE "championPickLockAt" IS NULL;
