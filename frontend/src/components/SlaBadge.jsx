import { AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { formatDuration } from '../lib/format.js';

/** Time remaining / overdue / met / missed, computed by the server (complaint.sla). */
export default function SlaBadge({ sla, compact = false }) {
  if (!sla || sla.state === 'n/a') return <span className="text-xs text-slate-400">-</span>;
  const cfg = {
    on_track: { icon: Clock, cls: 'text-slate-600', text: `${formatDuration(sla.remainingMs)} left` },
    at_risk: { icon: AlertTriangle, cls: 'text-amber-700', text: `${formatDuration(sla.remainingMs)} left` },
    overdue: { icon: AlertTriangle, cls: 'text-red-700 font-semibold', text: `${formatDuration(sla.remainingMs)} overdue` },
    met: { icon: CheckCircle2, cls: 'text-emerald-700', text: 'Within target' },
    missed: { icon: XCircle, cls: 'text-red-700', text: 'Missed target' },
  }[sla.state];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${cfg.cls}`} title={compact ? cfg.text : undefined}>
      <Icon size={14} aria-hidden="true" />
      {cfg.text}
    </span>
  );
}
