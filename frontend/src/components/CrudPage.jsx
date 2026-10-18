import { useState } from 'react';
import { Pencil, Plus, Power } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from './PageHeader.jsx';
import ConfirmationModal from './ConfirmationModal.jsx';
import EmptyState from './EmptyState.jsx';
import ErrorState from './ErrorState.jsx';
import { TableSkeleton } from './LoadingSkeleton.jsx';
import { useQuery } from '../hooks/useQuery.js';
import { useMeta } from '../context/MetaContext.jsx';
import { api } from '../lib/api.js';

/** Shared create / edit / enable-disable page for departments and categories. */
export default function CrudPage({ title, subtitle, noun, endpoint, fields, columns, icon }) {
  const meta = useMeta();
  const { data, loading, error, reload } = useQuery(() => api.get(endpoint), [endpoint]);
  const [editing, setEditing] = useState(null); // { id?, values }
  const [toggling, setToggling] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const blank = Object.fromEntries(fields.map((f) => [f.key, f.default ?? '']));
  const open = (row) => {
    setFormError('');
    setEditing(row ? { id: row._id, values: Object.fromEntries(fields.map((f) => [f.key, row[f.key] ?? ''])) } : { values: blank });
  };

  async function save() {
    setBusy(true);
    setFormError('');
    try {
      const body = Object.fromEntries(fields.map((f) => [f.key, f.type === 'number' ? Number(editing.values[f.key]) : editing.values[f.key]]));
      if (editing.id) await api.patch(`${endpoint}/${editing.id}`, body);
      else await api.post(endpoint, body);
      toast.success(`${noun} ${editing.id ? 'updated' : 'created'}`);
      setEditing(null);
      reload({ silent: true });
      meta.reload();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle() {
    setBusy(true);
    try {
      await api.patch(`${endpoint}/${toggling._id}`, { isActive: !toggling.isActive });
      toast.success(`${noun} ${toggling.isActive ? 'disabled' : 'enabled'}`);
      setToggling(null);
      reload({ silent: true });
      meta.reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  const rows = data?.data ?? [];
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} actions={<button type="button" className="btn-primary" onClick={() => open(null)}><Plus size={16} aria-hidden="true" /> Add {noun.toLowerCase()}</button>} />
      {loading && !data ? (
        <TableSkeleton rows={5} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : rows.length === 0 ? (
        <EmptyState icon={icon} title={`No ${noun.toLowerCase()}s yet`} action={<button type="button" className="btn-primary" onClick={() => open(null)}>Add {noun.toLowerCase()}</button>} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <caption className="sr-only">{title}</caption>
            <thead className="bg-slate-50">
              <tr>
                {columns.map((c) => <th key={c.label} scope="col" className="th">{c.label}</th>)}
                <th scope="col" className="th">Status</th>
                <th scope="col" className="th"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r._id} className={r.isActive ? '' : 'bg-slate-50 text-slate-400'}>
                  {columns.map((c) => <td key={c.label} className="td">{c.render(r)}</td>)}
                  <td className="td">
                    <span className={`badge ${r.isActive ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-300'}`}>{r.isActive ? 'Active' : 'Disabled'}</span>
                  </td>
                  <td className="td whitespace-nowrap text-right">
                    <button type="button" className="btn-ghost btn-sm" onClick={() => open(r)} aria-label={`Edit ${r.name}`}><Pencil size={14} aria-hidden="true" /> Edit</button>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => setToggling(r)} aria-label={`${r.isActive ? 'Disable' : 'Enable'} ${r.name}`}><Power size={14} aria-hidden="true" /> {r.isActive ? 'Disable' : 'Enable'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmationModal
        open={!!editing}
        title={editing?.id ? `Edit ${noun.toLowerCase()}` : `Add ${noun.toLowerCase()}`}
        confirmLabel="Save"
        busy={busy}
        onConfirm={save}
        onCancel={() => setEditing(null)}
      >
        <div className="space-y-4">
          {formError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{formError}</div>}
          {fields.map((f) => (
            <div key={f.key}>
              <label htmlFor={`crud-${f.key}`} className="label">{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea id={`crud-${f.key}`} rows={3} className="input" value={editing?.values[f.key] ?? ''} onChange={(e) => setEditing({ ...editing, values: { ...editing.values, [f.key]: e.target.value } })} />
              ) : (
                <input id={`crud-${f.key}`} type={f.type ?? 'text'} min={f.min} className="input" required={f.required} value={editing?.values[f.key] ?? ''} onChange={(e) => setEditing({ ...editing, values: { ...editing.values, [f.key]: e.target.value } })} />
              )}
              {f.hint && <p className="mt-1 text-xs text-slate-500">{f.hint}</p>}
            </div>
          ))}
        </div>
      </ConfirmationModal>

      <ConfirmationModal
        open={!!toggling}
        title={`${toggling?.isActive ? 'Disable' : 'Enable'} "${toggling?.name}"?`}
        message={toggling?.isActive ? `It will no longer be available for new complaints or assignments. Existing complaints are not affected.` : 'It will become available again.'}
        confirmLabel={toggling?.isActive ? 'Disable' : 'Enable'}
        tone={toggling?.isActive ? 'danger' : 'primary'}
        busy={busy}
        onConfirm={toggle}
        onCancel={() => setToggling(null)}
      />
    </>
  );
}
