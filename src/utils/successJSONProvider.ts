import prismaClient from '../prisma/prisma.client.js';

interface SuccessMessage {
  [key: string]: string;
}

interface SuccessConfig {
  success_code: string;
  success_message: SuccessMessage;
  http_code: number;
  category?: string;
}

const successProvider = async (
  successCode: string,
  lang: string = 'en',
): Promise<SuccessConfig> => {
  // Try to get success message from database
  const successHandler = await prismaClient.successHandler.findUnique({
    where: { success_code: successCode },
  });

  if (successHandler) {
    return {
      success_code: successHandler.success_code,
      success_message: successHandler.success_message as SuccessMessage,
      http_code: successHandler.http_code,
      category: successHandler.category || undefined,
    };
  }

  // Default success message if not found
  return {
    success_code: 'DEFAULT_SUCCESS',
    success_message: { en: 'Operation completed successfully' },
    http_code: 200,
  };
};

export default successProvider;
