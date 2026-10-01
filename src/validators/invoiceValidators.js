import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

export const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required."),
  quantity: z.coerce.number().positive(),
  unit_price: z.coerce.number().nonnegative(),
});

export const createInvoiceSchema = z.object({
  project_id: z.string().uuid(),
  due_date: isoDate.optional().nullable(),
  items: z.array(invoiceItemSchema).min(1, "At least one line item is required."),
  advance_payment: z
    .object({
      amount: z.coerce.number().positive(),
      payment_method: z.enum(["cash", "upi", "bank_transfer", "card", "other"]),
      payment_date: isoDate.optional(),
    })
    .optional(),
});

export const reissueInvoiceSchema = z.object({
  due_date: isoDate.optional().nullable(),
  items: z.array(invoiceItemSchema).min(1, "At least one line item is required."),
});

export const cancelInvoiceSchema = z.object({
  reason: z.string().min(1, "A cancellation reason is required."),
});

export const invoiceQuerySchema = z.object({
  search: z.string().optional(),
  client_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  status: z.enum(["draft", "issued", "paid", "cancelled"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(20),
});
