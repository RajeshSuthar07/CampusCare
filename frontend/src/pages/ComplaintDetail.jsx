import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Calendar, Flag, Loader2, MapPin, Send, Tag, Timer, Trash2, User, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import StatusBadge from '../components/StatusBadge.jsx';
import PriorityBadge from '../components/PriorityBadge.jsx';
import SlaBadge from '../components/SlaBadge.jsx';
import Timeline from '../components/Timeline.jsx';
import ConfirmationModal from '../components/ConfirmationModal.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { DetailSkeleton } from '../components/LoadingSkeleton.jsx';
import { RatingDisplay, RatingInput } from '../components/Rating.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useMeta } from '../context/MetaContext.jsx';
import { useQuery } from '../hooks/useQuery.js';
import { api } from '../lib/api.js';
import { formatDateTime, statusLabel } from '../lib/format.js';

const ACTION_LABEL = {
  under_review: 'Start review',
  in_progress: 'Start work',
  resolved: 'Mark as resolved',
  closed: 'Close complaint',
  rejected: 'Reject complaint',
  cancelled: 'Cancel complaint',
};
const COMMENT_REQUIRED = ['resolved', 'rejected'];
const DANGER = ['rejected', 'cancelled'];

function Meta({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs text-slate-500">{label}</dt>
        <dd className="text-sm font-medium text-slate-900">{children}</dd>
      </div>
    </div>
  );
}

export default function ComplaintDetail({ base }) {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { departments, staff } = useMeta();
  const { data, loading, error, reload } = useQuery(() => api.get(`/complaints/${id}`), [id]);

  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null); // { type: 'status'|'reopen'|'delete', status? }
  const [text, setText] = useState('');
  const [comment, setComment] = useState('');
  const [assign, setAssign] = useState({ departmentId: '', staffId: '', comment: '' });
  const [adminEdit, setAdminEdit] = useState({ priority: '', targetHours: '' });
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState(0);
  const [ratingText, setRatingText] = useState('');

  const complaint = data?.data?.complaint;
  const actions = data?.data?.actions;

  useEffect(() => {
    if (!complaint) return;
    setAssign({ departmentId: complaint.assignedDepartment?._id ?? '', staffId: complaint.assignedTo?._id ?? '', comment: '' });
    setAdminEdit({ priority: complaint.priority, targetHours: '' });
    setNotes(complaint.resolutionNotes ?? '');
  }, [complaint]);

  if (loading && !data) return <DetailSkeleton />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { history, feedback } = data.data;
  const isStudent = user.role === 'student';
  const isAdmin = user.role === 'admin';

  async function run(fn, success) {
    setBusy(true);
    try {
      await fn();
      if (success) toast.success(success);
      setModal(null);
      setText('');
      await reload({ silent: true });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  const changeStatus = () => run(() => api.patch(`/complaints/${id}/status`, { status: modal.status, comment: text }), `Status changed to ${statusLabel(modal.status)}`);
  const reopen = () => run(() => api.post(`/complaints/${id}/reopen`, { reason: text }), 'Complaint reopened');
  const remove = () =>
    run(async () => {
      await api.delete(`/complaints/${id}`);
      navigate(`${base}/complaints`, { replace: true });
    }, 'Complaint deleted');
  const sendComment = () =>
    run(async () => {
      await api.post(`/complaints/${id}/comments`, { comment });
      setComment('');
    }, 'Comment added');
  const doAssign = () =>
    run(() => api.patch(`/complaints/${id}/assign`, { departmentId: assign.departmentId || undefined, staffId: assign.staffId || undefined, comment: assign.comment }), 'Complaint assigned');
  const saveAdminEdit = () => {
    const body = {};
    if (adminEdit.priority && adminEdit.priority !== complaint.priority) body.priority = adminEdit.priority;
    if (adminEdit.targetHours) body.targetHours = Number(adminEdit.targetHours);
    if (!Object.keys(body).length) return toast.info('Nothing to update');
    return run(() => api.patch(`/complaints/${id}`, body), 'Complaint updated');
  };
  const saveNotes = () => run(() => api.patch(`/complaints/${id}`, { resolutionNotes: notes }), 'Resolution notes saved');
  const sendFeedback = () => run(() => api.post(`/complaints/${id}/feedback`, { rating, comment: ratingText }), 'Thank you for your feedback');

  const staffOptions = staff.filter((s) => !assign.departmentId || String(s.department) === assign.departmentId);
  const canWorkflow = actions.nextStatuses.length > 0;
  const requireText = modal?.type === 'reopen' || (modal?.type === 'status' && COMMENT_REQUIRED.includes(modal.status));

  return (
    <>
      <Link to={`${base}${isStudent || isAdmin ? '/complaints' : '/assigned'}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-700">
        <ArrowLeft size={16} aria-hidden="true" /> Back to complaints
      </Link>

      <div className="mb-6">
        <p className="font-mono text-sm font-medium text-brand-700">{complaint.complaintNumber}</p>
        <h1 className="mt-1 text-xl font-semibold sm:text-2xl">{complaint.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={complaint.status} />
          <PriorityBadge priority={complaint.priority} />
          <SlaBadge sla={complaint.sla} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card card-pad" aria-labelledby="details-h">
            <h2 id="details-h" className="text-base font-semibold">Details</h2>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-700">{complaint.description}</p>
            {complaint.imageUrl && (
              <a href={complaint.imageUrl} target="_blank" rel="noreferrer" className="mt-4 block w-fit">
                <img src={complaint.imageUrl} alt="Attached by the student" className="max-h-64 rounded-lg border border-slate-200 object-cover" loading="lazy" />
              </a>
            )}
            <dl className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
              <Meta icon={Tag} label="Category">{complaint.category?.name}</Meta>
              <Meta icon={MapPin} label="Location">{complaint.location}</Meta>
              {!isStudent && <Meta icon={User} label="Submitted by">{complaint.createdBy?.name}{complaint.createdBy?.registrationNumber ? ` (${complaint.createdBy.registrationNumber})` : ''}</Meta>}
              <Meta icon={Building2} label="Department">{complaint.assignedDepartment?.name ?? 'Not assigned yet'}</Meta>
              <Meta icon={UserCheck} label="Assigned to">{complaint.assignedTo?.name ?? 'Not assigned yet'}</Meta>
              <Meta icon={Calendar} label="Submitted">{formatDateTime(complaint.createdAt)}</Meta>
              <Meta icon={Timer} label="Target resolution">{formatDateTime(complaint.targetResolutionAt)}</Meta>
              {complaint.resolvedAt && <Meta icon={Calendar} label="Resolved">{formatDateTime(complaint.resolvedAt)}</Meta>}
              {!isStudent && (
                <Meta icon={Flag} label="Suggested priority">
                  {complaint.suggestedPriority}
                  {complaint.priority !== complaint.suggestedPriority && <span className="ml-1 text-xs font-normal text-slate-500">(final: {complaint.priority}, set by {complaint.prioritySource})</span>}
                </Meta>
              )}
            </dl>
            {complaint.resolutionNotes && (
              <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{complaint.status === 'rejected' ? 'Reason' : 'Resolution notes'}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-900">{complaint.resolutionNotes}</p>
              </div>
            )}
          </section>

          {feedback.length > 0 && (
            <section className="card card-pad" aria-labelledby="fb-h">
              <h2 id="fb-h" className="text-base font-semibold">Feedback</h2>
              <ul className="mt-3 space-y-3">
                {feedback.map((f) => (
                  <li key={f._id} className="rounded-lg bg-slate-50 p-3">
                    <RatingDisplay value={f.rating} />
                    {f.comment && <p className="mt-1 text-sm text-slate-700">{f.comment}</p>}
                    <p className="mt-1 text-xs text-slate-400">{formatDateTime(f.createdAt)}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card card-pad" aria-labelledby="timeline-h">
            <h2 id="timeline-h" className="mb-5 text-base font-semibold">Timeline</h2>
            <Timeline entries={history} />
            {actions.canComment && (
              <form
                className="mt-6 border-t border-slate-100 pt-5"
                onSubmit={(e) => { e.preventDefault(); if (comment.trim()) sendComment(); }}
              >
                <label htmlFor="comment" className="label">Add a comment</label>
                <textarea id="comment" rows={3} className="input" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} placeholder="Share an update or ask a question" />
                <div className="mt-2 flex justify-end">
                  <button type="submit" className="btn-primary btn-sm" disabled={busy || !comment.trim()}>
                    <Send size={14} aria-hidden="true" /> Post comment
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>

        <aside className="space-y-6" aria-label="Actions">
          {(canWorkflow || actions.canReopen) && (
            <section className="card card-pad" aria-labelledby="act-h">
              <h2 id="act-h" className="text-base font-semibold">Actions</h2>
              <div className="mt-3 flex flex-col gap-2">
                {actions.nextStatuses.map((s) => (
                  <button key={s} type="button" className={DANGER.includes(s) ? 'btn-secondary !border-red-200 !text-red-700 hover:!bg-red-50' : 'btn-primary'} onClick={() => { setText(''); setModal({ type: 'status', status: s }); }}>
                    {ACTION_LABEL[s] ?? statusLabel(s)}
                  </button>
                ))}
                {actions.canReopen && (
                  <button type="button" className="btn-secondary" onClick={() => { setText(''); setModal({ type: 'reopen' }); }}>Reopen complaint</button>
                )}
              </div>
              {actions.canReopen && <p className="mt-2 text-xs text-slate-500">Not fixed? You can reopen within 7 days of resolution.</p>}
            </section>
          )}

          {actions.canRate && (
            <section className="card card-pad" aria-labelledby="rate-h">
              <h2 id="rate-h" className="text-base font-semibold">Rate the resolution</h2>
              <div className="mt-3"><RatingInput value={rating} onChange={setRating} /></div>
              <label htmlFor="rating-text" className="label mt-3">Comment (optional)</label>
              <textarea id="rating-text" rows={3} className="input" value={ratingText} onChange={(e) => setRatingText(e.target.value)} maxLength={1000} />
              <button type="button" className="btn-primary mt-3 w-full" disabled={busy || !rating} onClick={sendFeedback}>Submit feedback</button>
            </section>
          )}

          {actions.canAssign && (
            <section className="card card-pad" aria-labelledby="assign-h">
              <h2 id="assign-h" className="text-base font-semibold">Assign</h2>
              <div className="mt-3 space-y-3">
                <div>
                  <label htmlFor="dept" className="label">Department</label>
                  <select id="dept" className="input" value={assign.departmentId} onChange={(e) => setAssign({ ...assign, departmentId: e.target.value, staffId: '' })}>
                    <option value="">Select department</option>
                    {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="staff" className="label">Staff member</label>
                  <select id="staff" className="input" value={assign.staffId} onChange={(e) => setAssign({ ...assign, staffId: e.target.value })}>
                    <option value="">Any in department</option>
                    {staffOptions.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="assign-note" className="label">Note (optional)</label>
                  <textarea id="assign-note" rows={2} className="input" value={assign.comment} onChange={(e) => setAssign({ ...assign, comment: e.target.value })} />
                </div>
                <button type="button" className="btn-primary w-full" disabled={busy || (!assign.departmentId && !assign.staffId)} onClick={doAssign}>
                  {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} Assign complaint
                </button>
              </div>
            </section>
          )}

          {actions.canEditPriority && (
            <section className="card card-pad" aria-labelledby="prio-h">
              <h2 id="prio-h" className="text-base font-semibold">Priority & target time</h2>
              <p className="mt-1 text-xs text-slate-500">Rules suggested <strong>{complaint.suggestedPriority}</strong>. Your choice becomes the final priority.</p>
              <div className="mt-3 space-y-3">
                <div>
                  <label htmlFor="prio" className="label">Final priority</label>
                  <select id="prio" className="input" value={adminEdit.priority} onChange={(e) => setAdminEdit({ ...adminEdit, priority: e.target.value })}>
                    {['low', 'medium', 'high', 'critical'].map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="hours" className="label">Custom target (hours from submission)</label>
                  <input id="hours" type="number" min="1" className="input" placeholder="Leave empty to use the SLA" value={adminEdit.targetHours} onChange={(e) => setAdminEdit({ ...adminEdit, targetHours: e.target.value })} />
                </div>
                <button type="button" className="btn-secondary w-full" disabled={busy} onClick={saveAdminEdit}>Save changes</button>
              </div>
            </section>
          )}

          {actions.canEditNotes && !['submitted'].includes(complaint.status) && (
            <section className="card card-pad" aria-labelledby="notes-h">
              <h2 id="notes-h" className="text-base font-semibold">Resolution notes</h2>
              <textarea id="notes" aria-label="Resolution notes" rows={4} className="input mt-3" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
              <button type="button" className="btn-secondary mt-3 w-full" disabled={busy || notes === (complaint.resolutionNotes ?? '')} onClick={saveNotes}>Save notes</button>
            </section>
          )}

          {actions.canDelete && (
            <button type="button" className="btn-secondary w-full !border-red-200 !text-red-700 hover:!bg-red-50" onClick={() => setModal({ type: 'delete' })}>
              <Trash2 size={16} aria-hidden="true" /> Delete complaint
            </button>
          )}
        </aside>
      </div>

      <ConfirmationModal
        open={modal?.type === 'status'}
        title={modal?.status ? ACTION_LABEL[modal.status] : ''}
        message={modal?.status === 'resolved' ? 'Describe what was done. The student will see this as the resolution.' : modal?.status === 'rejected' ? 'Explain why this complaint is being rejected. The student will see this.' : modal?.status === 'cancelled' ? 'This will withdraw your complaint. This cannot be undone.' : 'Add an optional comment for the timeline.'}
        confirmLabel={modal?.status ? ACTION_LABEL[modal.status] : 'Confirm'}
        tone={DANGER.includes(modal?.status) ? 'danger' : 'primary'}
        busy={busy}
        confirmDisabled={requireText && !text.trim()}
        onConfirm={changeStatus}
        onCancel={() => setModal(null)}
      >
        <label htmlFor="modal-text" className="label">{requireText ? 'Comment (required)' : 'Comment (optional)'}</label>
        <textarea id="modal-text" rows={3} className="input" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
      </ConfirmationModal>

      <ConfirmationModal
        open={modal?.type === 'reopen'}
        title="Reopen this complaint"
        message="Tell us what is still wrong so the team can fix it properly."
        confirmLabel="Reopen"
        busy={busy}
        confirmDisabled={text.trim().length < 5}
        onConfirm={reopen}
        onCancel={() => setModal(null)}
      >
        <label htmlFor="reopen-text" className="label">Reason (required)</label>
        <textarea id="reopen-text" rows={3} className="input" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
      </ConfirmationModal>

      <ConfirmationModal
        open={modal?.type === 'delete'}
        title="Delete this complaint?"
        message="The complaint, its timeline and notifications will be permanently removed."
        confirmLabel="Delete"
        tone="danger"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setModal(null)}
      />
    </>
  );
}
