-- AlterEnum
ALTER TYPE "ContentType" ADD VALUE 'LIST';

-- AlterTable
ALTER TABLE "Content" ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "Content_parentId_idx" ON "Content"("parentId");

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
