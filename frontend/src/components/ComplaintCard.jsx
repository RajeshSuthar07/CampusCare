import { Link } from 'react-router-dom';
import { MapPin, User } from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';
import PriorityBadge from './PriorityBadge.jsx';
import SlaBadge from './SlaBadge.jsx';
import { formatDate } from '../lib/format.js';

/** Compact card used on small screens and in dashboard "recent" lists. */
export default function ComplaintCard({ complaint: c, base, showStudent = false }) {
  return (
    <Link to={`${base}/complaints/${c._id}`} className="card card-pad block transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-xs font-medium text-brand-700">{c.complaintNumber}</span>
        <StatusBadge status={c.status} />
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900">{c.title}</h3>
      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
        <MapPin size={12} aria-hidden="true" /> {c.location} · {c.category?.name}
      </p>
      {showStudent && c.createdBy?.name && (
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
          <User size={12} aria-hidden="true" /> {c.createdBy.name}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PriorityBadge priority={c.priority} />
          <SlaBadge sla={c.sla} />
        </div>
        <span className="text-xs text-slate-400">{formatDate(c.createdAt)}</span>
      </div>
    </Link>
  );
}
