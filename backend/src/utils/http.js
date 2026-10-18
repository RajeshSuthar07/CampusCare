/** Consistent JSON envelope: { success, message, data, pagination? } */
export function ok(res, data = null, message = 'OK', extra = {}) {
  return res.status(200).json({ success: true, message, data, ...extra });
}

export function created(res, data = null, message = 'Created') {
  return res.status(201).json({ success: true, message, data });
}

export function paginated(res, data, { page, limit, total }, message = 'OK') {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
}

/** Escape user input before using it inside a RegExp. */
export function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
