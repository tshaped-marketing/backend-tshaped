-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "sectionsConfig" JSONB;

-- AlterTable
ALTER TABLE "Section" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
