/*
  Warnings:

  - You are about to drop the column `createdDate` on the `Blog` table. All the data in the column will be lost.
  - You are about to drop the column `updatedDate` on the `Blog` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Blog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Blog" DROP COLUMN "createdDate",
DROP COLUMN "updatedDate",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
