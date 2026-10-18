import { useState } from 'react';
import { Pencil, Power, UserPlus, Users as UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '../../components/PageHeader.jsx';
import FilterBar from '../../components/FilterBar.jsx';
import Pagination from '../../components/Pagination.jsx';
import ConfirmationModal from '../../components/ConfirmationModal.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { TableSkeleton } from '../../components/LoadingSkeleton.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useMeta } from '../../context/MetaContext.jsx';
import { useQuery } from '../../hooks/useQuery.js';
import { api } from '../../lib/api.js';
import { formatDate } from '../../lib/format.js';

const ROLE_CLS = {
  admin: 'bg-brand-50 text-brand-800 ring-brand-200',
  staff: 'bg-sky-50 text-sky-800 ring-sky-200',
  student: 'bg-slate-100 text-slate-700 ring-slate-300',
};

export default function Users() {
  const { user: me } = useAuth();
  const meta = useMeta();
  const [filters, setFilters] = useState({ page: 1, limit: 10 });
  const { data, loading, error, reload } = useQuery(() => api.get('/admin/users', filters), [JSON.stringify(filters)]);
  const [modal, setModal] = useState(null); // {mode:'create'|'edit'|'toggle', user?, values?}
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const set = (k, v) => setModal((m) => ({ ...m, values: { ...m.values, [k]: v } }));

  function openCreate() {
    setFormError('');
    setModal({ mode: 'create', values: { name: '', email: '', password: '', role: 'staff', departmentId: '' } });
  }
  function openEdit(u) {
    setFormError('');
    setModal({ mode: 'edit', user: u, values: { name: u.name, role: u.role, departmentId: u.department?._id ?? '' } });
  }

  async function submit() {
    setBusy(true);
    setFormError('');
    try {
      if (modal.mode === 'create') {
        const v = modal.values;
        await api.post('/admin/users', { ...v, departmentId: v.role === 'staff' ? v.departmentId : undefined });
        toast.success('Account created');
      } else if (modal.mode === 'edit') {
        const v = modal.values;
        await api.patch(`/admin/users/${modal.user._id}`, { name: v.name, role: v.role, departmentId: v.role === 'staff' ? v.departmentId : null });
        toast.success('User updated');
      } else {
        await api.patch(`/admin/users/${modal.user._id}`, { isActive: !modal.user.isActive });
        toast.success(modal.user.isActive ? 'Account disabled' : 'Account enabled');
      }
      setModal(null);
      reload({ silent: true });
      meta.reload();
    } catch (e) {
      if (modal.mode === 'toggle') { toast.error(e.message); setModal(null); } else setFormError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const fields = [
    { key: 'role', label: 'Role', options: [{ value: 'student', label: 'Student' }, { value: 'staff', label: 'Staff' }, { value: 'admin', label: 'Admin' }] },
    { key: 'active', label: 'Account', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Disabled' }] },
    { key: 'department', label: 'Department', options: meta.departments.map((d) => ({ value: d._id, label: d.name })) },
  ];
  const v = modal?.values;

  return (
    <>
      <PageHeader title="User management" subtitle="Students, staff and administrators" actions={<button type="button" className="btn-primary" onClick={openCreate}><UserPlus size={16} aria-hidden="true" /> Add staff / admin</button>} />
      <div className="space-y-4">
        <FilterBar filters={filters} onChange={setFilters} fields={fields} searchPlaceholder="Search by name, email or enrollment number" />
        {loading && !data ? (
          <TableSkeleton />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : data.data.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No users found" message="Try changing the filters." />
        ) : (
          <>
            <div className="card overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <caption className="sr-only">Users</caption>
                <thead className="bg-slate-50"><tr>{['Name', 'Role', 'Department / enrollment', 'Joined', 'Status'].map((h) => <th key={h} scope="col" className="th">{h}</th>)}<th scope="col" className="th"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.data.map((u) => (
                    <tr key={u._id} className={u.isActive ? '' : 'bg-slate-50 text-slate-400'}>
                      <td className="td"><p className="font-medium text-slate-900">{u.name}</p><p className="text-xs text-slate-500">{u.email}</p></td>
                      <td className="td"><span className={`badge capitalize ${ROLE_CLS[u.role]}`}>{u.role}</span></td>
                      <td className="td">{u.department?.name ?? u.registrationNumber ?? '-'}</td>
                      <td className="td whitespace-nowrap">{formatDate(u.createdAt)}</td>
                      <td className="td"><span className={`badge ${u.isActive ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-300'}`}>{u.isActive ? 'Active' : 'Disabled'}</span></td>
                      <td className="td whitespace-nowrap text-right">
                        <button type="button" className="btn-ghost btn-sm" onClick={() => openEdit(u)} disabled={u._id === me._id} aria-label={`Edit ${u.name}`}><Pencil size={14} aria-hidden="true" /> Edit</button>
                        <button type="button" className="btn-ghost btn-sm" onClick={() => setModal({ mode: 'toggle', user: u })} disabled={u._id === me._id} aria-label={`${u.isActive ? 'Disable' : 'Enable'} ${u.name}`}><Power size={14} aria-hidden="true" /> {u.isActive ? 'Disable' : 'Enable'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={data.pagination} onPage={(page) => setFilters({ ...filters, page })} />
          </>
        )}
      </div>

      <ConfirmationModal
        open={modal?.mode === 'create' || modal?.mode === 'edit'}
        title={modal?.mode === 'create' ? 'Add staff or admin account' : `Edit ${modal?.user?.name ?? ''}`}
        confirmLabel={modal?.mode === 'create' ? 'Create account' : 'Save changes'}
        busy={busy}
        onConfirm={submit}
        onCancel={() => setModal(null)}
      >
        {v && (
          <div className="space-y-4">
            {formError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{formError}</div>}
            <div><label htmlFor="u-name" className="label">Full name</label><input id="u-name" className="input" value={v.name} onChange={(e) => set('name', e.target.value)} required /></div>
            {modal.mode === 'create' && (
              <>
                <div><label htmlFor="u-email" className="label">Email</label><input id="u-email" type="email" className="input" value={v.email} onChange={(e) => set('email', e.target.value)} required /></div>
                <div><label htmlFor="u-pw" className="label">Temporary password</label><input id="u-pw" type="password" autoComplete="new-password" className="input" value={v.password} onChange={(e) => set('password', e.target.value)} required /><p className="mt-1 text-xs text-slate-500">At least 8 characters with a letter and a number. Share it securely; the user can change it in Profile.</p></div>
              </>
            )}
            <div>
              <label htmlFor="u-role" className="label">Role</label>
              <select id="u-role" className="input" value={v.role} onChange={(e) => set('role', e.target.value)}>
                {modal.mode === 'edit' && <option value="student">Student</option>}
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {v.role === 'staff' && (
              <div>
                <label htmlFor="u-dept" className="label">Department</label>
                <select id="u-dept" className="input" value={v.departmentId} onChange={(e) => set('departmentId', e.target.value)} required>
                  <option value="">Select department</option>
                  {meta.departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
              </div>
            )}
          </div>
        )}
      </ConfirmationModal>

      <ConfirmationModal
        open={modal?.mode === 'toggle'}
        title={`${modal?.user?.isActive ? 'Disable' : 'Enable'} ${modal?.user?.name ?? ''}?`}
        message={modal?.user?.isActive ? 'They will be signed out on their next request and will not be able to log in until the account is enabled again.' : 'They will be able to log in again.'}
        confirmLabel={modal?.user?.isActive ? 'Disable account' : 'Enable account'}
        tone={modal?.user?.isActive ? 'danger' : 'primary'}
        busy={busy}
        onConfirm={submit}
        onCancel={() => setModal(null)}
      />
    </>
  );
}
