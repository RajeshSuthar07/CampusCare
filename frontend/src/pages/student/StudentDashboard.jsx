import { Link } from 'react-router-dom';
import { CheckCircle2, ClipboardList, Hourglass, PlusCircle, Timer } from 'lucide-react';
import PageHeader from '../../components/PageHeader.jsx';
import StatCard from '../../components/StatCard.jsx';
import ComplaintCard from '../../components/ComplaintCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { StatCardsSkeleton, Skeleton } from '../../components/LoadingSkeleton.jsx';
import { ChartCard, StatusDonut } from '../../components/charts/Charts.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useQuery } from '../../hooks/useQuery.js';
import { api } from '../../lib/api.js';
import { formatHours } from '../../lib/format.js';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useQuery(() => api.get('/dashboard'), []);
  const d = data?.data;

  return (
    <>
      <PageHeader
        title={`Hello, ${user.name.split(' ')[0]}`}
        subtitle="Here is where your complaints stand"
        actions={<Link to="/student/new" className="btn-primary"><PlusCircle size={16} aria-hidden="true" /> New complaint</Link>}
      />
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !d ? (
        <><StatCardsSkeleton /><Skeleton className="mt-6 h-64 w-full" /></>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total complaints" value={d.totals.total} icon={ClipboardList} />
            <StatCard label="Open" value={d.totals.open} icon={Hourglass} tone="amber" hint="Being worked on" />
            <StatCard label="Resolved" value={d.totals.resolved} icon={CheckCircle2} tone="green" />
            <StatCard label="Avg. time to resolve" value={formatHours(d.resolution.avgResolutionHours)} icon={Timer} tone="slate" />
          </div>
          {d.totals.total === 0 ? (
            <EmptyState title="You haven't submitted any complaints" message="Spotted a problem on campus? Report it and follow every step until it is fixed." action={<Link to="/student/new" className="btn-primary">Submit a complaint</Link>} />
          ) : (
            <div className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <ChartCard title="Complaints by status" summary={d.byStatus.map((s) => `${s.status}: ${s.count}`).join(', ')}>
                  <StatusDonut data={d.byStatus} />
                </ChartCard>
              </div>
              <section className="lg:col-span-3" aria-labelledby="recent-h">
                <div className="mb-3 flex items-center justify-between">
                  <h2 id="recent-h" className="text-base font-semibold">Recent activity</h2>
                  <Link to="/student/complaints" className="text-sm font-medium text-brand-700 hover:underline">View all</Link>
                </div>
                <div className="grid gap-3">{d.recent.map((c) => <ComplaintCard key={c._id} complaint={c} base="/student" />)}</div>
              </section>
            </div>
          )}
        </div>
      )}
    </>
  );
}
