import { useEffect, useState } from 'react';
import { Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '../../components/PageHeader.jsx';
import PriorityBadge from '../../components/PriorityBadge.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { Skeleton } from '../../components/LoadingSkeleton.jsx';
import { useMeta } from '../../context/MetaContext.jsx';
import { useQuery } from '../../hooks/useQuery.js';
import { api } from '../../lib/api.js';

const ORDER = ['critical', 'high', 'medium', 'low'];

export default function SlaSettings() {
  const meta = useMeta();
  const { data, loading, error, reload } = useQuery(() => api.get('/admin/sla-settings'), []);
  const [values, setValues] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => { if (data) setValues(Object.fromEntries(ORDER.map((p) => [p, String(data.data[p])]))); }, [data]);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await api.patch('/admin/sla-settings', Object.fromEntries(ORDER.map((p) => [p, Number(values[p])])));
      toast.success('SLA targets updated');
      meta.reload();
      reload({ silent: true });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="SLA settings" subtitle="Target resolution time for each priority level" />
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !values ? (
        <Skeleton className="h-64 w-full max-w-xl" />
      ) : (
        <form onSubmit={save} className="card card-pad max-w-xl space-y-5">
          {formError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{formError}</div>}
          {ORDER.map((p) => (
            <div key={p} className="flex items-center justify-between gap-4">
              <label htmlFor={`sla-${p}`} className="flex items-center gap-2 text-sm font-medium"><PriorityBadge priority={p} /></label>
              <div className="flex items-center gap-2">
                <input id={`sla-${p}`} type="number" min="1" max="2880" className="input !w-28 text-right" value={values[p]} onChange={(e) => setValues({ ...values, [p]: e.target.value })} required />
                <span className="text-sm text-slate-500">hours</span>
              </div>
            </div>
          ))}
          <p className="flex gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            Targets must not increase with urgency (critical ≤ high ≤ medium ≤ low). Changes apply to complaints submitted from now on; existing target dates keep their value unless an admin edits them. A category's maximum resolution time can shorten a target further.
          </p>
          <button type="submit" className="btn-primary" disabled={saving || loading}>
            {saving && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} Save SLA targets
          </button>
        </form>
      )}
    </>
  );
}
