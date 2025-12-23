import { PrismaClient, Notification } from '@prisma/client';
import { Server } from 'socket.io';
import executeBackgroundTasks from '../utils/executeBackgroundTasks.js';
import redisService from '../config/redis.config.js';

const prisma = new PrismaClient();

export class NotificationService {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  async createNotification(data: {
    userId: string;
    type: string;
    message: string;
    metadata?: any;
  }): Promise<Notification> {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        message: data.message,
        metadata: data.metadata || {},
      },
    });

    // Emit to specific user's room
    this.io.to(data.userId).emit('newNotification', notification);
    //  cache
    executeBackgroundTasks(
      [
        async () => {
          const notificationConsumerGroup =
            data.type === 'ADMIN' ? 'getAdminNotifications' : 'getStudentNotifications';
          await redisService.invalidateRegistry(`${notificationConsumerGroup}:${data.userId}`);
        },
      ],
      'getAdminNotifications',
    );
    return notification;
  }

  async getAdminNotifications(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { type: 'ADMIN' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({
        where: { type: 'ADMIN' },
      }),
    ]);

    return {
      notifications,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getStudentNotifications(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: {
          userId,
          type: 'STUDENT',
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({
        where: {
          userId,
          type: 'STUDENT',
        },
      }),
    ]);

    return {
      notifications,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async markAsRead(notificationId: string): Promise<Notification> {
    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  // Mark all unread notifications as read for a user
  async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return result.count;
  }
}
