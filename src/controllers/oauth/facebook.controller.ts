import axios from 'axios';
import { Request, Response, NextFunction } from 'express';
import { throwError } from '../../middlewares/errorHandler.middleware.js';
import prismaClient from '../../prisma/prisma.client.js';
import jwt from 'jsonwebtoken';
import { COOKIE_CONFIG_PROVIDER } from '../../config/cookie.config.js';
import {
  JWT_SECRET,
  FACEBOOK_APP_ID,
  FACEBOOK_APP_SECRET
} from '../../constants/env.constant.js';

// Helper function to validate Facebook token
const verifyFacebookToken = async (accessToken: string) => {
  try {
    const appTokenResponse = await axios.get(
      `https://graph.facebook.com/oauth/access_token?client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&grant_type=client_credentials`,
    );

    const appToken = appTokenResponse.data.access_token;

    // Verify the user token using Facebook's debug_token endpoint
    const verifyResponse = await axios.get(
      `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appToken}`,
    );

    return verifyResponse.data.data.is_valid;
  } catch (error) {
    console.error('Facebook token verification failed:', error);
    return false;
  }
};

const facebookLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { accessToken } = req.body;

    if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
      await throwError('AUTH013'); // Custom error for missing Facebook credentials
      return;
    }

    // Verify the Facebook access token
    const isValidToken = await verifyFacebookToken(accessToken);
    if (!isValidToken) {
      await throwError('AUTH014'); // Custom error for invalid Facebook token
      return;
    }

    // Get user data from Facebook
    const response = await axios.get(
      `https://graph.facebook.com/v19.0/me?fields=id,name,email,picture,link&access_token=${accessToken}`,
    );

    const { email, name, picture, link } = response.data;

    if (!email) {
      await throwError('AUTH012');
      return;
    }

    // Check if user exists
    let user = await prismaClient.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create new user if doesn't exist
      user = await prismaClient.user.create({
        data: {
          email,
          name: name || '',
          password: 'oauth-facebook', // Consider using a more secure method
          status: 'PENDING_VERIFICATION',
          role: 'STUDENT',
          avatar: picture?.data?.url || '',
          socialLinks: {
            facebook: link || '',
          },
          preferences: {
            oauth_provider: 'facebook',
            oauth_id: response.data.id,
          },
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
      data: {
        lastLoginAt: new Date(),
        // Update preferences to store OAuth info
        preferences: {
          ...(user.preferences as any),
          last_login_provider: 'facebook',
          facebook_last_login: new Date().toISOString(),
        },
      },
    });

    res.setHeader('Authorization', `Bearer ${token}`);
    res.cookie('token', token, COOKIE_CONFIG_PROVIDER(true));

    res.status(200).json({
      success: true,
      message: 'Facebook login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          avatar: user.avatar,
          socialLinks: user.socialLinks,
          preferences: user.preferences,
        },
      },
    });
  } catch (error) {
    console.error('Facebook login error:', error);
    next(error);
  }
};

export { facebookLogin };
