import { z } from "zod";

export const updateSettingsSchema = z.object({
  company_name: z.string().min(1).optional(),
  logo_url: z.string().url().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  phone_2: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  website: z.string().optional().nullable(),
  invoice_prefix: z.string().min(1).max(10).optional(),
  invoice_footer: z.string().optional().nullable(),
  payment_instructions: z.string().optional().nullable(),
  authorized_signatory_name: z.string().optional().nullable(),
  default_invoice_description: z.string().optional().nullable(),
  default_currency: z.string().optional(),
  thermal_paper_width: z.enum(["58mm", "80mm"]).optional(),
  default_invoice_format: z.enum(["a4", "thermal"]).optional(),
  time_zone: z.string().optional(),
  date_format: z.string().optional(),
});
