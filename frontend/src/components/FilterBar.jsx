import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useDebounced } from '../hooks/useQuery.js';

/**
 * Generic filter bar. `filters` is the current values object; `fields` describes controls:
 *   { key, label, type: 'select'|'date', options: [{value,label}] }
 * The search box is debounced and sent to the server (server-side search).
 */
export default function FilterBar({ filters, onChange, fields = [], searchPlaceholder = 'Search by title, number or location' }) {
  const [text, setText] = useState(filters.search ?? '');
  const [showFilters, setShowFilters] = useState(false);
  const debounced = useDebounced(text);

  useEffect(() => {
    if (debounced !== (filters.search ?? '')) onChange({ ...filters, search: debounced, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const hasActive = Object.entries(filters).some(([k, v]) => !['page', 'limit', 'sort'].includes(k) && v);
  const set = (key, value) => onChange({ ...filters, [key]: value, page: 1 });

  return (
    <div className="card card-pad">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
        <div className="relative flex-1">
          <label htmlFor="filter-search" className="sr-only">Search</label>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            id="filter-search"
            type="search"
            className="input pl-9"
            placeholder={searchPlaceholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        {fields.length > 0 && (
          <button type="button" className="btn-secondary sm:hidden" aria-expanded={showFilters} aria-controls="filter-fields" onClick={() => setShowFilters((v) => !v)}>
            <SlidersHorizontal size={16} aria-hidden="true" /> Filters
          </button>
        )}
        </div>
        {fields.map((f) => (
          <div key={f.key} id={f.key === fields[0].key ? 'filter-fields' : undefined} className={showFilters ? '' : 'hidden sm:block'}>
            <label htmlFor={`filter-${f.key}`} className="mb-1 block text-xs font-medium text-slate-500">{f.label}</label>
            {f.type === 'date' ? (
              <input id={`filter-${f.key}`} type="date" className="input" value={filters[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />
            ) : (
              <select id={`filter-${f.key}`} className="input" value={filters[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}>
                <option value="">All</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>
      {hasActive && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => {
              setText('');
              onChange({ page: 1, limit: filters.limit, sort: filters.sort });
            }}
          >
            <X size={14} aria-hidden="true" /> Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
