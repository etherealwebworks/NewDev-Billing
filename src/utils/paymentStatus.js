function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Derives Unpaid / Partially Paid / Paid / Overdue from amounts + due date.
 * This is intentionally NOT stored on the invoice row — it's always
 * recomputed from payments so it can never drift out of sync.
 */
export function derivePaymentStatus({ totalAmount, amountPaid, dueDate, invoiceStatus }) {
  if (invoiceStatus === "cancelled") return null;

  const outstanding = Math.max(totalAmount - amountPaid, 0);
  let status;
  if (amountPaid <= 0) status = "unpaid";
  else if (outstanding <= 0) status = "paid";
  else status = "partially_paid";

  if (status !== "paid" && dueDate && dueDate < today()) status = "overdue";
  return status;
}
