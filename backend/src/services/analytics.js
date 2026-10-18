import { Complaint } from '../models/Complaint.js';
import { Feedback } from '../models/Feedback.js';
import { Category } from '../models/Category.js';
import { Department } from '../models/Department.js';
import { User } from '../models/User.js';
import { DONE_STATUSES, OPEN_STATUSES } from '../utils/constants.js';

const HOUR = 3600 * 1000;
const MAX_ROWS = 20000; // safety cap for the in-memory passes below

const monthKey = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

/** Month buckets (UTC) from `start` to `end`, inclusive; capped at 24. */
function monthBuckets(start, end) {
  const out = [];
  const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  while (cur <= last && out.length < 24) {
    out.push(monthKey(cur));
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  return out;
}

const roundHours = (ms) => (ms == null ? null : Math.round((ms / HOUR) * 10) / 10);
const pct = (num, den) => (den > 0 ? Math.round((num / den) * 1000) / 10 : null);

/** Fold { _id: { k, s: status }, count } rows into per-key open/resolved/total counters. */
function foldStatusRows(rows) {
  const map = new Map();
  for (const r of rows) {
    const key = String(r._id.k);
    const e = map.get(key) ?? { id: r._id.k, total: 0, open: 0, resolved: 0 };
    e.total += r.count;
    if (OPEN_STATUSES.includes(r._id.s)) e.open += r.count;
    if (DONE_STATUSES.includes(r._id.s)) e.resolved += r.count;
    map.set(key, e);
  }
  return map;
}

/** Resolution-time stats for finished complaints, grouped by `field` (or overall when null). */
function resolutionStats(doneRows, field) {
  const groups = new Map();
  for (const c of doneRows) {
    const key = field ? String(c[field] ?? '') : 'all';
    const g = groups.get(key) ?? { count: 0, totalMs: 0, within: 0 };
    g.count += 1;
    g.totalMs += new Date(c.resolvedAt) - new Date(c.createdAt);
    if (new Date(c.resolvedAt) <= new Date(c.targetResolutionAt)) g.within += 1;
    groups.set(key, g);
  }
  return groups;
}

const toPerf = (g) => ({
  avgResolutionHours: g?.count ? roundHours(g.totalMs / g.count) : null,
  withinTargetPercent: pct(g?.within ?? 0, g?.count ?? 0),
});

/**
 * Real-data analytics over complaints matching `match` (a Mongo filter that
 * must already contain only ObjectId-typed ids, since aggregate() does not cast).
 * Uses plain group queries plus a small in-memory pass, so it runs on any MongoDB-compatible server.
 */
export async function buildSummary(match = {}, { from, to } = {}) {
  const now = new Date();
  const end = to ?? now;
  const start = from ?? new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 5, 1));
  const hasDept = { ...match, assignedDepartment: { $ne: null } };

  const [statusRows, categoryRows, priorityRows, createdDates, doneRows, overdueCount, deptStatusRows, deptOverdueRows] =
    await Promise.all([
      Complaint.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Complaint.aggregate([{ $match: match }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Complaint.aggregate([{ $match: match }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
      Complaint.find({ ...match, createdAt: { $gte: start, $lte: end } }).select('createdAt').limit(MAX_ROWS).lean(),
      Complaint.find({ ...match, status: { $in: DONE_STATUSES }, resolvedAt: { $ne: null } })
        .select('createdAt resolvedAt targetResolutionAt assignedDepartment')
        .limit(MAX_ROWS)
        .lean(),
      Complaint.countDocuments({ ...match, status: { $in: OPEN_STATUSES }, targetResolutionAt: { $lt: now } }),
      Complaint.aggregate([
        { $match: hasDept },
        { $group: { _id: { k: '$assignedDepartment', s: '$status' }, count: { $sum: 1 } } },
      ]),
      Complaint.aggregate([
        { $match: { ...hasDept, status: { $in: OPEN_STATUSES }, targetResolutionAt: { $lt: now } } },
        { $group: { _id: '$assignedDepartment', count: { $sum: 1 } } },
      ]),
    ]);

  // Names are resolved in JS (two tiny collections) instead of $lookup: simpler and portable.
  const deptMap = foldStatusRows(deptStatusRows);
  const [cats, depts] = await Promise.all([
    Category.find({ _id: { $in: categoryRows.map((r) => r._id) } }).select('name').lean(),
    Department.find({ _id: { $in: [...deptMap.values()].map((d) => d.id) } }).select('name').lean(),
  ]);
  const catNames = new Map(cats.map((c) => [String(c._id), c.name]));
  const deptNames = new Map(depts.map((d) => [String(d._id), d.name]));

  const byStatus = Object.fromEntries(statusRows.map((r) => [r._id, r.count]));
  const total = statusRows.reduce((s, r) => s + r.count, 0);
  const open = OPEN_STATUSES.reduce((s, k) => s + (byStatus[k] || 0), 0);
  const resolved = DONE_STATUSES.reduce((s, k) => s + (byStatus[k] || 0), 0);

  const createdByMonth = new Map();
  for (const c of createdDates) {
    const k = monthKey(c.createdAt);
    createdByMonth.set(k, (createdByMonth.get(k) ?? 0) + 1);
  }
  const resolvedByMonth = new Map();
  for (const c of doneRows) {
    if (c.resolvedAt >= start && c.resolvedAt <= end) {
      const k = monthKey(c.resolvedAt);
      resolvedByMonth.set(k, (resolvedByMonth.get(k) ?? 0) + 1);
    }
  }
  const monthly = monthBuckets(start, end).map((month) => ({
    month,
    created: createdByMonth.get(month) ?? 0,
    resolved: resolvedByMonth.get(month) ?? 0,
  }));

  const overall = resolutionStats(doneRows, null).get('all');
  const perDept = resolutionStats(doneRows, 'assignedDepartment');
  const deptOverdue = new Map(deptOverdueRows.map((r) => [String(r._id), r.count]));

  return {
    totals: {
      total,
      open,
      resolved,
      rejected: byStatus.rejected || 0,
      cancelled: byStatus.cancelled || 0,
      overdue: overdueCount,
    },
    byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
    byCategory: categoryRows.map((r) => ({ id: r._id, name: catNames.get(String(r._id)) ?? 'Unknown', count: r.count })),
    byPriority: priorityRows.map((r) => ({ priority: r._id, count: r.count })),
    monthly,
    resolution: {
      resolvedCount: overall?.count ?? 0,
      withinTargetCount: overall?.within ?? 0,
      ...toPerf(overall),
    },
    departments: [...deptMap.values()]
      .map((d) => ({
        id: d.id,
        name: deptNames.get(String(d.id)) ?? 'Unknown',
        total: d.total,
        open: d.open,
        resolved: d.resolved,
        overdue: deptOverdue.get(String(d.id)) ?? 0,
        ...toPerf(perDept.get(String(d.id))),
      }))
      .sort((a, b) => b.total - a.total),
  };
}

export async function ratingSummary(match = {}) {
  const feedbackMatch = {};
  if (Object.keys(match).length) {
    const ids = await Complaint.find(match).select('_id').lean();
    feedbackMatch.complaint = { $in: ids.map((c) => c._id) };
  }
  const [row] = await Feedback.aggregate([
    { $match: feedbackMatch },
    { $group: { _id: null, total: { $sum: '$rating' }, count: { $sum: 1 } } },
  ]);
  return { average: row ? Math.round((row.total / row.count) * 10) / 10 : null, count: row?.count ?? 0 };
}

/** Per-staff workload for the reports page. */
export async function staffPerformance(match = {}) {
  const now = new Date();
  const assigned = { ...match, assignedTo: { $ne: null } };
  const [statusRows, overdueRows] = await Promise.all([
    Complaint.aggregate([
      { $match: assigned },
      { $group: { _id: { k: '$assignedTo', s: '$status' }, count: { $sum: 1 } } },
    ]),
    Complaint.aggregate([
      { $match: { ...assigned, status: { $in: OPEN_STATUSES }, targetResolutionAt: { $lt: now } } },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
    ]),
  ]);
  const folded = [...foldStatusRows(statusRows).values()].sort((a, b) => b.total - a.total).slice(0, 20);
  const users = await User.find({ _id: { $in: folded.map((r) => r.id) } }).select('name').lean();
  const names = new Map(users.map((u) => [String(u._id), u.name]));
  const overdue = new Map(overdueRows.map((r) => [String(r._id), r.count]));
  return folded.map((r) => ({
    id: r.id,
    name: names.get(String(r.id)) ?? 'Unknown',
    assigned: r.total,
    open: r.open,
    resolved: r.resolved,
    overdue: overdue.get(String(r.id)) ?? 0,
  }));
}
