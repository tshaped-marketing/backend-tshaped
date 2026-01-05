import { z } from 'zod';

export const updateHeroComponentSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
  body: z
    .object({
      title: z.string().min(1).optional(),
      paragraph: z.string().min(1).optional(),
      imageUrl: z.string().url().optional(),
      isActive: z.boolean().optional(),
    })
    .refine(data => Object.keys(data).length > 0, {
      message: 'At least one field must be provided',
    }),
  query: z.object({}).optional(),
});

export const attachHeroToPageSchema = z.object({
  body: z.object({
    pageSlug: z.string().min(1),
    heroComponentId: z.string().min(1),
    overrideTitle: z.string().min(1).optional(),
    overrideParagraph: z.string().min(1).optional(),
    overrideImageUrl: z.string().url().optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updatePageHeroSchema = z.object({
  body: z
    .object({
      pageSlug: z.string().min(1),
      heroComponentId: z.string().min(1),
      overrideTitle: z.string().min(1).optional(),
      overrideParagraph: z.string().min(1).optional(),
      overrideImageUrl: z.string().url().optional(),
      isActive: z.boolean().optional(),
    })
    .refine(data => Object.keys(data).length > 2, {
      // pageSlug + heroComponentId + at least one field to change
      message: 'At least one override field or isActive must be provided',
    }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const deletePageHeroSchema = z.object({
  body: z.object({
    pageSlug: z.string().min(1),
    heroComponentId: z.string().min(1),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const getPageHeroSchema = z.object({
  query: z.object({
    pageSlug: z.string().min(1),
  }),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});



