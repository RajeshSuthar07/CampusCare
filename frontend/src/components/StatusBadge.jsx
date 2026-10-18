import { STATUS_META } from '../lib/format.js';

export default function StatusBadge({ status }) {
  const m = STATUS_META[status] ?? { label: status, cls: 'bg-slate-100 text-slate-700 ring-slate-300', dot: 'bg-slate-500' };
  return (
    <span className={`badge ${m.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} aria-hidden="true" />
      {m.label}
    </span>
  );
}
