/*
  Warnings:

  - A unique constraint covering the columns `[pathname]` on the table `Page` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "pathname" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Page_pathname_key" ON "Page"("pathname");
