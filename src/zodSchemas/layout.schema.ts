import { orderBy } from 'lodash';
import { z } from 'zod';

// Enum schemas
export const SectionTypeSchema = z.enum(['HERO', 'CONTENT', 'GRID', 'CAROUSEL', 'BANNER', 'FORM']);
export const ContentTypeSchema = z.enum([
  'TEXT',
  'IMAGE',
  'VIDEO',
  'FILE',
  'BUTTON',
  'CUSTOM',
  'LIST',
]); // Added LIST
export const ContentPositionSchema = z.enum(['LEFT', 'CENTER', 'RIGHT', 'TOP', 'BOTTOM']);

// Base schemas for reusable objects
const StyleConfigSchema = z.object({
  backgroundColor: z.string().optional(),
  backgroundImage: z.string().optional(),
  customClass: z.string().optional(),
  customStyles: z.record(z.string()).optional(),
});

const SpacingConfigSchema = z.object({
  top: z.number(),
  right: z.number(),
  bottom: z.number(),
  left: z.number(),
});

// Page schemas
export const CreatePageSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  schema: z.string().optional(),
  metaData: z.record(z.any()).optional(),
  pathname: z.string().min(1).optional(),
  metaTitle: z.string().optional(),
  metaDesc: z.string().optional(),
  customClass: z.string().optional(),
  canonicalUrl: z.string().optional(),
  customStyles: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const UpdatePageSchema = CreatePageSchema.partial();

// Section schemas
export const CreateSectionSchema = z.object({
  type: SectionTypeSchema.optional(),
  backgroundType: z.string().optional(),
  title: z.string().optional(),
  slug: z.string().optional(),
  order: z.number().int().min(0).optional(),
  minHeight: z.number().int().min(0).optional(),
  maxHeight: z.number().int().min(0).optional(),
  component: z.string().optional(),
  columns: z.number().int().min(1).default(1),
  padding: SpacingConfigSchema.optional(),
  margin: SpacingConfigSchema.optional(),
  backgroundColor: z.string().optional(),
  backgroundImage: z.string().optional(),
  customClass: z.string().optional(),
  customStyles: z.record(z.string()).optional(),
  pageSlug: z.string(), // Changed from pageId to pageSlug
});

export const UpdateSectionSchema = CreateSectionSchema.omit({ pageSlug: true }).partial();

// Content schemas
const BaseContentSchema = z.object({
  type: ContentTypeSchema.optional(),
  position: ContentPositionSchema.default('CENTER').optional(),
  title: z.string().optional(),
  slug: z.string().optional(),
  order: z.number().int().min(0).optional(),
  subtitle: z.string().optional(),
  content: z.string().optional(),
  mediaUrl: z.string().optional(),
  actionUrl: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  customClass: z.string().optional(),
  customStyles: z.string().optional(),
  parentId: z.string().optional(), // Allow optional parentId
});
export const CreateContentSchema = BaseContentSchema.extend({
  sectionId: z.string(),
  order: z.number().optional(),
});

export const UpdateContentSchema = BaseContentSchema.partial();


// Schema for a single content item within the bulk creation request
// Define recursive content item schema
export const BulkContentItemSchema: z.ZodType<any> = BaseContentSchema.extend({}).and(
  z.object({
    children: z.lazy(() => z.array(BulkContentItemSchema).optional()),
  })
);


// Schema for the bulk creation request
export const BulkCreateContentSchema = z.object({
  sectionId: z.string(),
  contents: z.array(BulkContentItemSchema).min(1).max(100), // Limit batch size to prevent performance issues
  preserveOrder: z.boolean().default(true).optional(), // Whether to preserve the order provided in the array
});
