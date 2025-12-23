import { z } from 'zod';

const priorityEnum = z.enum(['High', 'Medium', 'Low']);

const contactMessageSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  email: z.string().email({ message: 'Invalid email address' }),
  subject: z.string().optional(),
  message: z.string().min(1, { message: 'Message is required' }),
  priority: priorityEnum.optional(),
});

export const createContactSchema = z.object({
  body: contactMessageSchema.strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});

export const updateContactSchema = z.object({
  body: contactMessageSchema.partial().strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      id: z.string(),
    })
    .strict(),
});

export const getContactSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      id: z.string(),
    })
    .strict(),
});

export const deleteContactSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      id: z.string(),
    })
    .strict(),
});

export const listContactsSchema = z.object({
  body: z.object({}).strict(),
  query: z
    .object({
      page: z.string().optional(),
      limit: z.string().optional(),
      responded: z.string().optional(),
      priority: priorityEnum.optional(),
    })
    .strict(),
  params: z.object({}).strict(),
});
