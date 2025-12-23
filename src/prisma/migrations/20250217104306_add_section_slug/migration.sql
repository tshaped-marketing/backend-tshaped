/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Section` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Section" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Section_slug_key" ON "Section"("slug");
