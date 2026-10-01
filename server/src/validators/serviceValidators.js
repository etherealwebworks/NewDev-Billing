import { z } from "zod";

export const createServiceSchema = z.object({
  name: z.string().min(1, "Service name is required."),
  description: z.string().optional().nullable(),
  number_of_videos: z.coerce.number().int().positive(),
  number_of_posters: z.coerce.number().int().nonnegative().default(0),
  budget: z.coerce.number().nonnegative(),
});

export const updateServiceSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  number_of_videos: z.coerce.number().int().positive().optional(),
  number_of_posters: z.coerce.number().int().nonnegative().optional(),
  budget: z.coerce.number().nonnegative().optional(),
  is_active: z.boolean().optional(),
});
