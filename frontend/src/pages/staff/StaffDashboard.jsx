import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ClipboardList, Hammer, Inbox } from 'lucide-react';
import PageHeader from '../../components/PageHeader.jsx';
import StatCard from '../../components/StatCard.jsx';
import ComplaintCard from '../../components/ComplaintCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { StatCardsSkeleton, Skeleton } from '../../components/LoadingSkeleton.jsx';
import { ChartCard, CategoryBars, StatusDonut } from '../../components/charts/Charts.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useQuery } from '../../hooks/useQuery.js';
import { api } from '../../lib/api.js';

export default function StaffDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useQuery(() => api.get('/dashboard'), []);
  const d = data?.data;

  return (
    <>
      <PageHeader
        title={`Hello, ${user.name.split(' ')[0]}`}
        subtitle={user.department?.name ? `${user.department.name} department` : 'Your assigned work'}
        actions={<Link to="/staff/assigned" className="btn-primary"><Inbox size={16} aria-hidden="true" /> Assigned complaints</Link>}
      />
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !d ? (
        <><StatCardsSkeleton /><Skeleton className="mt-6 h-64 w-full" /></>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Assigned to me" value={d.staff.assigned} icon={ClipboardList} />
            <StatCard label="Waiting to start" value={d.staff.pending} icon={Inbox} tone="amber" hint="Assigned or reopened" />
            <StatCard label="In progress" value={d.staff.inProgress} icon={Hammer} />
            <StatCard label="Completed" value={d.staff.completed} icon={CheckCircle2} tone="green" />
          </div>
          {(d.totals.overdue > 0 || d.staff.unclaimedInDepartment > 0) && (
            <div className="flex flex-wrap gap-3">
              {d.totals.overdue > 0 && (
                <Link to="/staff/assigned" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-800">
                  <AlertTriangle size={16} aria-hidden="true" /> {d.totals.overdue} overdue complaint{d.totals.overdue > 1 ? 's' : ''}
                </Link>
              )}
              {d.staff.unclaimedInDepartment > 0 && (
                <Link to="/staff/assigned" className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-800">
                  <Inbox size={16} aria-hidden="true" /> {d.staff.unclaimedInDepartment} open in your department waiting to be picked up
                </Link>
              )}
            </div>
          )}
          {d.totals.total === 0 ? (
            <EmptyState title="Nothing assigned yet" message="Complaints assigned to you or your department will appear here." />
          ) : (
            <>
              <div className="grid gap-6 lg:grid-cols-2">
                <ChartCard title="By status"><StatusDonut data={d.byStatus} /></ChartCard>
                <ChartCard title="By category"><CategoryBars data={d.byCategory} /></ChartCard>
              </div>
              <section aria-labelledby="recent-h">
                <h2 id="recent-h" className="mb-3 text-base font-semibold">Recently updated</h2>
                <div className="grid gap-3 md:grid-cols-2">{d.recent.map((c) => <ComplaintCard key={c._id} complaint={c} base="/staff" showStudent />)}</div>
              </section>
            </>
          )}
        </div>
      )}
    </>
  );
}
