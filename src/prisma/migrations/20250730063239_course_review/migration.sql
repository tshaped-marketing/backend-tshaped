-- DropForeignKey
ALTER TABLE "CourseReview" DROP CONSTRAINT "CourseReview_courseSlug_fkey";

-- DropForeignKey
ALTER TABLE "CourseReview" DROP CONSTRAINT "CourseReview_studentId_fkey";

-- AddForeignKey
ALTER TABLE "CourseReview" ADD CONSTRAINT "CourseReview_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseReview" ADD CONSTRAINT "CourseReview_courseSlug_fkey" FOREIGN KEY ("courseSlug") REFERENCES "Course"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
