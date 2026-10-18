export const ROLES = ['student', 'staff', 'admin'];

export const PRIORITIES = ['low', 'medium', 'high', 'critical'];

export const STATUSES = [
  'submitted',
  'under_review',
  'assigned',
  'in_progress',
  'resolved',
  'closed',
  'rejected',
  'reopened',
  'cancelled',
];

/** Statuses where the complaint still needs work (SLA clock is running). */
export const OPEN_STATUSES = ['submitted', 'under_review', 'assigned', 'in_progress', 'reopened'];

/** Statuses that count as "done" for resolution metrics. */
export const DONE_STATUSES = ['resolved', 'closed'];

/** Default SLA targets (hours) per priority. Editable by admins. */
export const DEFAULT_SLA_HOURS = { low: 120, medium: 72, high: 24, critical: 8 };

/** Students may reopen a resolved complaint for this many days. */
export const REOPEN_WINDOW_DAYS = 7;

/** A "recent" complaint for the duplicate warning. */
export const DUPLICATE_WINDOW_DAYS = 14;

export const DEFAULT_CATEGORIES = [
  { name: 'IT and Wi-Fi', description: 'Internet, Wi-Fi, lab PCs, projectors and software issues', defaultResolutionHours: 48 },
  { name: 'Laboratory Equipment', description: 'Faulty or missing laboratory instruments and computers', defaultResolutionHours: 72 },
  { name: 'Classroom Facilities', description: 'Benches, boards, fans, lights and projectors in classrooms', defaultResolutionHours: 72 },
  { name: 'Electricity', description: 'Power cuts, wiring, switches and lighting problems', defaultResolutionHours: 24 },
  { name: 'Water Supply', description: 'Drinking water, taps, plumbing and leakage', defaultResolutionHours: 24 },
  { name: 'Cleaning and Sanitation', description: 'Cleanliness, washrooms and waste management', defaultResolutionHours: 48 },
  { name: 'Library', description: 'Library resources, seating and services', defaultResolutionHours: 96 },
  { name: 'Hostel', description: 'Hostel rooms, mess and facilities', defaultResolutionHours: 72 },
  { name: 'Canteen', description: 'Canteen food quality, hygiene and service', defaultResolutionHours: 72 },
  { name: 'Other', description: 'Anything that does not fit another category', defaultResolutionHours: 120 },
];

export const DEFAULT_DEPARTMENTS = [
  { name: 'IT Services', description: 'Network, computers, Wi-Fi and software support' },
  { name: 'Electrical Maintenance', description: 'Power, lighting and electrical equipment' },
  { name: 'Civil and Plumbing', description: 'Buildings, furniture, water supply and plumbing' },
  { name: 'Housekeeping', description: 'Cleaning, sanitation and waste management' },
  { name: 'Library Administration', description: 'Library resources and services' },
  { name: 'Hostel and Canteen Administration', description: 'Hostel, mess and canteen operations' },
];
