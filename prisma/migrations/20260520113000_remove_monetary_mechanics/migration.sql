-- AlterEnum
BEGIN;
CREATE TYPE "AuditEntityType_new" AS ENUM ('COMPANY', 'LEAGUE_MATCH', 'PARTICIPANT', 'EXPORT', 'TEAM', 'MATCH', 'PREDICTION', 'SETTING');
ALTER TABLE "AuditLog" ALTER COLUMN "entityType" TYPE "AuditEntityType_new" USING ("entityType"::text::"AuditEntityType_new");
ALTER TYPE "AuditEntityType" RENAME TO "AuditEntityType_old";
ALTER TYPE "AuditEntityType_new" RENAME TO "AuditEntityType";
DROP TYPE "public"."AuditEntityType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Contribution" DROP CONSTRAINT "Contribution_participantId_fkey";

-- DropForeignKey
ALTER TABLE "Sponsor" DROP CONSTRAINT "Sponsor_companyId_fkey";

-- DropTable
DROP TABLE "Contribution";

-- DropTable
DROP TABLE "Sponsor";

-- DropEnum
DROP TYPE "ContributionStatus";
