import { Star } from 'lucide-react';

export function RatingDisplay({ value, size = 16 }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} aria-hidden="true" />
      ))}
    </span>
  );
}

/** Accessible star picker (radio group). */
export function RatingInput({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Rating" className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
          className="rounded p-1 hover:bg-slate-100"
        >
          <Star size={28} className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
