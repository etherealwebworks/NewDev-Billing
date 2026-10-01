import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

export const reportQuerySchema = z.object({
  range: z.enum(["today", "week", "month", "year", "custom"]).default("month"),
  start: isoDate.optional(),
  end: isoDate.optional(),
});
