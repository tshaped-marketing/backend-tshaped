-- Drop the existing foreign key constraint
ALTER TABLE "AssignmentSubmission" DROP CONSTRAINT "AssignmentSubmission_assignmentId_fkey";

-- Add the new constraint with CASCADE delete
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_assignmentId_fkey" 
FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;