import { DONE_STATUSES, OPEN_STATUSES } from './constants.js';

const HOUR = 60 * 60 * 1000;

/**
 * Target hours = SLA hours for the priority, capped by the category's
 * defaultResolutionHours (whichever is stricter).
 */
export function computeTargetHours(priority, slaHours, categoryHours) {
  const base = slaHours[priority];
  if (categoryHours && categoryHours > 0) return Math.min(base, categoryHours);
  return base;
}

export function computeTargetDate(from, hours) {
  return new Date(new Date(from).getTime() + hours * HOUR);
}

/**
 * SLA view of a complaint, always computed from server time.
 * state: on_track | at_risk (<25% of the window left) | overdue | met | missed | n/a
 */
export function getSlaInfo(complaint, now = new Date()) {
  const target = complaint.targetResolutionAt ? new Date(complaint.targetResolutionAt) : null;
  if (!target) return { state: 'n/a', isOverdue: false, remainingMs: null, targetResolutionAt: null };

  if (DONE_STATUSES.includes(complaint.status)) {
    const doneAt = complaint.resolvedAt ? new Date(complaint.resolvedAt) : now;
    const met = doneAt <= target;
    return {
      state: met ? 'met' : 'missed',
      isOverdue: false,
      remainingMs: null,
      targetResolutionAt: target,
      resolutionMs: doneAt - new Date(complaint.createdAt),
    };
  }

  if (!OPEN_STATUSES.includes(complaint.status)) {
    // rejected / cancelled: the clock no longer applies
    return { state: 'n/a', isOverdue: false, remainingMs: null, targetResolutionAt: target };
  }

  const remainingMs = target - now;
  const windowMs = target - new Date(complaint.createdAt);
  let state = 'on_track';
  if (remainingMs < 0) state = 'overdue';
  else if (windowMs > 0 && remainingMs / windowMs < 0.25) state = 'at_risk';

  return { state, isOverdue: remainingMs < 0, remainingMs, targetResolutionAt: target };
}
