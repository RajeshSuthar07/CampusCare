import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareOff } from 'lucide-react';
import PageHeader from '../../components/PageHeader.jsx';
import Pagination from '../../components/Pagination.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { TableSkeleton } from '../../components/LoadingSkeleton.jsx';
import { RatingDisplay } from '../../components/Rating.jsx';
import StatCard from '../../components/StatCard.jsx';
import { useQuery } from '../../hooks/useQuery.js';
import { api } from '../../lib/api.js';
import { formatDate } from '../../lib/format.js';

export default function FeedbackPage() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useQuery(() => api.get('/admin/feedback', { page, limit: 10 }), [page]);
  const s = data?.summary;
  const max = s ? Math.max(1, ...s.distribution.map((d) => d.count)) : 1;

  return (
    <>
      <PageHeader title="Student feedback" subtitle="Ratings and comments after complaints are resolved" />
      {loading && !data ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Average rating" value={s.average === null ? '-' : `${s.average} / 5`} tone="amber" />
            <StatCard label="Total reviews" value={s.count} />
            <section className="card card-pad" aria-label="Rating distribution">
              <ul className="space-y-1.5">
                {[...s.distribution].reverse().map((d) => (
                  <li key={d.rating} className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="w-8 tabular-nums">{d.rating} ★</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-amber-400" style={{ width: `${(d.count / max) * 100}%` }} /></span>
                    <span className="w-6 text-right tabular-nums">{d.count}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {data.data.length === 0 ? (
            <EmptyState icon={MessageSquareOff} title="No feedback yet" message="Reviews appear here after students rate a resolved complaint." />
          ) : (
            <>
              <ul className="space-y-3">
                {data.data.map((f) => (
                  <li key={f._id} className="card card-pad">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <RatingDisplay value={f.rating} />
                        <Link to={`/admin/complaints/${f.complaint?._id}`} className="font-mono text-xs font-medium text-brand-700 hover:underline">{f.complaint?.complaintNumber}</Link>
                      </div>
                      <span className="text-xs text-slate-400">{formatDate(f.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-900">{f.complaint?.title}</p>
                    {f.comment && <p className="mt-1 text-sm text-slate-600">{f.comment}</p>}
                    <p className="mt-2 text-xs text-slate-500">
                      By {f.student?.name ?? 'Unknown'} · Handled by {f.complaint?.assignedTo?.name ?? f.complaint?.assignedDepartment?.name ?? 'unassigned'}
                    </p>
                  </li>
                ))}
              </ul>
              <Pagination pagination={data.pagination} onPage={setPage} />
            </>
          )}
        </div>
      )}
    </>
  );
}
