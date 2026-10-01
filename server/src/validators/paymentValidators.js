import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

export const createPaymentSchema = z.object({
  invoice_id: z.string().uuid(),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  payment_method: z.enum(["cash", "upi", "bank_transfer", "card", "other"]),
  payment_date: isoDate.optional(),
  transaction_reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const reversePaymentSchema = z.object({
  reason: z.string().min(1, "A reversal reason is required."),
});

export const paymentQuerySchema = z.object({
  invoice_id: z.string().uuid().optional(),
  client_id: z.string().uuid().optional(),
  payment_method: z.enum(["cash", "upi", "bank_transfer", "card", "other"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(20),
});
