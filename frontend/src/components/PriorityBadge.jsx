import { PRIORITY_META } from '../lib/format.js';

/** Priority is shown with a label AND a 4-step signal icon, so colour is never the only cue. */
export default function PriorityBadge({ priority }) {
  const m = PRIORITY_META[priority] ?? PRIORITY_META.low;
  return (
    <span className={`badge ${m.cls}`}>
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="currentColor">
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={i * 3} y={9 - i * 3} width="2" height={3 + i * 3} rx="0.5" opacity={i < m.bars ? 1 : 0.25} />
        ))}
      </svg>
      {m.label}
    </span>
  );
}
