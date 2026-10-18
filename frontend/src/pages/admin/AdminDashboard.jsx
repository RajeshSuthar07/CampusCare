import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ClipboardList, Hourglass, Star, Target, Timer, Users } from 'lucide-react';
import PageHeader from '../../components/PageHeader.jsx';
import StatCard from '../../components/StatCard.jsx';
import ComplaintTable from '../../components/ComplaintTable.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { StatCardsSkeleton, Skeleton } from '../../components/LoadingSkeleton.jsx';
import { ChartCard, CategoryBars, DepartmentBars, StatusDonut, TrendChart } from '../../components/charts/Charts.jsx';
import { useQuery } from '../../hooks/useQuery.js';
import { api } from '../../lib/api.js';
import { formatHours } from '../../lib/format.js';

export default function AdminDashboard() {
  const { data, loading, error, reload } = useQuery(() => api.get('/admin/dashboard'), []);
  const d = data?.data;

  return (
    <>
      <PageHeader title="Admin dashboard" subtitle="Live overview of complaints across the campus" actions={<Link to="/admin/reports" className="btn-secondary">Full reports</Link>} />
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !d ? (
        <><StatCardsSkeleton count={8} /><Skeleton className="mt-6 h-72 w-full" /></>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total complaints" value={d.totals.total} icon={ClipboardList} />
            <StatCard label="Open" value={d.totals.open} icon={Hourglass} tone="amber" />
            <StatCard label="Resolved / closed" value={d.totals.resolved} icon={CheckCircle2} tone="green" />
            <StatCard label="Overdue" value={d.totals.overdue} icon={AlertTriangle} tone={d.totals.overdue ? 'red' : 'slate'} hint="Open past target time" />
            <StatCard label="Avg. resolution time" value={formatHours(d.resolution.avgResolutionHours)} icon={Timer} tone="slate" />
            <StatCard label="Resolved within target" value={d.resolution.withinTargetPercent === null ? '-' : `${d.resolution.withinTargetPercent}%`} icon={Target} tone="green" hint={`${d.resolution.withinTargetCount} of ${d.resolution.resolvedCount}`} />
            <StatCard label="Average rating" value={d.ratings.average === null ? '-' : `${d.ratings.average} / 5`} icon={Star} tone="amber" hint={`${d.ratings.count} review${d.ratings.count === 1 ? '' : 's'}`} />
            <StatCard label="Active users" value={(d.users.student ?? 0) + (d.users.staff ?? 0) + (d.users.admin ?? 0)} icon={Users} hint={`${d.users.student ?? 0} students · ${d.users.staff ?? 0} staff`} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Complaints by status" summary={d.byStatus.map((s) => `${s.status}: ${s.count}`).join(', ')}><StatusDonut data={d.byStatus} /></ChartCard>
            <ChartCard title="Complaints by category"><CategoryBars data={d.byCategory} /></ChartCard>
            <ChartCard title="Monthly trend" subtitle="Submitted vs. resolved, last 6 months"><TrendChart data={d.monthly} /></ChartCard>
            <ChartCard title="Department workload" subtitle="Open and resolved complaints per department"><DepartmentBars data={d.departments} /></ChartCard>
          </div>

          {d.overdueList.length > 0 && (
            <section aria-labelledby="overdue-h">
              <h2 id="overdue-h" className="mb-3 flex items-center gap-2 text-base font-semibold text-red-800"><AlertTriangle size={18} aria-hidden="true" /> Most overdue</h2>
              <ComplaintTable complaints={d.overdueList} base="/admin" showStudent />
            </section>
          )}

          <section aria-labelledby="recent-h">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="recent-h" className="text-base font-semibold">Latest complaints</h2>
              <Link to="/admin/complaints" className="text-sm font-medium text-brand-700 hover:underline">View all</Link>
            </div>
            {d.recent.length ? <ComplaintTable complaints={d.recent} base="/admin" showStudent /> : <p className="text-sm text-slate-500">No complaints yet.</p>}
          </section>
        </div>
      )}
    </>
  );
}
