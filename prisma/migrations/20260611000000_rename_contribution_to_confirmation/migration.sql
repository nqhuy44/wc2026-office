-- Rename the old money-oriented member flag to a neutral confirmation flag.
ALTER TYPE "ContributionStatus" RENAME VALUE 'UNPAID' TO 'UNCONFIRMED';
ALTER TYPE "ContributionStatus" RENAME VALUE 'PAID' TO 'CONFIRMED';
ALTER TYPE "ContributionStatus" RENAME TO "MemberConfirmationStatus";

ALTER TABLE "LeagueMember" RENAME COLUMN "contributionStatus" TO "confirmationStatus";
ALTER TABLE "LeagueMember" ALTER COLUMN "confirmationStatus" SET DEFAULT 'UNCONFIRMED';
