import { Request, Response, NextFunction } from 'express';
import sendEmail from '../utils/emails/sendEmail.js';
import prismaClient from '../prisma/prisma.client.js';
import { throwError } from '../middlewares/errorHandler.middleware.js';
import { contactEmailTemplate } from '../utils/emails/email.template.js';
import getSettingDetails from '../utils/getDataBySettingSlug.js';
import { OTP_EMAIL } from '../constants/env.constant.js';

const createContactMessage = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { name, email, subject, message, priority } = req.body;

  const contactMessage = await prismaClient.contactMessage.create({
    data: {
      name,
      email,
      subject,
      message,
      priority,
    },
  });

  // Send notification email
  const fromEmail = await getSettingDetails({ slug: 'email-config-settings' });
  await sendEmail({
    to: OTP_EMAIL,
    subject: `New Contact Message from ${email}`,
    htmlTemplate: contactEmailTemplate(name, email, subject, message, priority),
    from: fromEmail?.value.contact,
    text: `New contact message from ${name} (${email}): ${message}`,
  });

  res.status(201).json({
    success: true,
    data: contactMessage,
  });
};

const getContactMessage = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { id } = req.params;

  const contactMessage = await prismaClient.contactMessage.findUnique({
    where: { id },
  });

  if (!contactMessage) {
    throwError('CONTACT001');
  }

  res.status(200).json({
    success: true,
    data: contactMessage,
  });
};

const listContactMessages = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { page = '1', limit = '10', responded, priority } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const where = {
    ...(responded && { responded: responded === 'true' }),
    ...(priority && { priority: priority as string }),
  };

  const [contactMessages, total] = await Promise.all([
    prismaClient.contactMessage.findMany({
      where,
      skip,
      take: parseInt(limit as string),
      orderBy: { createdAt: 'desc' },
    }),
    prismaClient.contactMessage.count({ where }),
  ]);

  res.status(200).json({
    success: true,
    data: contactMessages,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string)),
    },
  });
};

const updateContactMessage = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { id } = req.params;
  const updateData = req.body;

  const contactMessage = await prismaClient.contactMessage.findUnique({
    where: { id },
  });

  if (!contactMessage) {
    throwError('CONTACT001');
  }

  const updatedMessage = await prismaClient.contactMessage.update({
    where: { id },
    data: {
      ...updateData,
      ...(updateData.responded && { respondedAt: new Date() }),
    },
  });

  res.status(200).json({
    success: true,
    data: updatedMessage,
  });
};

const deleteContactMessage = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { id } = req.params;

  const contactMessage = await prismaClient.contactMessage.findUnique({
    where: { id },
  });

  if (!contactMessage) {
    throwError('CONTACT001');
  }

  await prismaClient.contactMessage.delete({
    where: { id },
  });

  res.status(204).send();
};

export {
  createContactMessage,
  getContactMessage,
  listContactMessages,
  updateContactMessage,
  deleteContactMessage,
};
