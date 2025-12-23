import prismaClient from '../prisma/prisma.client.js';

type SettingIdentifier = {
  slug?: string;
  id?: string;
};

type SettingDetails = {
  description: string | null;
  value: any;
} | null;

async function getSettingDetails({ slug, id }: SettingIdentifier): Promise<SettingDetails> {
  try {
    if (!slug && !id) {
      throw new Error('Either slug or id must be provided');
    }

    // Assuming you're using Prisma client

    const setting = await prismaClient.setting.findFirst({
      where: {
        OR: [{ slug: slug || undefined }, { id: id || undefined }],
        isActive: true,
      },
      select: {
        description: true,
        value: true,
      },
    });

    if (!setting) {
      return null;
    }

    return {
      description: setting.description,
      value: setting.value,
    };
  } catch (error) {
    console.error('Error fetching setting details:', error);
    throw error;
  }
}

export default getSettingDetails;
