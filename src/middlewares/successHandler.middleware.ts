import { Response } from 'express';
import successProvider from '../utils/successJSONProvider.js';

/**
 * Sends a success response using a predefined success code from the database
 * @param res Express response object
 * @param successCode The success code to lookup
 * @param data Optional data to include in the response
 * @param lang Language code for the response message (defaults to 'en')
 */
export const sendSuccess = async (
  res: Response,
  successCode: string,
  data?: any,
  lang: string = 'en',
): Promise<any> => {
  try {
    const successConfig = await successProvider(successCode, lang);

    return res.status(successConfig.http_code).json({
      success: true,
      message:
        successConfig.success_message[lang] ||
        successConfig.success_message['en'] ||
        'Operation completed successfully',
      ...data, // Spread data directly without wrapping
    });
  } catch (err) {
    // Fallback to a generic success message if there's an error
    return res.status(200).json({
      success: true,
      message: 'Operation completed successfully',
      ...data, // Spread data directly
    });
  }
};
