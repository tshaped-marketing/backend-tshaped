import fs from 'fs/promises';
import path from 'path';
import { ErrorConfig, ErrorDictionary, ErrorMessage } from '../types/error.types.js';
import { fileURLToPath } from 'url';
import prismaClient from '../prisma/prisma.client.js';
import { NODE_ENV } from '../constants/env.constant.js';

const replacePath = (originalPath: string, textToReplace = 'dist', replacement = 'src') => {
  return originalPath.replace(new RegExp(textToReplace, 'g'), replacement);
};
const isDevelopment = NODE_ENV === 'development';
let __dirname: string;
const __filename = fileURLToPath(import.meta.url);
const raw_dirname = path.dirname(__filename);
if (isDevelopment) {
  __dirname = replacePath(raw_dirname, 'dist', 'src');
} else {
  __dirname = raw_dirname;
}

class ErrorService {
  private static instance: ErrorService;
  private errorFilePath: string;
  private errorCache: ErrorDictionary | null = null;

  private constructor() {
    this.errorFilePath = path.join(__dirname, '..', 'config', 'errors.json');
  }

  public static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  private async loadErrorsFromFile(): Promise<ErrorDictionary> {
    try {
      if (this.errorCache) {
        return this.errorCache;
      }

      const fileContent = await fs.readFile(this.errorFilePath, 'utf-8');
      this.errorCache = JSON.parse(fileContent);
      return this.errorCache as any;
    } catch (error) {
      console.error('❌ Error reading from errors file:', error);
      throw error;
    }
  }

  async loadErrorsFromDB(): Promise<void> {
    try {
      const dbErrors = await prismaClient.errorHandler.findMany();

      const errorDictionary: ErrorDictionary = {};

      dbErrors.forEach(error => {
        errorDictionary[error.error_code] = {
          error_code: error.error_code,
          error_message: error.error_message as any,
          category: error.category || 'unknown',
          http_code: error.http_code,
        };
      });

      await fs.writeFile(this.errorFilePath, JSON.stringify(errorDictionary, null, 2));

      // Update cache
      this.errorCache = errorDictionary;

      console.log('✅ Errors successfully loaded from database to file');
    } catch (error) {
      console.error('❌ Error loading errors from database:', error);
      throw error;
    }
  }

  async pushErrorsToDB(): Promise<void> {
    try {
      const fileContent = await fs.readFile(
        replacePath(this.errorFilePath, 'dist', 'src'),
        'utf-8',
      );
      console.log('filePath', replacePath(this.errorFilePath, 'dist', 'src'));
      const errors: ErrorDictionary = JSON.parse(fileContent);

      await prismaClient.$transaction(
        async tx => {
          // Clear existing errors
          await tx.errorHandler.deleteMany({});

          // Insert new errors in batches
          const errorPromises = Object.values(errors).map(error =>
            tx.errorHandler.create({
              data: {
                error_code: error.error_code,
                error_message: error.error_message as any,
                category: error.category,
                http_code: error.http_code,
                isActive: true,
              },
            }),
          );

          await Promise.all(errorPromises);
        },
        {
          timeout: 20000, // Increase timeout to 10 seconds
        },
      );

      console.log('✅ Errors successfully pushed to database');
    } catch (error) {
      console.error('❌ Error pushing errors to database:', error);
      throw error;
    }
  }

  async getError(errorCode: string, fromDb: boolean = false): Promise<ErrorConfig | null> {
    try {
      if (fromDb) {
        const error = await prismaClient.errorHandler.findUnique({
          where: { error_code: errorCode },
        });

        if (!error) return null;

        return {
          error_code: error.error_code,
          error_message: error.error_message as any,
          category: error.category || 'unknown',
          http_code: error.http_code,
        };
      }

      // Read from JSON file by default
      const fileContent = await fs.readFile(this.errorFilePath, 'utf-8');
      const errors: ErrorDictionary = JSON.parse(fileContent);

      const error = errors[errorCode];
      return error || null;
    } catch (error) {
      console.error('❌ Error fetching error config:', error);
      throw error;
    }
  }
}

export default ErrorService;
