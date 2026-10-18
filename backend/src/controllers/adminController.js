import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Department } from '../models/Department.js';
import { Category } from '../models/Category.js';
import { Complaint } from '../models/Complaint.js';
import { Feedback } from '../models/Feedback.js';
import { getSlaHours, setSlaHours } from '../models/Setting.js';
import { ApiError } from '../utils/ApiError.js';
import { ok, created, paginated, escapeRegex } from '../utils/http.js';
import { OPEN_STATUSES } from '../utils/constants.js';
import { buildSummary, ratingSummary, staffPerformance } from '../services/analytics.js';
import { COMPLAINT_POPULATE, withSla } from '../services/complaintService.js';

/* ---------------------------- dashboard ---------------------------- */

export async function dashboard(_req, res) {
  const now = new Date();
  const [summary, ratings, userCounts, recent, overdue] = await Promise.all([
    buildSummary({}),
    ratingSummary(),
    User.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$role', count: { $sum: 1 } } }]),
    Complaint.find().sort({ createdAt: -1 }).limit(6).populate(COMPLAINT_POPULATE).lean(),
    Complaint.find({ status: { $in: OPEN_STATUSES }, targetResolutionAt: { $lt: now } })
      .sort({ targetResolutionAt: 1 })
      .limit(5)
      .populate(COMPLAINT_POPULATE)
      .lean(),
  ]);
  return ok(res, {
    ...summary,
    ratings,
    users: Object.fromEntries(userCounts.map((u) => [u._id, u.count])),
    recent: recent.map((c) => withSla(c, now)),
    overdueList: overdue.map((c) => withSla(c, now)),
  });
}

export async function reports(req, res) {
  const { from, to } = req.valid.query;
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) {
    const end = new Date(to);
    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) end.setUTCHours(23, 59, 59, 999);
    range.$lte = end;
  }
  const match = Object.keys(range).length ? { createdAt: range } : {};

  const [summary, ratings, staff] = await Promise.all([
    buildSummary(match, { from: from ? new Date(from) : undefined, to: to ? new Date(to) : undefined }),
    ratingSummary(match),
    staffPerformance(match),
  ]);
  return ok(res, { ...summary, ratings, staff, range: { from: from ?? null, to: to ?? null } });
}

/* ------------------------------ users ------------------------------ */

export async function listUsers(req, res) {
  const { page, limit, search, role, active, department } = req.valid.query;
  const filter = {};
  if (role) filter.role = role;
  if (active) filter.isActive = active === 'true';
  if (department) filter.department = new mongoose.Types.ObjectId(department);
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { registrationNumber: rx }];
  }
  const [total, rows] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('department', 'name'),
  ]);
  return paginated(res, rows.map((u) => u.toJSON()), { page, limit, total });
}

export async function createUser(req, res) {
  const { name, email, password, role, departmentId } = req.valid.body;
  if (await User.exists({ email })) throw ApiError.conflict('An account with this email already exists');
  if (departmentId && !(await Department.exists({ _id: departmentId }))) throw ApiError.badRequest('Department not found');
  if (role === 'staff' && !departmentId) throw ApiError.badRequest('Staff members must belong to a department');

  const user = await User.create({
    name,
    email,
    role,
    department: role === 'staff' ? departmentId : null,
    passwordHash: await bcrypt.hash(password, 12),
  });
  await user.populate('department', 'name');
  return created(res, { user: user.toJSON() }, `${role === 'staff' ? 'Staff' : 'Admin'} account created`);
}

export async function updateUser(req, res) {
  const body = req.valid.body;
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  const isSelf = String(user._id) === String(req.user._id);
  const losingAdmin =
    user.role === 'admin' && ((body.role && body.role !== 'admin') || body.isActive === false);
  if (isSelf && (body.isActive === false || (body.role && body.role !== user.role))) {
    throw ApiError.badRequest('You cannot disable or change the role of your own account');
  }
  if (losingAdmin) {
    const others = await User.countDocuments({ role: 'admin', isActive: true, _id: { $ne: user._id } });
    if (others === 0) throw ApiError.badRequest('There must be at least one active administrator');
  }

  if (body.name !== undefined) user.name = body.name;
  if (body.isActive !== undefined) user.isActive = body.isActive;
  if (body.role !== undefined) user.role = body.role;
  if (body.departmentId !== undefined) {
    if (body.departmentId) {
      if (!(await Department.exists({ _id: body.departmentId }))) throw ApiError.badRequest('Department not found');
      user.department = body.departmentId;
    } else {
      user.department = null;
    }
  }
  if (user.role === 'staff' && !user.department) throw ApiError.badRequest('Staff members must belong to a department');
  if (user.role !== 'staff') user.department = null;

  await user.save();
  await user.populate('department', 'name');
  return ok(res, { user: user.toJSON() }, 'User updated');
}

/* ------------------------ departments / categories ------------------------ */

export async function listDepartments(_req, res) {
  const rows = await Department.find().sort({ name: 1 }).lean();
  const staffCounts = await User.aggregate([
    { $match: { role: 'staff', isActive: true, department: { $ne: null } } },
    { $group: { _id: '$department', count: { $sum: 1 } } },
  ]);
  const map = new Map(staffCounts.map((s) => [String(s._id), s.count]));
  return ok(res, rows.map((d) => ({ ...d, staffCount: map.get(String(d._id)) ?? 0 })));
}

export async function createDepartment(req, res) {
  const dept = await Department.create(req.valid.body);
  return created(res, dept, 'Department created');
}

export async function updateDepartment(req, res) {
  const dept = await Department.findByIdAndUpdate(req.params.id, req.valid.body, {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!dept) throw ApiError.notFound('Department not found');
  return ok(res, dept, 'Department updated');
}

export async function listCategories(_req, res) {
  return ok(res, await Category.find().sort({ name: 1 }).lean());
}

export async function createCategory(req, res) {
  const cat = await Category.create(req.valid.body);
  return created(res, cat, 'Category created');
}

export async function updateCategory(req, res) {
  const cat = await Category.findByIdAndUpdate(req.params.id, req.valid.body, {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!cat) throw ApiError.notFound('Category not found');
  return ok(res, cat, 'Category updated');
}

/* ---------------------------------- SLA ---------------------------------- */

export async function getSla(_req, res) {
  return ok(res, await getSlaHours());
}

export async function updateSla(req, res) {
  const hours = req.valid.body;
  if (!(hours.critical <= hours.high && hours.high <= hours.medium && hours.medium <= hours.low)) {
    throw ApiError.badRequest('Targets must not increase with urgency: critical ≤ high ≤ medium ≤ low');
  }
  return ok(res, await setSlaHours(hours), 'SLA targets updated (applies to new complaints)');
}

/* -------------------------------- feedback -------------------------------- */

export async function listFeedback(req, res) {
  const { page, limit } = req.valid.query;
  const [total, rows, summary] = await Promise.all([
    Feedback.countDocuments(),
    Feedback.find()
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('student', 'name')
      .populate({
        path: 'complaint',
        select: 'complaintNumber title assignedTo assignedDepartment',
        populate: [
          { path: 'assignedTo', select: 'name' },
          { path: 'assignedDepartment', select: 'name' },
        ],
      })
      .lean(),
    ratingSummary(),
  ]);
  const dist = await Feedback.aggregate([{ $group: { _id: '$rating', count: { $sum: 1 } } }]);
  const distribution = [1, 2, 3, 4, 5].map((r) => ({ rating: r, count: dist.find((d) => d._id === r)?.count ?? 0 }));
  return res.status(200).json({
    success: true,
    message: 'OK',
    data: rows,
    summary: { ...summary, distribution },
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
}
