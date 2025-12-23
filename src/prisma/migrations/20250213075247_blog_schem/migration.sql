/*
  Warnings:

  - You are about to drop the column `authorId` on the `Blog` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Blog` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Blog` table. All the data in the column will be lost.
  - You are about to drop the column `titleSubTags` on the `Blog` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Blog` table. All the data in the column will be lost.
  - Added the required column `author` to the `Blog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `metaDescription` to the `Blog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `metaTitle` to the `Blog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `summary` to the `Blog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedDate` to the `Blog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Blog` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Blog" DROP CONSTRAINT "Blog_authorId_fkey";

-- AlterTable
ALTER TABLE "Blog" DROP COLUMN "authorId",
DROP COLUMN "createdAt",
DROP COLUMN "description",
DROP COLUMN "titleSubTags",
DROP COLUMN "updatedAt",
ADD COLUMN     "author" TEXT NOT NULL,
ADD COLUMN     "authorLink" TEXT,
ADD COLUMN     "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "metaDescription" TEXT NOT NULL,
ADD COLUMN     "metaTitle" VARCHAR(255) NOT NULL,
ADD COLUMN     "publishedDate" TIMESTAMP(3),
ADD COLUMN     "summary" TEXT NOT NULL,
ADD COLUMN     "updatedDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Blog" ADD CONSTRAINT "Blog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
