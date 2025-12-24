import { Request, Response, NextFunction } from 'express';
import prismaClient from '../prisma/prisma.client.js';

export const getHeroComponents = async (_req: Request, res: Response, _next: NextFunction) => {
  const heroes = await prismaClient.heroComponent.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  res.status(200).json({
    status: 'success',
    data: {
      heroes,
    },
  });
};

export const updateHeroComponent = async (req: Request, res: Response, _next: NextFunction) => {
  const { id } = req.params;
  const { title, paragraph, imageUrl, isActive } = req.body;

  const where = id.startsWith('cm') ? { id } : { slug: id };

  const existing = await prismaClient.heroComponent.findUnique({ where });

  if (!existing) {
    return res.status(404).json({
      status: 'error',
      message: 'Hero component not found',
    });
  }

  const updated = await prismaClient.heroComponent.update({
    where,
    data: {
      title: title ?? existing.title,
      paragraph: paragraph ?? existing.paragraph,
      imageUrl: imageUrl ?? existing.imageUrl,
      isActive: typeof isActive === 'boolean' ? isActive : existing.isActive,
    },
  });

  res.status(200).json({
    status: 'success',
    data: {
      hero: updated,
    },
  });
};

export const attachHeroToPage = async (req: Request, res: Response, _next: NextFunction) => {
  const { pageSlug, heroComponentId, overrideTitle, overrideParagraph, overrideImageUrl } = req.body;

  const hero = await prismaClient.heroComponent.findUnique({
    where: { id: heroComponentId },
  });

  if (!hero) {
    return res.status(404).json({
      status: 'error',
      message: 'Hero component not found',
    });
  }

  const usage = await prismaClient.pageHeroComponent.upsert({
    where: {
      pageSlug_heroComponentId: {
        pageSlug,
        heroComponentId,
      },
    },
    update: {
      overrideTitle,
      overrideParagraph,
      overrideImageUrl,
      isActive: true,
    },
    create: {
      pageSlug,
      heroComponentId,
      overrideTitle,
      overrideParagraph,
      overrideImageUrl,
    },
  });

  res.status(200).json({
    status: 'success',
    data: {
      usage,
    },
  });
};

export const getPageHero = async (req: Request, res: Response, _next: NextFunction) => {
  const { pageSlug } = req.query;

  if (!pageSlug || typeof pageSlug !== 'string') {
    return res.status(400).json({
      status: 'error',
      message: 'pageSlug query parameter is required',
    });
  }

  const usage = await prismaClient.pageHeroComponent.findFirst({
    where: {
      pageSlug,
      isActive: true,
    },
    include: {
      heroComponent: true,
    },
  });

  if (!usage) {
    return res.status(404).json({
      status: 'error',
      message: 'No hero configured for this page',
    });
  }

  const hero = {
    id: usage.heroComponent.id,
    slug: usage.heroComponent.slug,
    title: usage.overrideTitle ?? usage.heroComponent.title,
    paragraph: usage.overrideParagraph ?? usage.heroComponent.paragraph,
    imageUrl: usage.overrideImageUrl ?? usage.heroComponent.imageUrl,
    isActive: usage.isActive && usage.heroComponent.isActive,
  };

  res.status(200).json({
    status: 'success',
    data: {
      hero,
    },
  });
};



