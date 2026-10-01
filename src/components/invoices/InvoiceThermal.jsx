import { formatINR, formatDate } from "../../utils/format";

const WIDTHS = { "58mm": "58mm", "80mm": "80mm" };

export default function InvoiceThermal({ invoice, width = "80mm" }) {
  const company = invoice.company_details_snapshot || {};
  const client = invoice.client_details_snapshot || {};
  const charWidth = width === "58mm" ? 32 : 42;

  return (
    <div
      id="invoice-thermal"
      style={{ width: WIDTHS[width] }}
      className="mx-auto bg-white p-3 font-mono text-[11px] leading-relaxed text-text-dark"
    >
      <div className="text-center">
        <div className="text-sm font-bold">{company.company_name}</div>
        {company.address && <div className="whitespace-pre-line text-[10px]">{company.address}</div>}
        {company.phone && <div className="text-[10px]">{company.phone}</div>}
        {company.phone_2 && <div className="text-[10px]">{company.phone_2}</div>}
      </div>

      <Divider width={charWidth} />

      <div>Invoice: {invoice.invoice_number}</div>
      <div>Date: {formatDate(invoice.invoice_date)}</div>
      {invoice.due_date && <div>Due: {formatDate(invoice.due_date)}</div>}
      <div className="mt-1">Bill To: {client.client_name}</div>
      {client.phone && <div>{client.phone}</div>}

      <Divider width={charWidth} />

      {invoice.items.map((item, i) => (
        <div key={i} className="mb-1">
          <div>{item.description}</div>
          <div className="flex justify-between">
            <span>
              {item.quantity} x {formatINR(item.unit_price)}
            </span>
            <span>{formatINR(item.total)}</span>
          </div>
        </div>
      ))}

      <Divider width={charWidth} />

      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{formatINR(invoice.subtotal)}</span>
      </div>
      <div className="flex justify-between font-bold">
        <span>TOTAL</span>
        <span>{formatINR(invoice.total_amount)}</span>
      </div>
      {invoice.amount_paid > 0 && (
        <div className="flex justify-between">
          <span>Paid</span>
          <span>{formatINR(invoice.amount_paid)}</span>
        </div>
      )}
      <div className="mt-1 flex justify-between text-sm font-bold">
        <span>BALANCE DUE</span>
        <span>{formatINR(invoice.outstanding_amount ?? invoice.total_amount)}</span>
      </div>

      <Divider width={charWidth} />

      {company.footer && <div className="mt-2 text-center text-[10px]">{company.footer}</div>}
    </div>
  );
}

function Divider({ width }) {
  return <div className="my-1.5">{"-".repeat(width)}</div>;
}
