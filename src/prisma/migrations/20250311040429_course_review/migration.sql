-- CreateTable
CREATE TABLE "CourseReview" (
    "id" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "studentId" TEXT NOT NULL,
    "courseSlug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseReview_courseSlug_idx" ON "CourseReview"("courseSlug");

-- CreateIndex
CREATE INDEX "CourseReview_rating_idx" ON "CourseReview"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "CourseReview_studentId_courseSlug_key" ON "CourseReview"("studentId", "courseSlug");

-- AddForeignKey
ALTER TABLE "CourseReview" ADD CONSTRAINT "CourseReview_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseReview" ADD CONSTRAINT "CourseReview_courseSlug_fkey" FOREIGN KEY ("courseSlug") REFERENCES "Course"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
