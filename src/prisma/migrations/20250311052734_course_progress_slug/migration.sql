/*
  Warnings:

  - You are about to drop the column `courseId` on the `Progress` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[studentId,courseSlug]` on the table `Progress` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `courseSlug` to the `Progress` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Progress" DROP CONSTRAINT "Progress_courseId_fkey";

-- DropIndex
DROP INDEX "Progress_studentId_courseId_key";

-- AlterTable
ALTER TABLE "Progress" DROP COLUMN "courseId",
ADD COLUMN     "courseSlug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Progress_studentId_courseSlug_key" ON "Progress"("studentId", "courseSlug");

-- AddForeignKey
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_courseSlug_fkey" FOREIGN KEY ("courseSlug") REFERENCES "Course"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
