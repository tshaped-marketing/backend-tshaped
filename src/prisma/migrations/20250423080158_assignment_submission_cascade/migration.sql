-- DropForeignKey
ALTER TABLE "SubmissionHistory" DROP CONSTRAINT "SubmissionHistory_submissionId_fkey";

-- AddForeignKey
ALTER TABLE "SubmissionHistory" ADD CONSTRAINT "SubmissionHistory_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AssignmentSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
