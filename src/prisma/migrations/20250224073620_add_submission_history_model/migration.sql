-- CreateTable
CREATE TABLE "SubmissionHistory" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "textContent" TEXT,
    "attachments" JSONB,
    "status" "AssignmentStatus" NOT NULL,
    "grade" DOUBLE PRECISION,
    "feedback" TEXT,
    "version" INTEGER NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubmissionHistory_submissionId_idx" ON "SubmissionHistory"("submissionId");

-- AddForeignKey
ALTER TABLE "SubmissionHistory" ADD CONSTRAINT "SubmissionHistory_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AssignmentSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
