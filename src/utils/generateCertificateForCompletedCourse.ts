import redisService from "../config/redis.config.js";
import prismaClient from "../prisma/prisma.client.js";
import { generateCertificate } from "./generateCertificate.js";

export const generateCertificateForCompletedCourse = async(studentId:string,courseId:string,progressRate:number,studentName:string)=>{

  const progressRateUpdated= await prismaClient.progress.findFirst({
    where: {
      studentId,
      courseId,
    }
  })
    if(Math.floor(progressRateUpdated!.completionRate) != 100) return null
      const existingCertificate = await prismaClient.certification.findUnique({
    where: {
      studentId_courseId: {
        studentId,
        courseId,
      },
    },
  });
  if (existingCertificate) {
    return existingCertificate;
    }
    let newCert = null;

  if (!existingCertificate) {

      // Find course title
      const course = await prismaClient.course.findUnique({
        where: { id: courseId },
        select: { title: true },
      });
      const student = await prismaClient.user.findUnique({
             where: { id: studentId },
        select: { name: true },
      })
      const certificateUrl = (await generateCertificate(student!.name,course!.title)).cloudFrontUrl;
     newCert = await prismaClient.certification.create({
      data: {
        studentId,
        courseId,
        certificateUrl,
      },
    });
  }
return newCert
  
}