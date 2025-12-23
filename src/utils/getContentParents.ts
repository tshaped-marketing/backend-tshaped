import prismaClient from "../prisma/prisma.client.js";

async function getAllParentIds(contentId: string): Promise<string[]> {
  const parentIds: string[] = [contentId]; // Include the contentId itself
  let currentId = contentId;
  
  while (currentId) {
    const content = await prismaClient.content.findUnique({
      where: { id: currentId },
      select: { parentId: true }
    });
    
    if (content?.parentId) {
      parentIds.push(content.parentId);
      currentId = content.parentId;
    } else {
      break;
    }
  }
  
  return parentIds;
}

export default getAllParentIds