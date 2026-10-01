/**
 * Computes each item's line total and the invoice subtotal/total.
 * There is deliberately no tax calculation anywhere in this file — the
 * spec is explicit that GST/CGST/SGST/IGST must never appear on an
 * invoice. total_amount === subtotal, always.
 */
export function priceItems(items) {
  const priced = items.map((item) => {
    const total = round2(item.quantity * item.unit_price);
    return { ...item, total };
  });
  const subtotal = round2(priced.reduce((sum, i) => sum + i.total, 0));
  return { items: priced, subtotal, total_amount: subtotal };
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
