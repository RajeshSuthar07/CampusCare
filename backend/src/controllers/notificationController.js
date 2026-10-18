import { Notification } from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';
import { ok, paginated } from '../utils/http.js';

export async function listNotifications(req, res) {
  const { page, limit } = req.valid.query;
  const filter = { recipient: req.user._id };
  const [total, unreadCount, rows] = await Promise.all([
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, isRead: false }),
    Notification.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('complaint', 'complaintNumber')
      .lean(),
  ]);
  const body = {
    success: true,
    message: 'OK',
    data: rows,
    unreadCount,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
  return res.status(200).json(body);
}

export async function unreadCount(req, res) {
  const count = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
  return ok(res, { unreadCount: count });
}

export async function markRead(req, res) {
  // recipient is part of the filter, so nobody can touch another user's notification
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { isRead: true },
    { returnDocument: 'after' }
  );
  if (!n) throw ApiError.notFound('Notification not found');
  return ok(res, n, 'Marked as read');
}

export async function markAllRead(req, res) {
  const result = await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
  return ok(res, { updated: result.modifiedCount }, 'All notifications marked as read');
}

export { paginated };
