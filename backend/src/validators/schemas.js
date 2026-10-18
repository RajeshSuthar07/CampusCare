import { z } from 'zod';
import { PRIORITIES, STATUSES, ROLES } from '../utils/constants.js';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const emptyToUndef = (v) => (v === '' || v === null ? undefined : v);
const optionalId = z.preprocess(emptyToUndef, objectId.optional());

export const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

const email = z.string().trim().toLowerCase().max(120).email('Enter a valid email address');

/* ---------- auth ---------- */
export const registerBody = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email,
  password,
  registrationNumber: z.preprocess(emptyToUndef, z.string().trim().max(40).optional()),
  phone: z.preprocess(emptyToUndef, z.string().trim().max(20).optional()),
});

export const loginBody = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(200),
});

export const profileBody = z
  .object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().max(20),
    currentPassword: z.string().max(200),
    newPassword: password,
  })
  .partial()
  .refine((v) => !v.newPassword || v.currentPassword, {
    message: 'Current password is required to set a new password',
    path: ['currentPassword'],
  });

/* ---------- complaints ---------- */
export const createComplaintBody = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(120),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(2000),
  category: objectId,
  location: z.string().trim().min(2, 'Location is required').max(120),
  priority: z.preprocess(emptyToUndef, z.enum(PRIORITIES).optional()),
});

export const precheckQuery = z.object({
  category: objectId,
  location: z.string().trim().min(2).max(120),
  title: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).optional(),
});

export const updateComplaintBody = z
  .object({
    title: z.string().trim().min(5).max(120),
    description: z.string().trim().min(10).max(2000),
    location: z.string().trim().min(2).max(120),
    priority: z.enum(PRIORITIES),
    targetHours: z.coerce.number().positive().max(24 * 120),
    resolutionNotes: z.string().trim().max(2000),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

export const statusBody = z.object({
  status: z.enum(STATUSES),
  comment: z.string().trim().max(2000).optional().default(''),
});

export const assignBody = z
  .object({
    departmentId: optionalId,
    staffId: optionalId,
    comment: z.string().trim().max(2000).optional().default(''),
  })
  .refine((v) => v.departmentId || v.staffId, { message: 'Choose a department or a staff member' });

export const commentBody = z.object({ comment: z.string().trim().min(1, 'Comment cannot be empty').max(2000) });

export const reopenBody = z.object({ reason: z.string().trim().min(5, 'Please explain why (min 5 characters)').max(2000) });

export const feedbackBody = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().default(''),
});

const dateStr = z.preprocess(
  emptyToUndef,
  z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date').optional()
);

const page = z.coerce.number().int().min(1).default(1);
const limit = z.coerce.number().int().min(1).max(50).default(10);

export const listComplaintsQuery = z.object({
  page,
  limit,
  search: z.preprocess(emptyToUndef, z.string().trim().max(100).optional()),
  status: z.preprocess(emptyToUndef, z.enum(STATUSES).optional()),
  priority: z.preprocess(emptyToUndef, z.enum(PRIORITIES).optional()),
  category: optionalId,
  department: optionalId,
  assignedTo: z.preprocess(emptyToUndef, z.union([objectId, z.enum(['me', 'unassigned'])]).optional()),
  from: dateStr,
  to: dateStr,
  overdue: z.preprocess(emptyToUndef, z.enum(['true', 'false']).optional()),
  sort: z.preprocess(emptyToUndef, z.enum(['newest', 'oldest', 'due', 'updated']).optional()),
  scope: z.preprocess(emptyToUndef, z.enum(['open', 'done']).optional()),
});

export const pageQuery = z.object({ page, limit });

/* ---------- admin ---------- */
export const adminUsersQuery = z.object({
  page,
  limit,
  search: z.preprocess(emptyToUndef, z.string().trim().max(100).optional()),
  role: z.preprocess(emptyToUndef, z.enum(ROLES).optional()),
  active: z.preprocess(emptyToUndef, z.enum(['true', 'false']).optional()),
  department: optionalId,
});

export const createUserBody = z.object({
  name: z.string().trim().min(2).max(80),
  email,
  password,
  role: z.enum(['staff', 'admin']),
  departmentId: optionalId,
});

export const updateUserBody = z
  .object({
    name: z.string().trim().min(2).max(80),
    role: z.enum(ROLES),
    isActive: z.boolean(),
    departmentId: z.union([objectId, z.null(), z.literal('')]),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

export const departmentBody = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).optional().default(''),
  isActive: z.boolean().optional(),
});
export const departmentPatch = departmentBody.partial().refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

export const categoryBody = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).optional().default(''),
  defaultResolutionHours: z.coerce.number().int().min(1).max(24 * 90).optional().default(72),
  isActive: z.boolean().optional(),
});
export const categoryPatch = categoryBody
  .partial()
  .extend({ description: z.string().trim().max(300).optional(), defaultResolutionHours: z.coerce.number().int().min(1).max(24 * 90).optional() })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

const hours = z.coerce.number().positive().max(24 * 120);
export const slaBody = z.object({ low: hours, medium: hours, high: hours, critical: hours });

export const reportsQuery = z.object({ from: dateStr, to: dateStr });
