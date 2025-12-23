// utils/determineMIME.ts
import { MediaType } from '@prisma/client';
import mime from 'mime-types';
import { CLOUDFRONT_URL } from '../constants/env.constant.js';
import prismaClient from '../prisma/prisma.client.js';
import { mimeTypeToCategory } from './mimeTypeToCategory.js';
function extractS3Key(url: string) {
  const match = url.match(/(uploads\/(?:public|private)\/.*?)(?:\?|$)/);
  return match ? match[1] : null;
}
function getMimeTypeFromUrl(url: any) {
  // Extract the file extension
  const extension = url.split('.').pop().toLowerCase().split(/[#?]/)[0];
  return mime.lookup(extension);
}

const determineMediaType = async (url: string): Promise<MediaType> => {
  if (url.includes(CLOUDFRONT_URL)) {
    const uploadKey = extractS3Key(url);

    if (!uploadKey) {
      return MediaType.OTHER;
    }

    const upload = await prismaClient.upload.findFirst({
      where: {
        key: uploadKey,
      },
    });

    if (upload && upload.mimeType) {
      const category = mimeTypeToCategory(upload.mimeType);

      return category as MediaType;
    }
  } else {
    const mimeType = getMimeTypeFromUrl(url);
 

    if (mimeType) {
      const category = mimeTypeToCategory(mimeType);
      console.log('category', category);
      return category as MediaType;
    }
  }
  return MediaType.OTHER;
};

export default determineMediaType;
