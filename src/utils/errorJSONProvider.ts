import ErrorService from '../services/error.service.js';
import { ErrorConfig } from '../types/error.types.js';

const errorService = ErrorService.getInstance();

const errorProvider = async (errorCode: string, lang = 'en') => {
  const error = await errorService.getError(errorCode, true);
  return error as ErrorConfig;
};

export default errorProvider;
