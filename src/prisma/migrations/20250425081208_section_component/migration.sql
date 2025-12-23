/*
  Warnings:

  - You are about to drop the column `components` on the `Section` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Section" DROP COLUMN "components",
ADD COLUMN     "component" TEXT;
