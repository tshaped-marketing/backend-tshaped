import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables from the .env file
dotenv.config();

const prismaClient = new PrismaClient();

export default prismaClient;
