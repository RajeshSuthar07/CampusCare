import { CheckCircle2, Circle, MessageSquare, PlusCircle, RefreshCcw, Star, UserCheck, Flag, XCircle, Pencil } from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';
import { formatDateTime } from '../lib/format.js';

const ICONS = {
  created: { icon: PlusCircle, cls: 'bg-brand-50 text-brand-700' },
  assigned: { icon: UserCheck, cls: 'bg-sky-50 text-sky-700' },
  comment: { icon: MessageSquare, cls: 'bg-slate-100 text-slate-600' },
  reopened: { icon: RefreshCcw, cls: 'bg-orange-50 text-orange-700' },
  feedback: { icon: Star, cls: 'bg-amber-50 text-amber-600' },
  priority_changed: { icon: Flag, cls: 'bg-orange-50 text-orange-700' },
  updated: { icon: Pencil, cls: 'bg-slate-100 text-slate-600' },
};

function iconFor(entry) {
  if (entry.action === 'status_changed') {
    if (entry.newStatus === 'resolved' || entry.newStatus === 'closed') return { icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700' };
    if (entry.newStatus === 'rejected' || entry.newStatus === 'cancelled') return { icon: XCircle, cls: 'bg-red-50 text-red-700' };
    return { icon: Circle, cls: 'bg-indigo-50 text-indigo-700' };
  }
  return ICONS[entry.action] ?? ICONS.updated;
}

const LABELS = {
  created: 'Complaint submitted',
  assigned: 'Assignment',
  comment: 'Comment',
  reopened: 'Complaint reopened',
  feedback: 'Feedback',
  priority_changed: 'Priority changed',
  updated: 'Details updated',
  status_changed: 'Status changed',
};

export default function Timeline({ entries }) {
  if (!entries?.length) return <p className="text-sm text-slate-500">No activity yet.</p>;
  return (
    <ol className="relative space-y-6">
      {entries.map((e, i) => {
        const { icon: Icon, cls } = iconFor(e);
        return (
          <li key={e._id} className="relative flex gap-3">
            {i < entries.length - 1 && <span className="absolute left-4 top-9 -ml-px h-[calc(100%-1rem)] w-px bg-slate-200" aria-hidden="true" />}
            <span className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cls}`}>
              <Icon size={16} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-sm font-medium text-slate-900">{LABELS[e.action] ?? e.action}</p>
                {e.action === 'status_changed' && e.previousStatus && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                    <StatusBadge status={e.previousStatus} /> → <StatusBadge status={e.newStatus} />
                  </span>
                )}
                {e.action === 'assigned' && e.newStatus && e.previousStatus !== e.newStatus && <StatusBadge status={e.newStatus} />}
              </div>
              {e.comment && e.action !== 'created' && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600">{e.comment}</p>}
              <p className="mt-1 text-xs text-slate-500">
                {e.actor?.name ?? 'Unknown'}
                {e.actor?.role ? ` (${e.actor.role})` : ''} · <time dateTime={e.createdAt}>{formatDateTime(e.createdAt)}</time>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
