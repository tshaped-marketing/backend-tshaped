/*
  Warnings:

  - Added the required column `targetSlug` to the `Comment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_courseId_fkey";

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "target" TEXT NOT NULL DEFAULT 'COURSE',
ADD COLUMN     "targetSlug" TEXT NOT NULL,
ALTER COLUMN "courseId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Comment_target_targetSlug_idx" ON "Comment"("target", "targetSlug");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
