import { Request, Response, NextFunction } from 'express';
import { ConfidentialClientApplication } from '@azure/msal-node';
import prismaClient from '../../prisma/prisma.client.js';
import jwt from 'jsonwebtoken';
import { FRONTEND_URL, JWT_SECRET, MICROSOFT_AUTHORITY, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET } from '../../constants/env.constant.js';
import { COOKIE_CONFIG_PROVIDER } from '../../config/cookie.config.js';
import { throwError } from '../../middlewares/errorHandler.middleware.js';

const msalConfig = {
  auth: {
    clientId:  MICROSOFT_CLIENT_ID,
    clientSecret: MICROSOFT_CLIENT_SECRET, //Under "Certificates & secrets"
    authority: MICROSOFT_AUTHORITY,
  },
};

const msalClient = new ConfidentialClientApplication(msalConfig);

const microsoftLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code } = req.body;

    // Exchange authorization code for tokens
    const tokenResponse = await msalClient.acquireTokenByCode({
      code,
      scopes: ['user.read'],
      redirectUri: `${FRONTEND_URL}/login` as any,
    });

    if (!tokenResponse || !tokenResponse.account?.username) {
      await throwError('AUTH012');
      return;
    }

    // Get user info from Microsoft Graph
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${tokenResponse.accessToken}`,
      },
    });

    const userInfo = await response.json();

    if (!userInfo.mail && !userInfo.userPrincipalName) {
      await throwError('AUTH012');
      return;
    }

    const email = userInfo.mail || userInfo.userPrincipalName;

    // Check if user exists
    let user = await prismaClient.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create new user if doesn't exist
      user = await prismaClient.user.create({
        data: {
          email,
          name: userInfo.displayName || '',
          password: 'oauth-microsoft',
          status: 'ACTIVE',
          role: 'STUDENT',
          avatar: '', // Microsoft Graph doesn't provide direct photo URL
          isoauthuser: true, // Mark as OAuth user
        },
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        status: user.status,
      },
      JWT_SECRET,
      { expiresIn: '1d' },
    );

    // Update last login
    await prismaClient.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    res.setHeader('Authorization', `Bearer ${token}`);
    res.cookie('token', token, COOKIE_CONFIG_PROVIDER(true));

    res.status(200).json({
      success: true,
      message: 'Microsoft login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          avatar: user.avatar,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export { microsoftLogin };

//FE
// ## Step 1: Get Authorization URL
// https://login.microsoftonline.com/common/oauth2/v2.0/authorize
// ?client_id=c7840575-ac51-44f7-8287-2148c2d96eee
// &response_type=code
// &redirect_uri=https://tshaped-web.vercel.app/login
// &response_mode=query
// &scope=user.read,offline_access
// &state=12345

// Replace:
// - {TENANT_ID} with your tenant ID
// - {CLIENT_ID} with your client ID
// - {REDIRECT_URI} with your redirect URI (URL encoded)

// ## Step 2: Get Authorization Code
// 1. Open this URL in a browser
// 2. Login with Microsoft account
// 3. After successful login, you'll be redirected with a code in URL:
//    `your-redirect-uri?code=AUTHORIZATION_CODE`

//https://login.microsoftonline.com/a190e04d-d613-4b6b-aecf-75f3d978ed84/oauth2/v2.0/authorize?client_id=1d22fbb1-3cdc-4696-90c8-d3cde85965a2&response_type=code&redirect_uri=http://localhost:3000/microsoft&response_mode=query&scope=user.read&state=12345
