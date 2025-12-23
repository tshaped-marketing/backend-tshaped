import { Request, Response, NextFunction } from 'express';
import prismaClient from '../../prisma/prisma.client.js';
import jwt from 'jsonwebtoken';
import { GOOGLE_CLIENT_ID, JWT_SECRET } from '../../constants/env.constant.js';
import { COOKIE_CONFIG_PROVIDER } from '../../config/cookie.config.js';
import { throwError } from '../../middlewares/errorHandler.middleware.js';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const googleLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id_token } = req.body;

    if (!id_token) {
      await throwError('AUTH013');
      return;
    }

    // Verify the ID token with Google
    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: GOOGLE_CLIENT_ID,
    });


    const payload = ticket.getPayload();
    
    if (!payload || !payload.email) {
      await throwError('AUTH012');
      return;
    }

    // Verify that email is verified by Google
    if (!payload.email_verified) {
      await throwError('AUTH014');
      return;
    }

    // Check if user exists
    let user = await prismaClient.user.findUnique({
      where: { email: payload.email },
    });

    if (!user) {
      // Create new user if doesn't exist
      user = await prismaClient.user.create({
        data: {
          email: payload.email,
          name: payload.name || '',
          password: 'oauth-google', // Placeholder password for OAuth users
          status: 'ACTIVE', // Auto verify Google users
          role: 'STUDENT',
          avatar: payload.picture || '',
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
      message: 'Google login successful',
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
    console.error('Google login error:', error);
    next(error);
  }
};

export { googleLogin };