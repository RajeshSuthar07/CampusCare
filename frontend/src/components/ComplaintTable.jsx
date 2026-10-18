import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge.jsx';
import PriorityBadge from './PriorityBadge.jsx';
import SlaBadge from './SlaBadge.jsx';
import ComplaintCard from './ComplaintCard.jsx';
import { formatDate } from '../lib/format.js';

/** Table on md+ screens, stacked cards on phones. */
export default function ComplaintTable({ complaints, base, showStudent = false, showAssignee = true }) {
  return (
    <>
      <div className="grid gap-3 md:hidden">
        {complaints.map((c) => (
          <ComplaintCard key={c._id} complaint={c} base={base} showStudent={showStudent} />
        ))}
      </div>
      <div className="card hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-200">
          <caption className="sr-only">Complaints</caption>
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="th">Reference</th>
              <th scope="col" className="th">Complaint</th>
              <th scope="col" className="th">Status</th>
              <th scope="col" className="th">Priority</th>
              <th scope="col" className="th">Target</th>
              {showStudent && <th scope="col" className="th">Student</th>}
              {showAssignee && <th scope="col" className="th">Assigned to</th>}
              <th scope="col" className="th">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {complaints.map((c) => (
              <tr key={c._id} className="hover:bg-slate-50">
                <td className="td whitespace-nowrap font-mono text-xs font-medium text-brand-700">
                  <Link to={`${base}/complaints/${c._id}`} className="hover:underline">{c.complaintNumber}</Link>
                </td>
                <td className="td min-w-56 max-w-sm">
                  <Link to={`${base}/complaints/${c._id}`} className="line-clamp-2 font-medium text-slate-900 hover:text-brand-700">{c.title}</Link>
                  <p className="line-clamp-1 text-xs text-slate-500">{c.category?.name} · {c.location}</p>
                </td>
                <td className="td"><StatusBadge status={c.status} /></td>
                <td className="td"><PriorityBadge priority={c.priority} /></td>
                <td className="td whitespace-nowrap"><SlaBadge sla={c.sla} /></td>
                {showStudent && <td className="td whitespace-nowrap text-slate-600">{c.createdBy?.name ?? '-'}</td>}
                {showAssignee && (
                  <td className="td whitespace-nowrap text-slate-600">
                    {c.assignedTo?.name ?? c.assignedDepartment?.name ?? <span className="text-slate-400">Unassigned</span>}
                  </td>
                )}
                <td className="td whitespace-nowrap text-slate-500">{formatDate(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
