import prismaClient from "../prisma/prisma.client.js";


function checkPrismaId(str:string) {
  return str.startsWith('cm') && str.length === 25;
}

export async function isUserAuthorizedInCourse(
  userId:string,
  courseIdentifier: string,
): Promise<boolean> {
const isId= checkPrismaId(courseIdentifier);
const where= isId? { id: courseIdentifier } : { slug: courseIdentifier };
  const enrollment = await prismaClient.course.findFirst({
    where: {
      ...where,
      students: {
        some: {
          id: userId
        }
      }
    }
  });
  
  return enrollment !== null;
}
