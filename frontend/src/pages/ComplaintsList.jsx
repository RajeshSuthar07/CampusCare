import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, SearchX, ClipboardList } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import FilterBar from '../components/FilterBar.jsx';
import ComplaintTable from '../components/ComplaintTable.jsx';
import Pagination from '../components/Pagination.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { TableSkeleton } from '../components/LoadingSkeleton.jsx';
import { useQuery } from '../hooks/useQuery.js';
import { useMeta } from '../context/MetaContext.jsx';
import { api } from '../lib/api.js';
import { STATUS_META, PRIORITY_META } from '../lib/format.js';

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'due', label: 'Target date (soonest)' },
  { value: 'updated', label: 'Recently updated' },
];

/** One list page for all three roles; `variant` decides which filters are offered. */
export default function ComplaintsList({ base, title, subtitle, variant, fixed = {} }) {
  const { categories, departments, staff } = useMeta();
  const [filters, setFilters] = useState({ page: 1, limit: 10, sort: 'newest' });

  const fields = useMemo(() => {
    const status = { key: 'status', label: 'Status', options: Object.entries(STATUS_META).map(([value, m]) => ({ value, label: m.label })) };
    const priority = { key: 'priority', label: 'Priority', options: Object.entries(PRIORITY_META).map(([value, m]) => ({ value, label: m.label })) };
    const category = { key: 'category', label: 'Category', options: categories.map((c) => ({ value: c._id, label: c.name })) };
    if (variant === 'admin') {
      return [
        status, priority, category,
        { key: 'department', label: 'Department', options: departments.map((d) => ({ value: d._id, label: d.name })) },
        { key: 'assignedTo', label: 'Assigned staff', options: [{ value: 'unassigned', label: 'Unassigned' }, ...staff.map((s) => ({ value: s._id, label: s.name }))] },
        { key: 'overdue', label: 'SLA', options: [{ value: 'true', label: 'Overdue only' }] },
        { key: 'from', label: 'From date', type: 'date' },
        { key: 'to', label: 'To date', type: 'date' },
      ];
    }
    if (variant === 'staff') return [status, priority, category, { key: 'overdue', label: 'SLA', options: [{ value: 'true', label: 'Overdue only' }] }];
    return [status, priority, category];
  }, [variant, categories, departments, staff]);

  const { data, loading, error, reload } = useQuery(() => api.get('/complaints', { ...filters, ...fixed }), [JSON.stringify(filters), JSON.stringify(fixed)]);
  const hasFilters = Object.entries(filters).some(([k, v]) => !['page', 'limit', 'sort'].includes(k) && v);

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <>
            <div>
              <label htmlFor="sort" className="sr-only">Sort by</label>
              <select id="sort" className="input" value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value, page: 1 })}>
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            {variant === 'student' && (
              <Link to="/student/new" className="btn-primary"><PlusCircle size={16} aria-hidden="true" /> New complaint</Link>
            )}
          </>
        }
      />
      <div className="space-y-4">
        <FilterBar filters={filters} onChange={setFilters} fields={fields} />
        {loading && !data ? (
          <TableSkeleton />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : data.data.length === 0 ? (
          hasFilters ? (
            <EmptyState icon={SearchX} title="No complaints match your filters" message="Try removing a filter or searching for something else." />
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="No complaints here yet"
              message={variant === 'student' ? 'When you report a problem it will show up here so you can track it.' : 'Nothing to show right now.'}
              action={variant === 'student' ? <Link to="/student/new" className="btn-primary">Submit your first complaint</Link> : null}
            />
          )
        ) : (
          <div className={loading ? 'opacity-60 transition-opacity' : ''}>
            <ComplaintTable complaints={data.data} base={base} showStudent={variant !== 'student'} showAssignee />
            <Pagination pagination={data.pagination} onPage={(page) => setFilters({ ...filters, page })} />
          </div>
        )}
      </div>
    </>
  );
}
