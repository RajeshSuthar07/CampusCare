import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Category } from '../src/models/Category.js';
import { Department } from '../src/models/Department.js';
import { Complaint } from '../src/models/Complaint.js';
import { Notification } from '../src/models/Notification.js';
import { seedBaseData } from '../src/scripts/seedLib.js';
import { connectTestDb, disconnectTestDb, makeAgent, createUserDirect, loginAs, PASSWORD } from './helpers.js';

let admin, staff, otherStaff, itDept, elecCat, itCat;
let studentA, studentB; // supertest agents
let studentAUser;

const complaintBody = (over = {}) => ({
  title: 'Complete power failure in Lab 3',
  description: 'The entire lab has no electricity and practical exams are tomorrow.',
  category: String(elecCat._id),
  location: 'Block B, Lab 3',
  ...over,
});

beforeAll(async () => {
  await connectTestDb('api');
  await seedBaseData();
  elecCat = await Category.findOne({ name: 'Electricity' });
  itCat = await Category.findOne({ name: 'IT and Wi-Fi' });
  itDept = await Department.findOne({ name: 'IT Services' });
  const elecDept = await Department.findOne({ name: 'Electrical Maintenance' });

  admin = await createUserDirect(User, { name: 'Admin', email: 'admin@test.dev', role: 'admin' });
  staff = await createUserDirect(User, { name: 'Staff One', email: 'staff@test.dev', role: 'staff', department: itDept._id });
  otherStaff = await createUserDirect(User, { name: 'Staff Two', email: 'staff2@test.dev', role: 'staff', department: elecDept._id });
});

afterAll(disconnectTestDb);

describe('authentication', () => {
  it('registers a student, sets an HTTP-only cookie and ignores a supplied role', async () => {
    const agent = makeAgent(app);
    const res = await agent.post('/api/auth/register').send({
      name: 'Student A', email: 'A@Test.dev', password: PASSWORD, role: 'admin', registrationNumber: 'REG-1',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('student');
    expect(res.body.data.user.email).toBe('a@test.dev');
    expect(res.body.data.user.passwordHash).toBeUndefined();
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe('a@test.dev');
    studentAUser = await User.findOne({ email: 'a@test.dev' });
  });

  it('rejects duplicate email, weak passwords and bad logins', async () => {
    const a = makeAgent(app);
    expect((await a.post('/api/auth/register').send({ name: 'Dup', email: 'a@test.dev', password: PASSWORD })).status).toBe(409);
    expect((await a.post('/api/auth/register').send({ name: 'Weak', email: 'w@test.dev', password: 'short' })).status).toBe(400);
    expect((await a.post('/api/auth/login').send({ email: 'a@test.dev', password: 'WrongPass1' })).status).toBe(401);
    expect((await a.post('/api/auth/login').send({ email: 'nobody@test.dev', password: PASSWORD })).status).toBe(401);
  });

  it('blocks NoSQL operator injection in the login body', async () => {
    const res = await makeAgent(app).post('/api/auth/login').send({ email: { $ne: null }, password: { $ne: null } });
    expect(res.status).toBe(400);
  });

  it('requires a session and the CSRF header', async () => {
    expect((await request(app).get('/api/complaints')).status).toBe(401);
    const noHeader = await request(app).post('/api/auth/login').send({ email: 'admin@test.dev', password: PASSWORD });
    expect(noHeader.status).toBe(403);
  });

  it('does not let a user change their own role through the profile endpoint', async () => {
    studentA = await loginAs(app, 'a@test.dev');
    const res = await studentA.patch('/api/auth/me').send({ name: 'Student Alpha', role: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Student Alpha');
    expect(res.body.data.user.role).toBe('student');
  });

  it('applies a disabled account on the very next request', async () => {
    await createUserDirect(User, { name: 'Temp', email: 'temp@test.dev', role: 'student' });
    const temp = await loginAs(app, 'temp@test.dev');
    await User.updateOne({ email: 'temp@test.dev' }, { isActive: false });
    expect((await temp.get('/api/auth/me')).status).toBe(401);
    expect((await makeAgent(app).post('/api/auth/login').send({ email: 'temp@test.dev', password: PASSWORD })).status).toBe(403);
  });
});

describe('complaint creation and access control', () => {
  let c1;

  it('creates complaints with sequential, unique references and a suggested priority', async () => {
    const res = await studentA.post('/api/complaints').send(complaintBody());
    expect(res.status).toBe(201);
    c1 = res.body.data.complaint;
    expect(c1.complaintNumber).toMatch(/^CC-\d{4}-0001$/);
    expect(c1.status).toBe('submitted');
    expect(['high', 'critical']).toContain(c1.suggestedPriority);
    expect(new Date(c1.targetResolutionAt).getTime()).toBeGreaterThan(Date.now());

    const res2 = await studentA.post('/api/complaints').send(complaintBody({ title: 'Wi-Fi is down in library', category: String(itCat._id), location: 'Library' }));
    expect(res2.body.data.complaint.complaintNumber).toMatch(/^CC-\d{4}-0002$/);
  });

  it('never produces duplicate references under concurrent submissions', async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        studentA.post('/api/complaints').send(complaintBody({ title: `Concurrent issue number ${i}`, location: `Room ${i}` }))
      )
    );
    expect(results.every((r) => r.status === 201)).toBe(true);
    const numbers = results.map((r) => r.body.data.complaint.complaintNumber);
    expect(new Set(numbers).size).toBe(8);
  });

  it('validates input', async () => {
    expect((await studentA.post('/api/complaints').send({ title: 'x' })).status).toBe(400);
    expect((await studentA.post('/api/complaints').send(complaintBody({ category: 'not-an-id' }))).status).toBe(400);
    expect((await studentA.get('/api/complaints/not-an-id')).status).toBe(400);
  });

  it('warns about similar open complaints without exposing other students’ details', async () => {
    await createUserDirect(User, { name: 'Student B', email: 'b@test.dev', role: 'student' });
    studentB = await loginAs(app, 'b@test.dev');
    const mine = await studentA.get('/api/complaints/precheck').query({ category: String(elecCat._id), location: 'block b, lab 3' });
    expect(mine.body.data.duplicates[0].canView).toBe(true);
    expect(mine.body.data.duplicates[0].id).toBe(c1._id);

    const theirs = await studentB.get('/api/complaints/precheck').query({ category: String(elecCat._id), location: 'Block B, Lab 3' });
    expect(theirs.status).toBe(200);
    expect(theirs.body.data.duplicates.length).toBeGreaterThan(0);
    expect(theirs.body.data.duplicates[0]).toMatchObject({ canView: false, id: null, title: null });
  });

  it('keeps a student’s complaints private', async () => {
    expect((await studentB.get(`/api/complaints/${c1._id}`)).status).toBe(403);
    expect((await studentB.patch(`/api/complaints/${c1._id}/status`).send({ status: 'cancelled' })).status).toBe(403);
    const list = await studentB.get('/api/complaints');
    expect(list.body.data).toHaveLength(0);
    const mineList = await studentA.get('/api/complaints');
    expect(mineList.body.pagination.total).toBeGreaterThanOrEqual(10);
  });

  it('supports search, filters and pagination on the server', async () => {
    const search = await studentA.get('/api/complaints').query({ search: 'wi-fi' });
    expect(search.body.data).toHaveLength(1);
    const page = await studentA.get('/api/complaints').query({ limit: 3, page: 2 });
    expect(page.body.data).toHaveLength(3);
    expect(page.body.pagination).toMatchObject({ page: 2, limit: 3 });
    const byCat = await studentA.get('/api/complaints').query({ category: String(itCat._id) });
    expect(byCat.body.pagination.total).toBe(1);
    // regex characters in search are treated literally
    expect((await studentA.get('/api/complaints').query({ search: '.*' })).body.data).toHaveLength(0);
  });

  it('forbids students from using staff/admin routes', async () => {
    expect((await studentA.get('/api/admin/dashboard')).status).toBe(403);
    expect((await studentA.patch(`/api/complaints/${c1._id}/assign`).send({ staffId: String(staff._id) })).status).toBe(403);
    expect((await studentA.patch(`/api/complaints/${c1._id}`).send({ priority: 'low' })).status).toBe(403);
  });

  it('lets a student cancel an early complaint but not resolve one', async () => {
    const created = (await studentA.post('/api/complaints').send(complaintBody({ title: 'Cancel me please', location: 'Cancel room' }))).body.data.complaint;
    expect((await studentA.patch(`/api/complaints/${created._id}/status`).send({ status: 'resolved', comment: 'done' })).status).toBe(400);
    const cancelled = await studentA.patch(`/api/complaints/${created._id}/status`).send({ status: 'cancelled', comment: 'Fixed itself' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.complaint.status).toBe('cancelled');
  });
});

describe('assignment, staff workflow, history and notifications', () => {
  let c;
  beforeAll(async () => {
    const res = await studentA.post('/api/complaints').send(complaintBody({ title: 'Projector broken in Room 12', category: String(itCat._id), location: 'Room 12' }));
    c = res.body.data.complaint;
  });

  it('keeps staff out of complaints that are not theirs', async () => {
    const staffAgent = await loginAs(app, 'staff@test.dev');
    expect((await staffAgent.get(`/api/complaints/${c._id}`)).status).toBe(403);
    expect((await staffAgent.get('/api/complaints')).body.data).toHaveLength(0);
    expect((await staffAgent.patch(`/api/complaints/${c._id}/status`).send({ status: 'in_progress' })).status).toBe(403);
  });

  it('enforces the workflow order for admins', async () => {
    const adminAgent = await loginAs(app, 'admin@test.dev');
    // cannot jump straight to resolved
    expect((await adminAgent.patch(`/api/complaints/${c._id}/status`).send({ status: 'resolved', comment: 'x' })).status).toBe(400);
    expect((await adminAgent.patch(`/api/complaints/${c._id}/status`).send({ status: 'assigned' })).status).toBe(400);
    expect((await adminAgent.patch(`/api/complaints/${c._id}/status`).send({ status: 'rejected' })).status).toBe(400); // reason required
    const review = await adminAgent.patch(`/api/complaints/${c._id}/status`).send({ status: 'under_review' });
    expect(review.status).toBe(200);
  });

  it('assigns to a department and staff member, and notifies them', async () => {
    const adminAgent = await loginAs(app, 'admin@test.dev');
    const bad = await adminAgent.patch(`/api/complaints/${c._id}/assign`).send({ departmentId: String(itDept._id), staffId: String(otherStaff._id) });
    expect(bad.status).toBe(400); // staff belongs to another department
    const res = await adminAgent.patch(`/api/complaints/${c._id}/assign`).send({ departmentId: String(itDept._id), staffId: String(staff._id), comment: 'Please check today' });
    expect(res.status).toBe(200);
    expect(res.body.data.complaint.status).toBe('assigned');
    expect(res.body.data.complaint.assignedTo.name).toBe('Staff One');
    expect(await Notification.countDocuments({ recipient: staff._id, complaint: c._id })).toBe(1);
    expect(await Notification.countDocuments({ recipient: studentAUser._id, complaint: c._id })).toBeGreaterThan(0);
  });

  it('lets only the assigned staff member work on it, with a mandatory resolution comment', async () => {
    const staffAgent = await loginAs(app, 'staff@test.dev');
    const other = await loginAs(app, 'staff2@test.dev');
    expect((await other.patch(`/api/complaints/${c._id}/status`).send({ status: 'in_progress' })).status).toBe(403);

    expect((await staffAgent.patch(`/api/complaints/${c._id}/status`).send({ status: 'in_progress' })).status).toBe(200);
    expect((await staffAgent.patch(`/api/complaints/${c._id}/status`).send({ status: 'resolved' })).status).toBe(400);
    expect((await staffAgent.patch(`/api/complaints/${c._id}/status`).send({ status: 'closed' })).status).toBe(400);
    const done = await staffAgent.patch(`/api/complaints/${c._id}/status`).send({ status: 'resolved', comment: 'Replaced the projector lamp' });
    expect(done.status).toBe(200);
    expect(done.body.data.complaint.resolvedAt).toBeTruthy();
    expect(done.body.data.complaint.resolutionNotes).toBe('Replaced the projector lamp');
    expect(done.body.data.complaint.sla.state).toMatch(/met|missed/);
  });

  it('records a complete timeline and notifies the student', async () => {
    const detail = await studentA.get(`/api/complaints/${c._id}`);
    expect(detail.status).toBe(200);
    const h = detail.body.data.history;
    expect(h.map((x) => x.action)).toEqual(['created', 'status_changed', 'assigned', 'status_changed', 'status_changed']);
    expect(h[h.length - 1]).toMatchObject({ previousStatus: 'in_progress', newStatus: 'resolved' });
    expect(h[1].actor.name).toBe('Admin');
    const notes = await studentA.get('/api/notifications');
    expect(notes.body.unreadCount).toBeGreaterThan(0);
    const first = notes.body.data[0];
    expect((await studentB.patch(`/api/notifications/${first._id}/read`)).status).toBe(404); // not B's notification
    expect((await studentA.patch(`/api/notifications/${first._id}/read`)).status).toBe(200);
    const all = await studentA.patch('/api/notifications/read-all');
    expect(all.status).toBe(200);
    expect((await studentA.get('/api/notifications')).body.unreadCount).toBe(0);
  });

  it('accepts one rating per resolution and a new one only after a reopen', async () => {
    expect((await studentB.post(`/api/complaints/${c._id}/feedback`).send({ rating: 5 })).status).toBe(403);
    expect((await studentA.post(`/api/complaints/${c._id}/feedback`).send({ rating: 6 })).status).toBe(400);
    const ok = await studentA.post(`/api/complaints/${c._id}/feedback`).send({ rating: 4, comment: 'Good job' });
    expect(ok.status).toBe(201);
    expect((await studentA.post(`/api/complaints/${c._id}/feedback`).send({ rating: 5 })).status).toBe(409);

    // reopen with reason -> resolve again -> may rate again
    expect((await studentA.post(`/api/complaints/${c._id}/reopen`).send({})).status).toBe(400);
    const reopened = await studentA.post(`/api/complaints/${c._id}/reopen`).send({ reason: 'The projector is flickering again' });
    expect(reopened.status).toBe(200);
    expect(reopened.body.data.complaint.status).toBe('reopened');
    expect(reopened.body.data.complaint.resolvedAt).toBeNull();

    const staffAgent = await loginAs(app, 'staff@test.dev');
    await staffAgent.patch(`/api/complaints/${c._id}/status`).send({ status: 'in_progress' });
    await staffAgent.patch(`/api/complaints/${c._id}/status`).send({ status: 'resolved', comment: 'Fixed the wiring' });
    expect((await studentA.post(`/api/complaints/${c._id}/feedback`).send({ rating: 5 })).status).toBe(201);
  });

  it('prevents feedback before resolution', async () => {
    const fresh = (await studentA.post('/api/complaints').send(complaintBody({ title: 'Fresh complaint here', location: 'Fresh room' }))).body.data.complaint;
    expect((await studentA.post(`/api/complaints/${fresh._id}/feedback`).send({ rating: 5 })).status).toBe(400);
    expect((await studentA.post(`/api/complaints/${fresh._id}/reopen`).send({ reason: 'not resolved yet' })).status).toBe(400);
  });
});

describe('SLA, admin controls and analytics', () => {
  it('shows overdue complaints and filters by overdue', async () => {
    const adminAgent = await loginAs(app, 'admin@test.dev');
    const created = (await studentA.post('/api/complaints').send(complaintBody({ title: 'Overdue complaint test', location: 'Overdue room' }))).body.data.complaint;
    await Complaint.updateOne({ _id: created._id }, { targetResolutionAt: new Date(Date.now() - 3 * 3600 * 1000) });

    const detail = await adminAgent.get(`/api/complaints/${created._id}`);
    expect(detail.body.data.complaint.sla.isOverdue).toBe(true);
    expect(detail.body.data.complaint.sla.state).toBe('overdue');
    const overdue = await adminAgent.get('/api/complaints').query({ overdue: 'true' });
    expect(overdue.body.data.map((x) => x._id)).toContain(created._id);
  });

  it('lets admins override priority (stored as final) and re-derives the target', async () => {
    const adminAgent = await loginAs(app, 'admin@test.dev');
    const created = (await studentA.post('/api/complaints').send(complaintBody({ title: 'Priority override test', description: 'A small issue with a loose notice board.', category: String(itCat._id), location: 'Corridor' }))).body.data.complaint;
    const res = await adminAgent.patch(`/api/complaints/${created._id}`).send({ priority: 'critical' });
    expect(res.status).toBe(200);
    expect(res.body.data.complaint.priority).toBe('critical');
    expect(res.body.data.complaint.suggestedPriority).toBe(created.suggestedPriority);
    expect(res.body.data.complaint.prioritySource).toBe('admin');
  });

  it('validates SLA settings and applies them to new complaints', async () => {
    const adminAgent = await loginAs(app, 'admin@test.dev');
    expect((await adminAgent.patch('/api/admin/sla-settings').send({ low: 10, medium: 20, high: 30, critical: 40 })).status).toBe(400);
    const ok = await adminAgent.patch('/api/admin/sla-settings').send({ low: 200, medium: 100, high: 50, critical: 2 });
    expect(ok.status).toBe(200);
    expect((await adminAgent.get('/api/admin/sla-settings')).body.data.critical).toBe(2);
    await adminAgent.patch('/api/admin/sla-settings').send({ low: 120, medium: 72, high: 24, critical: 8 }); // restore
  });

  it('computes dashboard analytics from real records', async () => {
    const adminAgent = await loginAs(app, 'admin@test.dev');
    const res = await adminAgent.get('/api/admin/dashboard');
    expect(res.status).toBe(200);
    const d = res.body.data;
    const dbTotal = await Complaint.countDocuments();
    expect(d.totals.total).toBe(dbTotal);
    expect(d.byStatus.reduce((s, x) => s + x.count, 0)).toBe(dbTotal);
    expect(d.byCategory.reduce((s, x) => s + x.count, 0)).toBe(dbTotal);
    expect(d.totals.overdue).toBeGreaterThanOrEqual(1);
    expect(d.monthly.reduce((s, m) => s + m.created, 0)).toBe(dbTotal);
    expect(d.resolution.resolvedCount).toBeGreaterThanOrEqual(1);
    expect(d.resolution.avgResolutionHours).not.toBeNull();
    expect(d.departments.length).toBeGreaterThanOrEqual(1);

    const reports = await adminAgent.get('/api/admin/reports');
    expect(reports.status).toBe(200);
    expect(reports.body.data.staff.length).toBeGreaterThanOrEqual(1);
  });

  it('protects the last administrator and the admin’s own account', async () => {
    const adminAgent = await loginAs(app, 'admin@test.dev');
    const self = await adminAgent.patch(`/api/admin/users/${admin._id}`).send({ isActive: false });
    expect(self.status).toBe(400);
    const demote = await adminAgent.patch(`/api/admin/users/${admin._id}`).send({ role: 'student' });
    expect(demote.status).toBe(400);
  });

  it('lets an admin create staff accounts and manage users', async () => {
    const adminAgent = await loginAs(app, 'admin@test.dev');
    const noDept = await adminAgent.post('/api/admin/users').send({ name: 'New Staff', email: 'new.staff@test.dev', password: PASSWORD, role: 'staff' });
    expect(noDept.status).toBe(400);
    const res = await adminAgent.post('/api/admin/users').send({ name: 'New Staff', email: 'new.staff@test.dev', password: PASSWORD, role: 'staff', departmentId: String(itDept._id) });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('staff');
    const list = await adminAgent.get('/api/admin/users').query({ role: 'staff', search: 'new.staff' });
    expect(list.body.data).toHaveLength(1);
    const disabled = await adminAgent.patch(`/api/admin/users/${res.body.data.user._id}`).send({ isActive: false });
    expect(disabled.body.data.user.isActive).toBe(false);
    expect((await makeAgent(app).post('/api/auth/login').send({ email: 'new.staff@test.dev', password: PASSWORD })).status).toBe(403);
  });

  it('manages departments and categories', async () => {
    const adminAgent = await loginAs(app, 'admin@test.dev');
    const dept = await adminAgent.post('/api/admin/departments').send({ name: 'Security', description: 'Campus security' });
    expect(dept.status).toBe(201);
    expect((await adminAgent.post('/api/admin/departments').send({ name: 'Security' })).status).toBe(409);
    const cat = await adminAgent.post('/api/admin/categories').send({ name: 'Parking', defaultResolutionHours: 48 });
    expect(cat.status).toBe(201);
    const off = await adminAgent.patch(`/api/admin/categories/${cat.body.data._id}`).send({ isActive: false });
    expect(off.body.data.isActive).toBe(false);
    // an inactive category can no longer be used for new complaints
    const res = await studentA.post('/api/complaints').send(complaintBody({ category: cat.body.data._id }));
    expect(res.status).toBe(400);
  });

  it('returns 404 JSON for unknown routes and never leaks stack traces', async () => {
    const res = await studentA.get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.js/);
  });
});
