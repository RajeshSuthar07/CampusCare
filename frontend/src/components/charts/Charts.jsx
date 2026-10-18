import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { STATUS_CHART_COLORS, statusLabel } from '../../lib/format.js';

const AXIS = { fontSize: 12, fill: '#64748b' };
const GRID = '#e2e8f0';
const tooltipStyle = { borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)' };

export function ChartCard({ title, subtitle, children, summary }) {
  return (
    <section className="card card-pad" aria-label={title}>
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      {summary && <p className="sr-only">{summary}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function NoData({ height = 220, text = 'No data yet' }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400" style={{ height }}>
      {text}
    </div>
  );
}

export function StatusDonut({ data = [] }) {
  const rows = data.filter((d) => d.count > 0).map((d) => ({ ...d, name: statusLabel(d.status) }));
  const total = rows.reduce((s, r) => s + r.count, 0);
  if (!total) return <NoData />;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-48 w-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie isAnimationActive={false} data={rows} dataKey="count" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={2} stroke="none">
              {rows.map((r) => (
                <Cell key={r.status} fill={STATUS_CHART_COLORS[r.status] ?? '#94a3b8'} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-1.5 text-sm">
        {rows.map((r) => (
          <li key={r.status} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-slate-600">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: STATUS_CHART_COLORS[r.status] }} aria-hidden="true" />
              {r.name}
            </span>
            <span className="font-medium tabular-nums text-slate-900">{r.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CategoryBars({ data = [] }) {
  if (!data.length) return <NoData />;
  const rows = data.slice(0, 8);
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, rows.length * 36 + 30)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={132} tick={AXIS} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9' }} />
        <Bar isAnimationActive={false} dataKey="count" name="Complaints" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const monthLabel = (m) => {
  const [y, mo] = m.split('-');
  return new Date(Date.UTC(+y, +mo - 1, 1)).toLocaleString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' });
};

export function TrendChart({ data = [] }) {
  if (!data.length || data.every((d) => !d.created && !d.resolved)) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ left: -12, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="month" tickFormatter={monthLabel} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} labelFormatter={monthLabel} />
        <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
        <Line isAnimationActive={false} type="monotone" dataKey="created" name="Submitted" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        <Line isAnimationActive={false} type="monotone" dataKey="resolved" name="Resolved" stroke="#059669" strokeWidth={2.5} strokeDasharray="6 3" dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DepartmentBars({ data = [] }) {
  if (!data.length) return <NoData text="No complaints have been assigned to a department yet" />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: -12, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} interval={0} tickFormatter={(v) => (v.length > 12 ? `${v.slice(0, 11)}…` : v)} />
        <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9' }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar isAnimationActive={false} dataKey="open" name="Open" fill="#4f46e5" radius={[4, 4, 0, 0]} />
        <Bar isAnimationActive={false} dataKey="resolved" name="Resolved" fill="#059669" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
