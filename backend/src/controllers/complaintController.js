import mongoose from 'mongoose';
import { Complaint } from '../models/Complaint.js';
import { ComplaintHistory } from '../models/ComplaintHistory.js';
import { Notification } from '../models/Notification.js';
import { Feedback } from '../models/Feedback.js';
import { Category } from '../models/Category.js';
import { Department } from '../models/Department.js';
import { User } from '../models/User.js';
import { getSlaHours } from '../models/Setting.js';
import { ApiError } from '../utils/ApiError.js';
import { ok, created, paginated, escapeRegex } from '../utils/http.js';
import {
  DUPLICATE_WINDOW_DAYS,
  OPEN_STATUSES,
  REOPEN_WINDOW_DAYS,
} from '../utils/constants.js';
import { suggestPriority, resolveInitialPriority } from '../utils/priority.js';
import { computeTargetDate, computeTargetHours } from '../utils/sla.js';
import { COMMENT_REQUIRED, STATUS_LABELS, allowedNextStatuses, canTransition } from '../utils/workflow.js';
import {
  COMPLAINT_POPULATE,
  canViewComplaint,
  generateComplaintNumber,
  getActiveAdminIds,
  loadComplaint,
  notifyUsers,
  recordHistory,
  scopeFilterFor,
  staffCanAct,
  statusNotice,
  withSla,
} from '../services/complaintService.js';

const DAY = 24 * 3600 * 1000;
const sameId = (a, b) => a && b && String(a._id ?? a) === String(b._id ?? b);

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

export function reopenEligibility(complaint, now = new Date()) {
  if (!['resolved', 'closed'].includes(complaint.status)) return false;
  const ref = complaint.status === 'closed' ? complaint.closedAt ?? complaint.resolvedAt : complaint.resolvedAt;
  if (!ref) return false;
  return now - new Date(ref) <= REOPEN_WINDOW_DAYS * DAY;
}

async function hasCurrentFeedback(complaint) {
  return Boolean(await Feedback.exists({ complaint: complaint._id, cycle: complaint.reopenCount }));
}

async function computeActions(user, complaint, now = new Date()) {
  const isOwner = user.role === 'student' && sameId(complaint.createdBy, user._id);
  let next = allowedNextStatuses(user.role, complaint.status);
  if (user.role === 'staff' && !staffCanAct(user, complaint)) next = [];
  if (user.role === 'student' && !isOwner) next = [];

  const rated = isOwner ? await hasCurrentFeedback(complaint) : true;
  return {
    nextStatuses: next,
    canAssign:
      user.role === 'admin' &&
      ['submitted', 'under_review', 'assigned', 'in_progress', 'reopened'].includes(complaint.status),
    canEditPriority: user.role === 'admin' && OPEN_STATUSES.includes(complaint.status),
    canEditDetails: isOwner && complaint.status === 'submitted',
    canEditNotes: (user.role === 'admin' || staffCanAct(user, complaint)) && complaint.status !== 'cancelled',
    canComment: !['cancelled'].includes(complaint.status),
    canReopen: isOwner && reopenEligibility(complaint, now),
    canRate: isOwner && ['resolved', 'closed'].includes(complaint.status) && !rated,
    canCancel: next.includes('cancelled'),
    canDelete:
      (user.role === 'admin' && ['rejected', 'cancelled'].includes(complaint.status)) ||
      (isOwner && complaint.status === 'cancelled'),
  };
}

/* ------------------------------------------------------------------ */
/* create + pre-check                                                  */
/* ------------------------------------------------------------------ */

/** Priority suggestion + possible duplicates, shown to the student BEFORE they submit. */
export async function precheck(req, res) {
  const { category: categoryId, location, title = '', description = '' } = req.valid.query;
  const category = await Category.findOne({ _id: categoryId, isActive: true }).lean();
  if (!category) throw ApiError.badRequest('Invalid category');

  const suggestion = suggestPriority({ categoryName: category.name, title, description });

  const since = new Date(Date.now() - DUPLICATE_WINDOW_DAYS * DAY);
  const matches = await Complaint.find({
    category: category._id,
    location: new RegExp(`^\\s*${escapeRegex(location.trim())}\\s*$`, 'i'),
    status: { $in: OPEN_STATUSES },
    createdAt: { $gte: since },
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('complaintNumber title status createdAt createdBy')
    .lean();

  // Only the owner can open a complaint; for others we reveal that a similar one exists, nothing more.
  const duplicates = matches.map((m) => {
    const mine = sameId(m.createdBy, req.user._id);
    return {
      id: mine ? m._id : null,
      complaintNumber: m.complaintNumber,
      status: m.status,
      createdAt: m.createdAt,
      title: mine ? m.title : null,
      canView: mine,
    };
  });

  return ok(res, { suggestedPriority: suggestion.priority, reasons: suggestion.reasons, duplicates });
}

export async function createComplaint(req, res) {
  const { title, description, category: categoryId, location, priority } = req.valid.body;

  const category = await Category.findOne({ _id: categoryId, isActive: true });
  if (!category) throw ApiError.badRequest('Invalid or inactive category');

  const now = new Date();
  const suggestion = suggestPriority({ categoryName: category.name, title, description });
  const { priority: finalPriority, source } = resolveInitialPriority({
    studentChoice: priority,
    suggested: suggestion.priority,
  });
  const slaHours = await getSlaHours();
  const targetHours = computeTargetHours(finalPriority, slaHours, category.defaultResolutionHours);

  const doc = {
    title,
    description,
    category: category._id,
    location,
    imageUrl: req.imageUrl ?? null,
    createdBy: req.user._id,
    priority: finalPriority,
    suggestedPriority: suggestion.priority,
    prioritySource: source,
    status: 'submitted',
    targetResolutionAt: computeTargetDate(now, targetHours),
  };

  // The unique index on complaintNumber is the final guard against duplicates;
  // if two requests ever collide, take a fresh number and try again.
  let complaint;
  for (let attempt = 0; !complaint; attempt++) {
    try {
      complaint = await Complaint.create({ ...doc, complaintNumber: await generateComplaintNumber(now) });
    } catch (err) {
      if (err?.code !== 11000 || attempt >= 5) throw err;
    }
  }

  await recordHistory({ complaint, actor: req.user, action: 'created', newStatus: 'submitted', comment: 'Complaint submitted' });
  await notifyUsers(await getActiveAdminIds(), {
    actorId: req.user._id,
    complaint,
    title: `New complaint ${complaint.complaintNumber}`,
    message: `${req.user.name} reported "${title}" (${category.name}, ${finalPriority} priority).`,
  });

  await complaint.populate(COMPLAINT_POPULATE);
  return created(res, { complaint: withSla(complaint), suggestion }, 'Complaint submitted');
}

/* ------------------------------------------------------------------ */
/* list + detail                                                       */
/* ------------------------------------------------------------------ */

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  due: { targetResolutionAt: 1, _id: 1 },
  updated: { updatedAt: -1, _id: -1 },
};

export async function listComplaints(req, res) {
  const q = req.valid.query;
  const user = req.user;
  const now = new Date();

  // Authorization scope first; user filters can only narrow it further.
  const and = [scopeFilterFor(user)];

  if (q.status) and.push({ status: q.status });
  if (q.scope === 'open') and.push({ status: { $in: OPEN_STATUSES } });
  if (q.scope === 'done') and.push({ status: { $in: ['resolved', 'closed'] } });
  if (q.priority) and.push({ priority: q.priority });
  if (q.category) and.push({ category: new mongoose.Types.ObjectId(q.category) });
  if (q.department && user.role === 'admin') and.push({ assignedDepartment: new mongoose.Types.ObjectId(q.department) });

  if (q.assignedTo && user.role !== 'student') {
    if (q.assignedTo === 'me') and.push({ assignedTo: user._id });
    else if (q.assignedTo === 'unassigned') and.push({ assignedTo: null });
    else if (user.role === 'admin') and.push({ assignedTo: new mongoose.Types.ObjectId(q.assignedTo) });
  }

  if (q.from || q.to) {
    const range = {};
    if (q.from) range.$gte = new Date(q.from);
    if (q.to) {
      const end = new Date(q.to);
      // a plain date means "through the end of that day"
      if (/^\d{4}-\d{2}-\d{2}$/.test(q.to)) end.setUTCHours(23, 59, 59, 999);
      range.$lte = end;
    }
    and.push({ createdAt: range });
  }
  if (q.overdue === 'true') and.push({ status: { $in: OPEN_STATUSES }, targetResolutionAt: { $lt: now } });

  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    and.push({ $or: [{ title: rx }, { description: rx }, { complaintNumber: rx }, { location: rx }] });
  }

  const filter = { $and: and };
  const [total, rows] = await Promise.all([
    Complaint.countDocuments(filter),
    Complaint.find(filter)
      .sort(SORTS[q.sort ?? 'newest'])
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate(COMPLAINT_POPULATE)
      .lean(),
  ]);

  return paginated(res, rows.map((r) => withSla(r, now)), { page: q.page, limit: q.limit, total });
}

export async function getComplaint(req, res) {
  const complaint = await loadComplaint(req.params.id, req.user, { populate: true });
  const now = new Date();

  const [history, feedback, actions] = await Promise.all([
    ComplaintHistory.find({ complaint: complaint._id })
      .sort({ createdAt: 1, _id: 1 })
      .populate('actor', 'name role')
      .lean(),
    Feedback.find({ complaint: complaint._id }).sort({ createdAt: 1 }).lean(),
    computeActions(req.user, complaint, now),
  ]);

  return ok(res, { complaint: withSla(complaint, now), history, feedback, actions });
}

/* ------------------------------------------------------------------ */
/* update (details / priority override / notes)                        */
/* ------------------------------------------------------------------ */

export async function updateComplaint(req, res) {
  const complaint = await loadComplaint(req.params.id, req.user);
  const body = req.valid.body;
  const user = req.user;
  const changes = [];

  if (user.role === 'student') {
    if (!sameId(complaint.createdBy, user._id)) throw ApiError.forbidden();
    if (complaint.status !== 'submitted') {
      throw ApiError.badRequest('You can only edit a complaint before it goes under review');
    }
    const forbidden = ['priority', 'targetHours', 'resolutionNotes'].filter((k) => body[k] !== undefined);
    if (forbidden.length) throw ApiError.forbidden('You cannot change those fields');
    for (const k of ['title', 'description', 'location']) {
      if (body[k] !== undefined && body[k] !== complaint[k]) {
        complaint[k] = body[k];
        changes.push(k);
      }
    }
  } else if (user.role === 'staff') {
    if (!staffCanAct(user, complaint)) throw ApiError.forbidden('This complaint is outside your assignment');
    const forbidden = ['title', 'description', 'location', 'priority', 'targetHours'].filter((k) => body[k] !== undefined);
    if (forbidden.length) throw ApiError.forbidden('Staff can only update resolution notes');
    if (body.resolutionNotes !== undefined) {
      complaint.resolutionNotes = body.resolutionNotes;
      changes.push('resolution notes');
    }
  } else {
    // admin
    if (body.priority !== undefined && body.priority !== complaint.priority) {
      if (!OPEN_STATUSES.includes(complaint.status)) {
        throw ApiError.badRequest('Priority can only be changed while the complaint is open');
      }
      const previous = complaint.priority;
      complaint.priority = body.priority;
      complaint.prioritySource = 'admin';
      changes.push(`priority ${previous} → ${body.priority}`);
      if (body.targetHours === undefined) {
        // re-derive the SLA target from the new priority, counted from creation
        const [slaHours, cat] = await Promise.all([getSlaHours(), Category.findById(complaint.category).lean()]);
        const hours = computeTargetHours(body.priority, slaHours, cat?.defaultResolutionHours);
        complaint.targetResolutionAt = computeTargetDate(complaint.createdAt, hours);
      }
    }
    if (body.targetHours !== undefined) {
      if (!OPEN_STATUSES.includes(complaint.status)) {
        throw ApiError.badRequest('Target time can only be changed while the complaint is open');
      }
      complaint.targetResolutionAt = computeTargetDate(complaint.createdAt, body.targetHours);
      changes.push(`target resolution set to ${body.targetHours}h from creation`);
    }
    for (const k of ['title', 'description', 'location', 'resolutionNotes']) {
      if (body[k] !== undefined && body[k] !== complaint[k]) {
        complaint[k] = body[k];
        changes.push(k === 'resolutionNotes' ? 'resolution notes' : k);
      }
    }
  }

  if (!changes.length) return ok(res, { complaint: withSla(await complaint.populate(COMPLAINT_POPULATE)) }, 'No changes');

  await complaint.save();
  const priorityChanged = changes.some((c) => c.startsWith('priority'));
  await recordHistory({
    complaint,
    actor: user,
    action: priorityChanged ? 'priority_changed' : 'updated',
    comment: `Updated: ${changes.join('; ')}`,
  });

  if (user.role !== 'student') {
    await notifyUsers([complaint.createdBy, complaint.assignedTo], {
      actorId: user._id,
      complaint,
      title: `${complaint.complaintNumber} updated`,
      message: `Updated: ${changes.join('; ')}`,
    });
  }

  await complaint.populate(COMPLAINT_POPULATE);
  return ok(res, { complaint: withSla(complaint) }, 'Complaint updated');
}

/* ------------------------------------------------------------------ */
/* status transitions                                                  */
/* ------------------------------------------------------------------ */

export async function changeStatus(req, res) {
  const { status: next, comment } = req.valid.body;
  const user = req.user;
  const complaint = await loadComplaint(req.params.id, user);
  const prev = complaint.status;

  if (next === 'assigned') throw ApiError.badRequest('Use the assign action to assign a complaint');
  if (next === 'reopened') throw ApiError.badRequest('Use the reopen action to reopen a complaint');

  if (user.role === 'student' && !sameId(complaint.createdBy, user._id)) throw ApiError.forbidden();
  if (user.role === 'staff' && !staffCanAct(user, complaint)) {
    throw ApiError.forbidden('This complaint is outside your assignment');
  }
  if (!canTransition(user.role, prev, next)) {
    throw ApiError.badRequest(
      `A ${user.role} cannot move a complaint from "${STATUS_LABELS[prev]}" to "${STATUS_LABELS[next]}"`
    );
  }
  if (COMMENT_REQUIRED.includes(next) && !comment) {
    throw ApiError.badRequest(`A comment is required when marking a complaint ${STATUS_LABELS[next].toLowerCase()}`);
  }

  const now = new Date();
  complaint.status = next;

  // staff taking over an unclaimed department complaint becomes its owner
  if (user.role === 'staff' && !complaint.assignedTo) {
    complaint.assignedTo = user._id;
    if (!complaint.assignedDepartment && user.department) complaint.assignedDepartment = user.department;
  }
  if (next === 'resolved') {
    complaint.resolvedAt = now;
    complaint.resolutionNotes = comment;
  }
  if (next === 'closed') {
    complaint.closedAt = now;
    complaint.resolvedAt ??= now;
  }
  if (next === 'rejected') complaint.resolutionNotes = comment;

  await complaint.save();
  await recordHistory({ complaint, actor: user, action: 'status_changed', previousStatus: prev, newStatus: next, comment });

  const notice = statusNotice(complaint, next, comment);
  const adminIds = ['resolved', 'cancelled'].includes(next) ? await getActiveAdminIds() : [];
  await notifyUsers(
    [complaint.createdBy, ...(user.role === 'student' ? [complaint.assignedTo] : []), ...adminIds],
    { actorId: user._id, complaint, ...notice }
  );

  await complaint.populate(COMPLAINT_POPULATE);
  return ok(res, { complaint: withSla(complaint, now) }, `Status changed to ${STATUS_LABELS[next]}`);
}

/* ------------------------------------------------------------------ */
/* assignment                                                          */
/* ------------------------------------------------------------------ */

export async function assignComplaint(req, res) {
  const { departmentId, staffId, comment } = req.valid.body;
  const complaint = await loadComplaint(req.params.id, req.user);

  if (!['submitted', 'under_review', 'assigned', 'in_progress', 'reopened'].includes(complaint.status)) {
    throw ApiError.badRequest(`A complaint that is ${STATUS_LABELS[complaint.status].toLowerCase()} cannot be assigned`);
  }

  let department = null;
  let staff = null;
  if (departmentId) {
    department = await Department.findOne({ _id: departmentId, isActive: true });
    if (!department) throw ApiError.badRequest('Department not found or inactive');
  }
  if (staffId) {
    staff = await User.findOne({ _id: staffId, role: 'staff', isActive: true });
    if (!staff) throw ApiError.badRequest('Staff member not found or inactive');
    if (department && staff.department && !sameId(staff.department, department._id)) {
      throw ApiError.badRequest('That staff member does not belong to the selected department');
    }
    if (!department && staff.department) {
      department = await Department.findById(staff.department);
    }
  }

  const prev = complaint.status;
  if (department) complaint.assignedDepartment = department._id;
  if (staff) complaint.assignedTo = staff._id;
  else if (departmentId && complaint.assignedTo) {
    // re-routing to another department clears a staff member from the old one
    const current = await User.findById(complaint.assignedTo).select('department');
    if (!sameId(current?.department, department._id)) complaint.assignedTo = null;
  }
  if (['submitted', 'under_review'].includes(prev)) complaint.status = 'assigned';
  await complaint.save();

  const target = [department && `department ${department.name}`, staff && `staff ${staff.name}`]
    .filter(Boolean)
    .join(' / ');
  await recordHistory({
    complaint,
    actor: req.user,
    action: 'assigned',
    previousStatus: prev,
    newStatus: complaint.status,
    comment: `Assigned to ${target}${comment ? `. ${comment}` : ''}`,
  });

  await notifyUsers([staff?._id], {
    actorId: req.user._id,
    complaint,
    title: `Assigned: ${complaint.complaintNumber}`,
    message: `"${complaint.title}" has been assigned to you${comment ? `: ${comment}` : '.'}`,
  });
  if (department && !staff) {
    const deptStaff = await User.find({ role: 'staff', isActive: true, department: department._id }).select('_id').lean();
    await notifyUsers(deptStaff.map((s) => s._id), {
      actorId: req.user._id,
      complaint,
      title: `New for ${department.name}: ${complaint.complaintNumber}`,
      message: `"${complaint.title}" was routed to your department.`,
    });
  }
  await notifyUsers([complaint.createdBy], {
    actorId: req.user._id,
    complaint,
    title: `${complaint.complaintNumber}: assigned`,
    message: `Your complaint has been assigned to ${target}.`,
  });

  await complaint.populate(COMPLAINT_POPULATE);
  return ok(res, { complaint: withSla(complaint) }, 'Complaint assigned');
}

/* ------------------------------------------------------------------ */
/* comments, reopen, feedback, delete                                  */
/* ------------------------------------------------------------------ */

export async function addComment(req, res) {
  const complaint = await loadComplaint(req.params.id, req.user);
  if (complaint.status === 'cancelled') throw ApiError.badRequest('This complaint was cancelled');
  const { comment } = req.valid.body;

  await recordHistory({ complaint, actor: req.user, action: 'comment', comment });

  const admins = req.user.role === 'admin' ? [] : await getActiveAdminIds();
  await notifyUsers([complaint.createdBy, complaint.assignedTo, ...admins], {
    actorId: req.user._id,
    complaint,
    title: `${complaint.complaintNumber}: new comment`,
    message: `${req.user.name}: ${comment}`,
  });
  return created(res, null, 'Comment added');
}

export async function reopenComplaint(req, res) {
  const complaint = await loadComplaint(req.params.id, req.user);
  if (!sameId(complaint.createdBy, req.user._id)) throw ApiError.forbidden('Only the student who filed it can reopen a complaint');

  const now = new Date();
  if (!reopenEligibility(complaint, now)) {
    throw ApiError.badRequest(
      `Only resolved or closed complaints can be reopened, within ${REOPEN_WINDOW_DAYS} days of resolution`
    );
  }
  const { reason } = req.valid.body;
  const prev = complaint.status;

  const [slaHours, cat] = await Promise.all([getSlaHours(), Category.findById(complaint.category).lean()]);
  complaint.status = 'reopened';
  complaint.reopenCount += 1;
  complaint.resolvedAt = null;
  complaint.closedAt = null;
  complaint.targetResolutionAt = computeTargetDate(
    now,
    computeTargetHours(complaint.priority, slaHours, cat?.defaultResolutionHours)
  );
  await complaint.save();

  await recordHistory({ complaint, actor: req.user, action: 'reopened', previousStatus: prev, newStatus: 'reopened', comment: reason });
  await notifyUsers([complaint.assignedTo, ...(await getActiveAdminIds())], {
    actorId: req.user._id,
    complaint,
    title: `${complaint.complaintNumber} reopened`,
    message: `${req.user.name} reopened it: ${reason}`,
  });

  await complaint.populate(COMPLAINT_POPULATE);
  return ok(res, { complaint: withSla(complaint, now) }, 'Complaint reopened');
}

export async function submitFeedback(req, res) {
  const complaint = await loadComplaint(req.params.id, req.user);
  if (!sameId(complaint.createdBy, req.user._id)) throw ApiError.forbidden('Only the student who filed it can rate a complaint');
  if (!['resolved', 'closed'].includes(complaint.status)) {
    throw ApiError.badRequest('You can rate a complaint only after it has been resolved');
  }
  const { rating, comment } = req.valid.body;

  let feedback;
  try {
    feedback = await Feedback.create({
      complaint: complaint._id,
      student: req.user._id,
      cycle: complaint.reopenCount,
      rating,
      comment,
    });
  } catch (err) {
    if (err?.code === 11000) throw ApiError.conflict('You have already rated this resolution');
    throw err;
  }

  await recordHistory({ complaint, actor: req.user, action: 'feedback', comment: `Rated ${rating}/5${comment ? `: ${comment}` : ''}` });
  await notifyUsers([complaint.assignedTo], {
    actorId: req.user._id,
    complaint,
    title: `${complaint.complaintNumber}: feedback received`,
    message: `The student rated the resolution ${rating}/5.`,
  });
  return created(res, { feedback }, 'Thank you for your feedback');
}

export async function deleteComplaint(req, res) {
  const complaint = await loadComplaint(req.params.id, req.user);
  const actions = await computeActions(req.user, complaint);
  if (!actions.canDelete) {
    throw ApiError.badRequest('Only cancelled complaints (or rejected/cancelled ones, for admins) can be deleted');
  }
  await Promise.all([
    ComplaintHistory.deleteMany({ complaint: complaint._id }),
    Notification.deleteMany({ complaint: complaint._id }),
    Feedback.deleteMany({ complaint: complaint._id }),
  ]);
  await complaint.deleteOne();
  return ok(res, null, 'Complaint deleted');
}

export { canViewComplaint };
