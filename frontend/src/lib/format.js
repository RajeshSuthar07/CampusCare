const dtf = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const df = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' });

export const formatDateTime = (d) => (d ? dtf.format(new Date(d)) : '-');
export const formatDate = (d) => (d ? df.format(new Date(d)) : '-');

export function formatDuration(ms) {
  const abs = Math.abs(ms);
  const mins = Math.floor(abs / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  return `${Math.max(mins, 1)}m`;
}

export function formatHours(h) {
  if (h === null || h === undefined) return '-';
  if (h >= 48) return `${Math.round((h / 24) * 10) / 10} days`;
  return `${h} h`;
}

export const timeAgo = (d) => {
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60000) return 'just now';
  return `${formatDuration(diff)} ago`;
};

export const STATUS_META = {
  submitted: { label: 'Submitted', cls: 'bg-slate-100 text-slate-700 ring-slate-300', dot: 'bg-slate-500' },
  under_review: { label: 'Under Review', cls: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  assigned: { label: 'Assigned', cls: 'bg-sky-50 text-sky-800 ring-sky-200', dot: 'bg-sky-500' },
  in_progress: { label: 'In Progress', cls: 'bg-indigo-50 text-indigo-800 ring-indigo-200', dot: 'bg-indigo-500' },
  resolved: { label: 'Resolved', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200', dot: 'bg-emerald-500' },
  closed: { label: 'Closed', cls: 'bg-teal-50 text-teal-800 ring-teal-200', dot: 'bg-teal-600' },
  rejected: { label: 'Rejected', cls: 'bg-red-50 text-red-800 ring-red-200', dot: 'bg-red-500' },
  reopened: { label: 'Reopened', cls: 'bg-orange-50 text-orange-800 ring-orange-200', dot: 'bg-orange-500' },
  cancelled: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-500 ring-slate-200', dot: 'bg-slate-400' },
};

export const PRIORITY_META = {
  low: { label: 'Low', cls: 'bg-slate-100 text-slate-700 ring-slate-300', bars: 1 },
  medium: { label: 'Medium', cls: 'bg-blue-50 text-blue-800 ring-blue-200', bars: 2 },
  high: { label: 'High', cls: 'bg-orange-50 text-orange-800 ring-orange-200', bars: 3 },
  critical: { label: 'Critical', cls: 'bg-red-50 text-red-800 ring-red-200', bars: 4 },
};

export const statusLabel = (s) => STATUS_META[s]?.label ?? s;
export const priorityLabel = (p) => PRIORITY_META[p]?.label ?? p;

/** Hex colours for charts, aligned with the badge palette. */
export const STATUS_CHART_COLORS = {
  submitted: '#64748b',
  under_review: '#d97706',
  assigned: '#0284c7',
  in_progress: '#4f46e5',
  resolved: '#059669',
  closed: '#0d9488',
  rejected: '#dc2626',
  reopened: '#ea580c',
  cancelled: '#94a3b8',
};

export const ROLE_HOME = { student: '/student', staff: '/staff', admin: '/admin' };
