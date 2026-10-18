import { Complaint } from '../models/Complaint.js';
import { Category } from '../models/Category.js';
import { Department } from '../models/Department.js';
import { User } from '../models/User.js';
import { getSlaHours } from '../models/Setting.js';
import { ok } from '../utils/http.js';
import { OPEN_STATUSES, PRIORITIES, STATUSES } from '../utils/constants.js';
import { buildSummary } from '../services/analytics.js';
import { COMPLAINT_POPULATE, scopeFilterFor, withSla } from '../services/complaintService.js';

/** Student and staff dashboards: the same analytics, scoped to what the user may see. */
export async function myDashboard(req, res) {
  const now = new Date();
  const scope = scopeFilterFor(req.user);
  const summary = await buildSummary(scope);

  const recent = await Complaint.find(scope)
    .sort({ updatedAt: -1 })
    .limit(5)
    .populate(COMPLAINT_POPULATE)
    .lean();

  const extra = {};
  if (req.user.role === 'staff') {
    const mine = { assignedTo: req.user._id };
    const [assigned, pending, inProgress, completed, unclaimed] = await Promise.all([
      Complaint.countDocuments(mine),
      Complaint.countDocuments({ ...mine, status: { $in: ['assigned', 'reopened'] } }),
      Complaint.countDocuments({ ...mine, status: 'in_progress' }),
      Complaint.countDocuments({ ...mine, status: { $in: ['resolved', 'closed'] } }),
      req.user.department
        ? Complaint.countDocuments({
            assignedDepartment: req.user.department,
            assignedTo: null,
            status: { $in: OPEN_STATUSES },
          })
        : 0,
    ]);
    extra.staff = { assigned, pending, inProgress, completed, unclaimedInDepartment: unclaimed };
  }

  return ok(res, { ...summary, ...extra, recent: recent.map((c) => withSla(c, now)) });
}

/** Lookup data for forms and filters (authenticated users only). */
export async function meta(req, res) {
  const isAdmin = req.user.role === 'admin';
  const [categories, departments, slaHours, staff] = await Promise.all([
    Category.find({ isActive: true }).sort({ name: 1 }).select('name description defaultResolutionHours').lean(),
    Department.find({ isActive: true }).sort({ name: 1 }).select('name').lean(),
    getSlaHours(),
    isAdmin
      ? User.find({ role: 'staff', isActive: true }).sort({ name: 1 }).select('name department').lean()
      : Promise.resolve([]),
  ]);
  return ok(res, { categories, departments, staff, slaHours, priorities: PRIORITIES, statuses: STATUSES });
}
