/*
  Warnings:

  - You are about to drop the column `sectionsConfig` on the `Page` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Section` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Page" DROP COLUMN "sectionsConfig";

-- AlterTable
ALTER TABLE "Section" DROP COLUMN "isActive";

-- CreateTable
CREATE TABLE "HeroComponent" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "paragraph" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeroComponent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HeroComponent_slug_key" ON "HeroComponent"("slug");
