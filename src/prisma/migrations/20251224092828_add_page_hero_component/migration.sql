-- CreateTable
CREATE TABLE "PageHeroComponent" (
    "id" TEXT NOT NULL,
    "pageSlug" TEXT NOT NULL,
    "heroComponentId" TEXT NOT NULL,
    "overrideTitle" TEXT,
    "overrideParagraph" TEXT,
    "overrideImageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageHeroComponent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PageHeroComponent_pageSlug_heroComponentId_key" ON "PageHeroComponent"("pageSlug", "heroComponentId");

-- AddForeignKey
ALTER TABLE "PageHeroComponent" ADD CONSTRAINT "PageHeroComponent_heroComponentId_fkey" FOREIGN KEY ("heroComponentId") REFERENCES "HeroComponent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
