/*
  Warnings:

  - You are about to drop the column `courseSlug` on the `Progress` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[studentId,courseId]` on the table `Progress` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `courseId` to the `Progress` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Progress" DROP CONSTRAINT "Progress_courseSlug_fkey";

-- DropIndex
DROP INDEX "Progress_studentId_courseSlug_key";

-- AlterTable
ALTER TABLE "Progress" DROP COLUMN "courseSlug",
ADD COLUMN     "courseId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Progress_studentId_courseId_key" ON "Progress"("studentId", "courseId");

-- AddForeignKey
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
