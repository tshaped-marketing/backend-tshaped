import { Request, Response, NextFunction } from 'express';
import { throwError } from '../middlewares/errorHandler.middleware.js';
import prismaClient from '../prisma/prisma.client.js';
import { CustomRequest } from '../types/auth.types.js';
import { titleToSlug } from '../utils/titleToSlug.js';
import { handleCachedResponse } from '../utils/handleCacheResponse.js';
import executeBackgroundTasks from '../utils/executeBackgroundTasks.js';
import redisService from '../config/redis.config.js';
import { getAllBlogs_registry_TTL, getBlogById_TTL } from '../constants/redis.cacheTTL.js';
import { formatDateTime } from '../utils/formatDateTime.js';




const createBlog = async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
  const {
    title,
    summary,
    content,
    metaTitle,
    metaDescription,
    author,
    authorLink,
    image,
    showUpdateDate,
    publishedDate,
    published,
  } = req.body;
  const userId = req.user?.userId;

  const existingBlog = await prismaClient.blog.findFirst({
    where: { title },
  });

  if (existingBlog) {
    return await throwError('BLOG002');
  }

  const slug = titleToSlug(title);
  const authorPic = await prismaClient.user.findFirst({
    where: {
      id: req.user?.userId,
    },
    select: {
      avatar: true,
    },
  });

  const blog = await prismaClient.blog.create({
    data: {
      title,
      slug,
      summary,
      content,
      metaTitle,
      metaDescription,
      author:req.user?.name,
      authorLink,
      authorProfilePic:authorPic?.avatar?authorPic?.avatar:null,
      image,
      showUpdateDate,
      publishedDate: publishedDate ? new Date(publishedDate) : null,
      published: published || false,
      userId,
    } as any,
  });

  res.status(201).json({
    status: 'success',
    data: { blog },
  });
};

const updateBlog = async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const {
    title,
    summary,
    content,
    metaTitle,
    metaDescription,
    author,
    authorLink,
    image,
    showUpdateDate,
    publishedDate,
    published,
  } = req.body;
  const where = id.startsWith('cm') ? { id: id } : { slug: id };
  const blog = await prismaClient.blog.findUnique({
    where,
  });

  if (!blog) {
    return await throwError('BLOG001');
  }

  if (blog.userId !== req.user?.userId && req.user?.role.toLocaleUpperCase() !== 'ADMIN') {
    return await throwError('BLOG003');
  }

  const updateData: any = {
    summary,
    content,
    metaTitle,
    metaDescription,
    author,
    authorLink,
    image,
    showUpdateDate,
    publishedDate: publishedDate ? new Date(publishedDate) : undefined,
    published,
  };

  if (title) {
    updateData.title = title;
    updateData.slug = titleToSlug(title);
  }

  const updatedBlog = await prismaClient.blog.update({
    where: { id },
    data: updateData,
  });

  res.status(200).json({
    status: 'success',
    data: { blog: updatedBlog },
  });

  // Invalidate cache
  executeBackgroundTasks(
    [
      async () => {
        await redisService.invalidateMultipleKeys([`getBlogById:${updatedBlog.id}`,`getBlogById:${updatedBlog.slug}`]);
        await redisService.invalidateRegistry('getAllBlogs');
        return;
      },
    ],
    'updateBlog',
  );
};

const getBlogById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;

  const cacheKey = `getBlogById:${id}`;
  const responseSent = await handleCachedResponse(cacheKey, res);
  if (responseSent) {
    return;
  }
  const where = id.startsWith('cm') ? { id: id } : { slug: id };
  const blog = await prismaClient.blog.findUnique({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!blog) {
    return await throwError('BLOG001');
  }

  res.status(200).json({
    status: 'success',
    data: {
      blog: {
        ...blog,
        createdAt: formatDateTime(blog.createdAt),
        updatedAt: formatDateTime(blog.updatedAt),
        publishedDate: blog.publishedDate?formatDateTime(blog.publishedDate):undefined,
      },
    },
  });

  // Execute caching
  executeBackgroundTasks(
    [
      async () => {
        return await redisService.cacheResponse(
          cacheKey,
          {
            status: 'success',
            data: {
              blog: {
                ...blog,
                createdAt: formatDateTime(blog.createdAt),
                updatedAt: formatDateTime(blog.updatedAt),
                publishedDate: blog.publishedDate?formatDateTime(blog.publishedDate):undefined,
              },
            },
          },
          getBlogById_TTL, // 24 hrs in seconds
        );
      },
    ],
    'getBlogById',
  );
};

const getAllBlogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const published = req.query.published === 'true';

  const cacheKey = `getAllBlogs:${page}-${limit}-${published}`;
  const responseSent = await handleCachedResponse(cacheKey, res);
  if (responseSent) {
    return;
  }
  const skip = (page - 1) * limit;

  const where = {
    published: published || undefined,
  };

  const [blogs, total] = await Promise.all([
    prismaClient.blog.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prismaClient.blog.count({ where }),
  ]);


  const formattedBlogs = blogs.map(blog => ({
    ...blog,
    createdAt: formatDateTime(blog.createdAt),
    updatedAt: formatDateTime(blog.updatedAt),
    publishedDate: blog.publishedDate?formatDateTime(blog.publishedDate):undefined,
  }));
  
  res.status(200).json({
    status: 'success',
    data: {
      formattedBlogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });

  // Execute caching
  executeBackgroundTasks(
    [
      async () => {
        return await redisService.cacheWithRegistry(
          cacheKey,
          {
            status: 'success',
            data: {
              formattedBlogs,
              pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
              },
            },
          },
          getAllBlogs_registry_TTL,
          'getAllBlogs',
        );
      },
    ],
    'getBlogById',
  );
};

const deleteBlog = async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const where = id.startsWith('cm') ? { id: id } : { slug: id };
  const blog = await prismaClient.blog.findUnique({
    where,
  });

  if (!blog) {
    return await throwError('BLOG001');
  }

  if (blog.userId !== req.user?.userId && req.user?.role.toLocaleUpperCase() !== 'ADMIN') {
    return await throwError('BLOG003');
  }

  const deletedBlog = await prismaClient.blog.delete({
    where: { id },
  });

  res.status(204).send();

  // Invalidate cache
  executeBackgroundTasks(
    [
      async () => {
       await redisService.invalidateMultipleKeys([`getBlogById:${deletedBlog.id}`,`getBlogById:${deletedBlog.slug}`]);
        await redisService.invalidateRegistry('getAllBlogs');
        return;
      },
    ],
    'deleteBlog',
  );
};

export { createBlog, updateBlog, getBlogById, getAllBlogs, deleteBlog };
