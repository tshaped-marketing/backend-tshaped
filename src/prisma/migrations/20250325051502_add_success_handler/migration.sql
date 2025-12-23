-- CreateTable
CREATE TABLE "SuccessHandler" (
    "id" TEXT NOT NULL,
    "success_code" TEXT NOT NULL,
    "success_message" JSONB NOT NULL,
    "category" TEXT,
    "http_code" INTEGER NOT NULL DEFAULT 200,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuccessHandler_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SuccessHandler_success_code_key" ON "SuccessHandler"("success_code");

-- CreateIndex
CREATE INDEX "SuccessHandler_success_code_idx" ON "SuccessHandler"("success_code");
