/**
 * Complaint status workflow.
 *
 *   Submitted -> Under Review -> Assigned -> In Progress -> Resolved -> Closed
 *   plus Rejected (with reason), Reopened (with reason) and Cancelled (student).
 *
 * Moving INTO "assigned" is done only through the assign endpoint, and moving
 * INTO "reopened" only through the reopen endpoint, because both need extra data.
 */
export const TRANSITIONS = {
  admin: {
    submitted: ['under_review', 'rejected'],
    under_review: ['rejected'],
    assigned: ['in_progress', 'under_review'],
    in_progress: ['resolved'],
    resolved: ['closed'],
    reopened: ['under_review', 'in_progress'],
  },
  staff: {
    assigned: ['in_progress'],
    in_progress: ['resolved'],
    reopened: ['in_progress'],
  },
  student: {
    submitted: ['cancelled'],
    under_review: ['cancelled'],
  },
};

export function canTransition(role, from, to) {
  return Boolean(TRANSITIONS[role]?.[from]?.includes(to));
}

export function allowedNextStatuses(role, from) {
  return TRANSITIONS[role]?.[from] ?? [];
}

/** A comment is mandatory for these target statuses. */
export const COMMENT_REQUIRED = ['rejected', 'resolved', 'reopened'];

export const STATUS_LABELS = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  rejected: 'Rejected',
  reopened: 'Reopened',
  cancelled: 'Cancelled',
};
