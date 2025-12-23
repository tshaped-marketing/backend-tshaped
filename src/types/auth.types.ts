import { Request } from 'express';

interface AuthRequestBody {
  name?: string;
  email: string;
  password: string;
  role?: string;
}

interface CustomRequest extends Request {
  user?: {
    userId: string;
    name?: string;
    role: string;
    status?: string;
    authorizedCourses?:any; 
  };
}

export { AuthRequestBody, CustomRequest };
