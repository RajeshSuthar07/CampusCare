import { Complaint } from '../models/Complaint.js';
import { ComplaintHistory } from '../models/ComplaintHistory.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { nextSequence } from '../models/Counter.js';
import { ApiError } from '../utils/ApiError.js';
import { STATUS_LABELS } from '../utils/workflow.js';
import { getSlaInfo } from '../utils/sla.js';

/** CC-2026-0001 style reference. The counter is incremented atomically, so it is unique under concurrency. */
export async function generateComplaintNumber(date = new Date()) {
  const year = date.getUTCFullYear();
  const seq = await nextSequence(`complaint-${year}`);
  return `CC-${year}-${String(seq).padStart(4, '0')}`;
}

export function recordHistory({ complaint, actor, action, previousStatus = null, newStatus = null, comment = '' }) {
  return ComplaintHistory.create({
    complaint: complaint._id ?? complaint,
    actor: actor._id ?? actor,
    action,
    previousStatus,
    newStatus,
    comment,
  });
}

/** Create one notification per distinct recipient, never notifying the person who acted. */
export async function notifyUsers(recipientIds, { actorId, complaint, title, message }) {
  const unique = [
    ...new Set(
      recipientIds
        .filter(Boolean)
        .map(String)
        .filter((id) => id !== String(actorId ?? ''))
    ),
  ];
  if (!unique.length) return;
  await Notification.insertMany(
    unique.map((recipient) => ({
      recipient,
      complaint: complaint?._id ?? complaint ?? null,
      title: title.slice(0, 120),
      message: message.slice(0, 400),
    }))
  );
}

export async function getActiveAdminIds() {
  const admins = await User.find({ role: 'admin', isActive: true }).select('_id').lean();
  return admins.map((a) => a._id);
}

/** Mongo filter limiting which complaints a user may see. */
export function scopeFilterFor(user) {
  if (user.role === 'admin') return {};
  if (user.role === 'student') return { createdBy: user._id };
  // staff: complaints assigned to them, or routed to their department
  const or = [{ assignedTo: user._id }];
  if (user.department) or.push({ assignedDepartment: user.department });
  return { $or: or };
}

const idEq = (a, b) => a && b && String(a._id ?? a) === String(b._id ?? b);

export function canViewComplaint(user, complaint) {
  if (user.role === 'admin') return true;
  if (user.role === 'student') return idEq(complaint.createdBy, user._id);
  if (user.role === 'staff') {
    if (idEq(complaint.assignedTo, user._id)) return true;
    return Boolean(user.department && idEq(complaint.assignedDepartment, user.department));
  }
  return false;
}

/** Staff may update when the complaint is theirs, or it is routed to their department and not yet claimed. */
export function staffCanAct(user, complaint) {
  if (user.role !== 'staff') return false;
  if (idEq(complaint.assignedTo, user._id)) return true;
  return Boolean(
    !complaint.assignedTo && user.department && idEq(complaint.assignedDepartment, user.department)
  );
}

export const COMPLAINT_POPULATE = [
  { path: 'category', select: 'name defaultResolutionHours' },
  { path: 'createdBy', select: 'name email registrationNumber' },
  { path: 'assignedDepartment', select: 'name' },
  { path: 'assignedTo', select: 'name email' },
];

export async function loadComplaint(id, user, { populate = false } = {}) {
  let query = Complaint.findById(id);
  if (populate) query = query.populate(COMPLAINT_POPULATE);
  const complaint = await query;
  if (!complaint) throw ApiError.notFound('Complaint not found');
  if (!canViewComplaint(user, complaint)) {
    throw ApiError.forbidden('You do not have access to this complaint');
  }
  return complaint;
}

export function withSla(complaintDoc, now = new Date()) {
  const obj = typeof complaintDoc.toObject === 'function' ? complaintDoc.toObject() : { ...complaintDoc };
  obj.sla = getSlaInfo(obj, now);
  return obj;
}

export function statusNotice(complaint, newStatus, comment) {
  const label = STATUS_LABELS[newStatus] ?? newStatus;
  return {
    title: `${complaint.complaintNumber}: ${label}`,
    message: comment
      ? `Status changed to ${label}. ${comment}`
      : `Your complaint "${complaint.title}" is now ${label}.`,
  };
}
