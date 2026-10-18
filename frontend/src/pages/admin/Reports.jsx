import { useState } from 'react';
import { Download } from 'lucide-react';
import PageHeader from '../../components/PageHeader.jsx';
import StatCard from '../../components/StatCard.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { StatCardsSkeleton, Skeleton } from '../../components/LoadingSkeleton.jsx';
import { ChartCard, CategoryBars, DepartmentBars, StatusDonut, TrendChart } from '../../components/charts/Charts.jsx';
import { RatingDisplay } from '../../components/Rating.jsx';
import { useQuery } from '../../hooks/useQuery.js';
import { api } from '../../lib/api.js';
import { formatHours } from '../../lib/format.js';

function csv(rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return rows.map((r) => r.map(esc).join(',')).join('\n');
}

export default function Reports() {
  const [range, setRange] = useState({ from: '', to: '' });
  const { data, loading, error, reload } = useQuery(() => api.get('/admin/reports', range), [range.from, range.to]);
  const d = data?.data;

  function exportCsv() {
    const rows = [
      ['Department', 'Total', 'Open', 'Resolved', 'Overdue', 'Avg resolution (h)', 'Within target (%)'],
      ...d.departments.map((x) => [x.name, x.total, x.open, x.resolved, x.overdue, x.avgResolutionHours ?? '', x.withinTargetPercent ?? '']),
    ];
    const url = URL.createObjectURL(new Blob([csv(rows)], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'campuscare-department-report.csv' });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title="Reports & analytics"
        subtitle="Calculated from the complaints database"
        actions={<button type="button" className="btn-secondary" onClick={exportCsv} disabled={!d?.departments.length}><Download size={16} aria-hidden="true" /> Export departments (CSV)</button>}
      />
      <div className="card card-pad mb-6 grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="from" className="label">From</label>
          <input id="from" type="date" className="input" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
        </div>
        <div>
          <label htmlFor="to" className="label">To</label>
          <input id="to" type="date" className="input" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        </div>
        <div className="flex items-end">
          <button type="button" className="btn-ghost" onClick={() => setRange({ from: '', to: '' })} disabled={!range.from && !range.to}>Clear dates</button>
        </div>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !d ? (
        <><StatCardsSkeleton /><Skeleton className="mt-6 h-72 w-full" /></>
      ) : (
        <div className={`space-y-6 ${loading ? 'opacity-60' : ''}`}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Complaints in range" value={d.totals.total} />
            <StatCard label="Avg. resolution time" value={formatHours(d.resolution.avgResolutionHours)} tone="slate" />
            <StatCard label="Resolved within target" value={d.resolution.withinTargetPercent === null ? '-' : `${d.resolution.withinTargetPercent}%`} tone="green" />
            <StatCard label="Overdue now" value={d.totals.overdue} tone={d.totals.overdue ? 'red' : 'slate'} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="By status"><StatusDonut data={d.byStatus} /></ChartCard>
            <ChartCard title="By category"><CategoryBars data={d.byCategory} /></ChartCard>
            <ChartCard title="Monthly trend"><TrendChart data={d.monthly} /></ChartCard>
            <ChartCard title="Department workload"><DepartmentBars data={d.departments} /></ChartCard>
          </div>

          <section className="card overflow-x-auto" aria-labelledby="dept-h">
            <h2 id="dept-h" className="px-5 pt-5 text-base font-semibold">Department performance</h2>
            <table className="mt-3 min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50"><tr>
                {['Department', 'Total', 'Open', 'Resolved', 'Overdue', 'Avg. resolution', 'Within target'].map((h) => <th key={h} scope="col" className="th">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {d.departments.length === 0 && <tr><td colSpan={7} className="td text-center text-slate-500">No complaints have been assigned to departments yet.</td></tr>}
                {d.departments.map((x) => (
                  <tr key={x.id}>
                    <td className="td font-medium">{x.name}</td>
                    <td className="td tabular-nums">{x.total}</td>
                    <td className="td tabular-nums">{x.open}</td>
                    <td className="td tabular-nums">{x.resolved}</td>
                    <td className={`td tabular-nums ${x.overdue ? 'font-semibold text-red-700' : ''}`}>{x.overdue}</td>
                    <td className="td">{formatHours(x.avgResolutionHours)}</td>
                    <td className="td">{x.withinTargetPercent === null ? '-' : `${x.withinTargetPercent}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card overflow-x-auto" aria-labelledby="staff-h">
              <h2 id="staff-h" className="px-5 pt-5 text-base font-semibold">Staff workload</h2>
              <table className="mt-3 min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50"><tr>{['Staff', 'Assigned', 'Open', 'Resolved', 'Overdue'].map((h) => <th key={h} scope="col" className="th">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {d.staff.length === 0 && <tr><td colSpan={5} className="td text-center text-slate-500">No staff assignments yet.</td></tr>}
                  {d.staff.map((s) => (
                    <tr key={s.id}><td className="td font-medium">{s.name}</td><td className="td tabular-nums">{s.assigned}</td><td className="td tabular-nums">{s.open}</td><td className="td tabular-nums">{s.resolved}</td><td className={`td tabular-nums ${s.overdue ? 'font-semibold text-red-700' : ''}`}>{s.overdue}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>
            <section className="card card-pad" aria-labelledby="rating-h">
              <h2 id="rating-h" className="text-base font-semibold">Student satisfaction</h2>
              {d.ratings.average === null ? (
                <p className="mt-3 text-sm text-slate-500">No feedback has been submitted for this period.</p>
              ) : (
                <div className="mt-4 flex items-center gap-4">
                  <p className="text-4xl font-semibold tabular-nums">{d.ratings.average}</p>
                  <div><RatingDisplay value={d.ratings.average} size={20} /><p className="mt-1 text-sm text-slate-500">{d.ratings.count} review{d.ratings.count === 1 ? '' : 's'}</p></div>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  );
}
