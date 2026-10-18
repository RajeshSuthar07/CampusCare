import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellOff, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '../components/PageHeader.jsx';
import Pagination from '../components/Pagination.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { TableSkeleton } from '../components/LoadingSkeleton.jsx';
import { useQuery } from '../hooks/useQuery.js';
import { api } from '../lib/api.js';
import { formatDateTime } from '../lib/format.js';

export default function Notifications({ base }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useQuery(() => api.get('/notifications', { page, limit: 15 }), [page]);

  async function open(n) {
    if (!n.isRead) await api.patch(`/notifications/${n._id}/read`).catch(() => {});
    if (n.complaint?._id) navigate(`${base}/complaints/${n.complaint._id}`);
    else reload({ silent: true });
  }

  async function markAll() {
    try {
      await api.patch('/notifications/read-all');
      toast.success('All notifications marked as read');
      reload({ silent: true });
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={data ? `${data.unreadCount} unread` : undefined}
        actions={<button type="button" className="btn-secondary" onClick={markAll} disabled={!data?.unreadCount}><CheckCheck size={16} aria-hidden="true" /> Mark all as read</button>}
      />
      {loading && !data ? (
        <TableSkeleton rows={5} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data.data.length === 0 ? (
        <EmptyState icon={BellOff} title="No notifications yet" message="You will be notified here when something happens to a complaint." />
      ) : (
        <>
          <ul className="card divide-y divide-slate-100 overflow-hidden">
            {data.data.map((n) => (
              <li key={n._id}>
                <button type="button" onClick={() => open(n)} className={`flex w-full items-start gap-3 px-4 py-4 text-left hover:bg-slate-50 ${n.isRead ? '' : 'bg-brand-50/50'}`}>
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.isRead ? 'bg-transparent' : 'bg-brand-600'}`} aria-label={n.isRead ? undefined : 'Unread'} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900">{n.title}</span>
                    <span className="mt-0.5 block text-sm text-slate-600">{n.message}</span>
                    <span className="mt-1 block text-xs text-slate-400">{formatDateTime(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Pagination pagination={data.pagination} onPage={setPage} />
        </>
      )}
    </>
  );
}
