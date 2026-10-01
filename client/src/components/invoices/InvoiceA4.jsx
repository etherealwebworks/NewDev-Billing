import { formatINR, formatDate } from "../../utils/format";

export default function InvoiceA4({ invoice }) {
  const company = invoice.company_details_snapshot || {};
  const client = invoice.client_details_snapshot || {};

  return (
    <div className="mx-auto w-full max-w-[210mm] bg-white p-10 text-text-dark print:p-0 print:shadow-none" id="invoice-a4">
      <div className="flex items-start justify-between border-b border-border-muted pb-6">
        <div>
          <h1 className="text-xl font-semibold">{company.company_name}</h1>
          {company.address && <p className="mt-1 text-sm text-text-muted whitespace-pre-line">{company.address}</p>}
          <p className="mt-1 text-sm text-text-muted">
            {[company.phone, company.phone_2, company.email].filter(Boolean).join(" · ")}
          </p>
          {company.website && <p className="text-sm text-text-muted">{company.website}</p>}
        </div>
        <div className="text-right">
          <h2 className="text-lg font-semibold uppercase tracking-wide">Invoice</h2>
          <p className="mt-1 text-sm text-text-muted">{invoice.invoice_number}</p>
          <p className="text-sm text-text-muted">{formatDate(invoice.invoice_date)}</p>
          {invoice.due_date && (
            <p className="text-sm text-text-muted">Due {formatDate(invoice.due_date)}</p>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Billed To</div>
          <p className="mt-1 font-medium">{client.client_name}</p>
          {client.company_name && <p className="text-sm text-text-muted">{client.company_name}</p>}
          {client.address && <p className="text-sm text-text-muted whitespace-pre-line">{client.address}</p>}
          <p className="text-sm text-text-muted">{[client.phone, client.email].filter(Boolean).join(" · ")}</p>
        </div>
        {invoice.project?.project_name && (
          <div className="text-right">
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Project</div>
            <p className="mt-1 text-sm">{invoice.project.project_name}</p>
          </div>
        )}
      </div>

      <table className="mt-8 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-ink text-xs uppercase tracking-wide text-text-muted">
            <th className="py-2">Description</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Unit Price</th>
            <th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, i) => (
            <tr key={i} className="border-b border-border-muted">
              <td className="py-3">{item.description}</td>
              <td className="py-3 text-right">{item.quantity}</td>
              <td className="py-3 text-right">{formatINR(item.unit_price)}</td>
              <td className="py-3 text-right">{formatINR(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <div className="w-64 space-y-1.5 text-sm">
          <div className="flex justify-between text-text-muted">
            <span>Subtotal</span>
            <span>{formatINR(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between border-t border-ink pt-1.5 text-base font-semibold">
            <span>Total Amount</span>
            <span>{formatINR(invoice.total_amount)}</span>
          </div>
          {invoice.amount_paid > 0 && (
            <div className="flex justify-between text-text-muted">
              <span>Amount Paid</span>
              <span>{formatINR(invoice.amount_paid)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border-muted pt-1.5 text-base font-semibold">
            <span>Balance Due</span>
            <span>{formatINR(invoice.outstanding_amount ?? invoice.total_amount)}</span>
          </div>
        </div>
      </div>

      {company.authorized_signatory_name && (
        <div className="mt-10 flex justify-end">
          <div className="text-center text-sm">
            <div className="h-10" />
            <div className="border-t border-border-muted pt-1 text-text-muted">
              {company.authorized_signatory_name}
            </div>
          </div>
        </div>
      )}

      {company.footer && <p className="mt-8 text-center text-xs text-text-muted">{company.footer}</p>}
    </div>
  );
}
