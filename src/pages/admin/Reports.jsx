import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { reportsApi } from "../../services/reports";
import { useTheme } from "../../context/ThemeContext";
import { formatINR, formatDate } from "../../utils/format";

const RANGES = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "custom", label: "Custom" },
];

export default function Reports() {
  const { theme } = useTheme();
  const chartColors =
    theme === "dark"
      ? { grid: "#2A2A2A", axis: "#A3A3A3", accent: "#F5F5F5" }
      : { grid: "#E5E5E5", axis: "#737373", accent: "#0A0A0A" };

  const [range, setRange] = useState("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (range === "custom" && (!customStart || !customEnd)) return;
    setLoading(true);
    const d = await reportsApi.get({
      range,
      start: range === "custom" ? customStart : undefined,
      end: range === "custom" ? customEnd : undefined,
    });
    setData(d);
    setLoading(false);
  }, [range, customStart, customEnd]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-dark">Reports</h1>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              range === r.value ? "bg-ink text-white" : "border border-border-muted text-text-muted hover:bg-paper-off"
            }`}
          >
            {r.label}
          </button>
        ))}
        {range === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-lg border border-border-muted bg-paper px-2 py-1.5 text-xs outline-none focus:border-ink"
            />
            <span className="text-xs text-text-muted">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-lg border border-border-muted bg-paper px-2 py-1.5 text-xs outline-none focus:border-ink"
            />
          </div>
        )}
      </div>

      {loading && <p className="mt-6 text-sm text-text-muted">Loading…</p>}

      {!loading && data && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label={`Revenue (${data.totals.invoices_in_range} invoices)`} value={formatINR(data.totals.revenue_in_range)} />
            <StatCard label={`Collected (${data.totals.payments_in_range} payments)`} value={formatINR(data.totals.collected_in_range)} />
            <StatCard label="Total Outstanding" value={formatINR(data.totals.total_outstanding)} />
            <StatCard label="Overdue Projects" value={data.project_counts.overdue} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Revenue by Month (last 12 months)">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.revenue_by_month}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke={chartColors.axis} />
                  <YAxis tick={{ fontSize: 11 }} stroke={chartColors.axis} />
                  <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="revenue" fill={chartColors.accent} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Payments Received (selected range)">
              {data.payments_by_date.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data.payments_by_date}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke={chartColors.axis} />
                    <YAxis tick={{ fontSize: 11 }} stroke={chartColors.axis} />
                    <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Line type="monotone" dataKey="amount" stroke={chartColors.accent} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TableCard title="Outstanding Payments by Client">
              {data.outstanding_by_client.length === 0 ? (
                <p className="text-sm text-text-muted">Nothing outstanding.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <tbody>
                    {data.outstanding_by_client.map((c) => (
                      <tr key={c.client_id} className="border-b border-border-muted last:border-0">
                        <td className="py-2 text-text-dark">{c.client_name}</td>
                        <td className="py-2 text-right text-text-dark">{formatINR(c.outstanding)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </TableCard>

            <TableCard title="Staff Project Completion Summary">
              {data.staff_completion.length === 0 ? (
                <p className="text-sm text-text-muted">No staff accounts yet.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-text-muted">
                      <th className="pb-2 font-medium">Staff</th>
                      <th className="pb-2 text-right font-medium">Active</th>
                      <th className="pb-2 text-right font-medium">Completed</th>
                      <th className="pb-2 text-right font-medium">Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.staff_completion.map((s) => (
                      <tr key={s.staff_id} className="border-t border-border-muted">
                        <td className="py-2 text-text-dark">{s.full_name}</td>
                        <td className="py-2 text-right text-text-dark">{s.active_projects}</td>
                        <td className="py-2 text-right text-text-dark">{s.completed_projects}</td>
                        <td className="py-2 text-right text-text-dark">{s.pending_projects}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </TableCard>
          </div>

          <p className="mt-4 text-xs text-text-muted">
            Range shown: {formatDate(data.range.start)} – {formatDate(data.range.end)}. Project-status
            counts and the monthly revenue chart reflect current state / the trailing 12 months
            regardless of this filter.
          </p>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-border-muted bg-paper p-4">
      <div className="text-xl font-semibold text-text-dark">{value}</div>
      <div className="mt-1 text-xs text-text-muted">{label}</div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-border-muted bg-paper p-4">
      <h2 className="mb-2 text-sm font-semibold text-text-dark">{title}</h2>
      {children}
    </div>
  );
}

function TableCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-border-muted bg-paper p-4">
      <h2 className="mb-3 text-sm font-semibold text-text-dark">{title}</h2>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[240px] items-center justify-center text-sm text-text-muted">
      No payments in this range.
    </div>
  );
}
