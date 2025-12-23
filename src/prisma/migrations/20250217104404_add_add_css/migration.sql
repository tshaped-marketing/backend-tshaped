-- AlterTable
ALTER TABLE "Content" ADD COLUMN     "customStyles" JSONB;

-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "customClass" TEXT,
ADD COLUMN     "customStyles" JSONB;
