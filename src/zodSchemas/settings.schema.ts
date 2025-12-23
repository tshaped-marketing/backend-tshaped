import { z } from 'zod';

// Enum schemas based on your model
const SettingModeEnum = z.enum(['SINGLE', 'MULTIPLE', 'NESTED']);
const SettingDataTypeEnum = z.enum(['STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'ARRAY', 'OBJECT','TEXT','TEXTAREA']);
const SettingPlatformEnum = z.enum(['ALL', 'WEB', 'MOBILE', 'DESKTOP']);

// Base schemas
const settingIdSchema = z.object({
  id: z.string().min(1, "Setting ID is required")
});

const identifierSchema = z.object({
  identifier: z.string().min(1, "Identifier is required")
});

// Query parameters for getAllSettings
const getAllSettingsQuerySchema = z.object({
  isActive: z.enum(['true', 'false']).optional(),
  parentId: z.string().optional(),
  mode: SettingModeEnum.optional(),
  dataType: SettingDataTypeEnum.optional(),
  platform: SettingPlatformEnum.optional()
});

// Query parameters for getSettingByIdentifier
const getSettingByIdentifierQuerySchema = z.object({
  depth: z.string().regex(/^\d+$/, "Depth must be a number").optional()
});

// Create Setting Schema
export const createSettingSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required"),
    slug: z.string().optional(),
    description: z.string().optional(),
    mode: SettingModeEnum,
    dataType: SettingDataTypeEnum,
    value: z.any().optional(),
    parentId: z.string().optional(),
    order: z.number().int().optional().default(0),
    isActive: z.boolean().optional().default(true),
    platform: SettingPlatformEnum.optional().default('ALL')
  })
});

// Get Setting By Identifier Schema
export const getSettingByIdentifierSchema = z.object({
  params: identifierSchema,
  query: getSettingByIdentifierQuerySchema
});

// Get All Settings Schema
export const getAllSettingsSchema = z.object({
  query: getAllSettingsQuerySchema
});

// Update Setting Schema
export const updateSettingSchema = z.object({
  params: settingIdSchema,
  body: z.object({
    title: z.string().optional(),
    slug: z.string().optional(),
    description: z.string().optional(),
    mode: SettingModeEnum.optional(),
    dataType: SettingDataTypeEnum.optional(),
    value: z.any().optional(),
    parentId: z.string().optional(),
    order: z.number().int().optional(),
    isActive: z.boolean().optional(),
    platform: SettingPlatformEnum.optional()
  })
});

// Delete Setting Schema
export const deleteSettingSchema = z.object({
  params: settingIdSchema
});

// Batch Update Settings Schema
export const batchUpdateSettingsSchema = z.object({
  body: z.array(
    z.object({
      id: z.string().min(1, "Setting ID is required"),
      value: z.any()
    })
  )
});

// Create Settings JSON Schema
export const createSettingsJsonSchema = z.object({
  // No specific validation needed, but keeping the schema for consistency
});