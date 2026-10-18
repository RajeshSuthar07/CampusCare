import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, validateObjectId } from '../middleware/validate.js';
import { parseComplaintForm, handleImageUpload } from '../middleware/upload.js';
import * as S from '../validators/schemas.js';
import * as auth from '../controllers/authController.js';
import * as complaints from '../controllers/complaintController.js';
import * as notifications from '../controllers/notificationController.js';
import * as admin from '../controllers/adminController.js';
import * as dash from '../controllers/dashboardController.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
});

/* ---------- auth ---------- */
router.post('/auth/register', authLimiter, validate({ body: S.registerBody }), auth.register);
router.post('/auth/login', authLimiter, validate({ body: S.loginBody }), auth.login);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', authenticate, auth.me);
router.patch('/auth/me', authenticate, validate({ body: S.profileBody }), auth.updateProfile);

/* everything below requires a valid session */
router.use(authenticate);

router.get('/meta', dash.meta);
router.get('/dashboard', authorize('student', 'staff'), dash.myDashboard);

/* ---------- complaints ---------- */
router.get('/complaints/precheck', authorize('student'), validate({ query: S.precheckQuery }), complaints.precheck);
router.get('/complaints', validate({ query: S.listComplaintsQuery }), complaints.listComplaints);
router.post(
  '/complaints',
  authorize('student'),
  parseComplaintForm,
  validate({ body: S.createComplaintBody }),
  handleImageUpload,
  complaints.createComplaint
);
router.get('/complaints/:id', validateObjectId('id'), complaints.getComplaint);
router.patch('/complaints/:id', validateObjectId('id'), validate({ body: S.updateComplaintBody }), complaints.updateComplaint);
router.patch('/complaints/:id/status', validateObjectId('id'), validate({ body: S.statusBody }), complaints.changeStatus);
router.patch('/complaints/:id/assign', validateObjectId('id'), authorize('admin'), validate({ body: S.assignBody }), complaints.assignComplaint);
router.post('/complaints/:id/comments', validateObjectId('id'), validate({ body: S.commentBody }), complaints.addComment);
router.post('/complaints/:id/reopen', validateObjectId('id'), authorize('student'), validate({ body: S.reopenBody }), complaints.reopenComplaint);
router.post('/complaints/:id/feedback', validateObjectId('id'), authorize('student'), validate({ body: S.feedbackBody }), complaints.submitFeedback);
router.delete('/complaints/:id', validateObjectId('id'), complaints.deleteComplaint);

/* ---------- notifications ---------- */
router.get('/notifications', validate({ query: S.pageQuery }), notifications.listNotifications);
router.get('/notifications/unread-count', notifications.unreadCount);
router.patch('/notifications/read-all', notifications.markAllRead);
router.patch('/notifications/:id/read', validateObjectId('id'), notifications.markRead);

/* ---------- admin ---------- */
const adminRouter = Router();
adminRouter.use(authorize('admin'));
adminRouter.get('/dashboard', admin.dashboard);
adminRouter.get('/reports', validate({ query: S.reportsQuery }), admin.reports);
adminRouter.get('/users', validate({ query: S.adminUsersQuery }), admin.listUsers);
adminRouter.post('/users', validate({ body: S.createUserBody }), admin.createUser);
adminRouter.patch('/users/:id', validateObjectId('id'), validate({ body: S.updateUserBody }), admin.updateUser);
adminRouter.get('/departments', admin.listDepartments);
adminRouter.post('/departments', validate({ body: S.departmentBody }), admin.createDepartment);
adminRouter.patch('/departments/:id', validateObjectId('id'), validate({ body: S.departmentPatch }), admin.updateDepartment);
adminRouter.get('/categories', admin.listCategories);
adminRouter.post('/categories', validate({ body: S.categoryBody }), admin.createCategory);
adminRouter.patch('/categories/:id', validateObjectId('id'), validate({ body: S.categoryPatch }), admin.updateCategory);
adminRouter.get('/sla-settings', admin.getSla);
adminRouter.patch('/sla-settings', validate({ body: S.slaBody }), admin.updateSla);
adminRouter.get('/feedback', validate({ query: S.pageQuery }), admin.listFeedback);
router.use('/admin', adminRouter);

export default router;
