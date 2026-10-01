import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

// Admin: full project edit — deadline, amount, staff assignment, everything.
export const updateProjectSchema = z.object({
  project_name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  number_of_videos: z.coerce.number().int().positive().optional(),
  number_of_posters: z.coerce.number().int().nonnegative().optional(),
  allowed_submission_days: z.coerce.number().int().positive().optional(),
  start_date: isoDate.optional(),
  submission_deadline: isoDate.optional(),
  deadline_manually_set: z.boolean().optional(),
  assigned_staff_id: z.string().uuid().optional(),
  project_amount: z.coerce.number().nonnegative().optional(),
  advance_amount: z.coerce.number().nonnegative().optional(),
  payment_due_date: isoDate.optional().nullable(),
  notes: z.string().optional().nullable(),
  service_id: z.string().uuid().optional().nullable(),
  project_type: z.enum(["standard", "event"]).optional(),
  event_name: z.string().optional().nullable(),
}).refine((data) => data.project_type !== "event" || !("event_name" in data) || (data.event_name && data.event_name.trim().length > 0), {
  message: "Event Name is required for event-type projects.",
  path: ["event_name"],
});

// Staff (and admin): status-only. Deliberately the only field this schema
// accepts — enforced again in the controller by only ever reading
// `work_status` off the parsed object, never the raw body.
export const updateStatusSchema = z.object({
  work_status: z.enum(["not_started", "in_progress", "completed"]),
});

export const projectQuerySchema = z.object({
  search: z.string().optional(),
  staff_id: z.string().uuid().optional(),
  client_id: z.string().uuid().optional(),
  status: z.enum(["not_started", "in_progress", "completed", "overdue"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(20),
  sort: z.enum(["created_at", "submission_deadline", "project_name"]).default("submission_deadline"),
  order: z.enum(["asc", "desc"]).default("asc"),
});
