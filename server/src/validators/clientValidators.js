import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

export const createClientSchema = z.object({
  // Client details
  client_name: z.string().min(1, "Client name is required."),
  company_name: z.string().optional().nullable(),
  phone: z.string().min(1, "Phone number is required."),
  email: z.string().email().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),

  // Project details
  project_name: z.string().min(1, "Project name is required."),
  description: z.string().optional().nullable(),
  number_of_videos: z.coerce.number().int().positive(),
  number_of_posters: z.coerce.number().int().nonnegative().default(0),
  allowed_submission_days: z.coerce.number().int().positive(),
  start_date: isoDate,
  submission_deadline: isoDate.optional(), // if omitted, auto-calculated
  deadline_manually_set: z.boolean().optional().default(false),
  assigned_staff_id: z.string().uuid("Select a staff member."),
  notes: z.string().optional().nullable(),
  service_id: z.string().uuid().optional().nullable(),
  project_type: z.enum(["standard", "event"]).default("standard"),
  event_name: z.string().optional().nullable(),

  // Billing details
  project_amount: z.coerce.number().nonnegative(),
  advance_amount: z.coerce.number().nonnegative().optional().default(0),
  payment_due_date: isoDate.optional().nullable(),
}).refine((data) => data.project_type !== "event" || (data.event_name && data.event_name.trim().length > 0), {
  message: "Event Name is required for event-type projects.",
  path: ["event_name"],
});

export const updateClientSchema = z.object({
  client_name: z.string().min(1).optional(),
  company_name: z.string().optional().nullable(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
});

export const clientQuerySchema = z.object({
  search: z.string().optional(),
  staff_id: z.string().uuid().optional(),
  status: z.enum(["not_started", "in_progress", "completed", "overdue"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(20),
  sort: z.enum(["created_at", "submission_deadline", "client_name"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});
