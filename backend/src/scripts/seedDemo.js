// DEMO DATA - development only. Usage: npm run seed:demo
// Creates clearly labelled demo accounts (password: Demo@12345) and sample complaints
// in every status, including overdue ones, for local development and screenshots.
import bcrypt from 'bcryptjs';
import { refuseInProduction, seedBaseData } from './seedLib.js';

refuseInProduction('seed:demo');

const { connectDb, disconnectDb } = await import('../config/db.js');
const { User } = await import('../models/User.js');
const { Department } = await import('../models/Department.js');
const { Category } = await import('../models/Category.js');
const { Complaint } = await import('../models/Complaint.js');
const { ComplaintHistory } = await import('../models/ComplaintHistory.js');
const { Feedback } = await import('../models/Feedback.js');
const { Notification } = await import('../models/Notification.js');
const { getSlaHours } = await import('../models/Setting.js');
const { suggestPriority } = await import('../utils/priority.js');
const { computeTargetDate, computeTargetHours } = await import('../utils/sla.js');
const { generateComplaintNumber } = await import('../services/complaintService.js');

const DEMO_PASSWORD = 'Demo@12345';
const H = 3600 * 1000;
const ago = (hours) => new Date(Date.now() - hours * H);

try {
  await connectDb();
  await seedBaseData();
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const dept = Object.fromEntries((await Department.find().lean()).map((d) => [d.name, d]));
  const cat = Object.fromEntries((await Category.find().lean()).map((c) => [c.name, c]));
  const sla = await getSlaHours();

  async function upsertUser(data) {
    return (
      (await User.findOne({ email: data.email })) ??
      (await User.create({ ...data, passwordHash: hash }))
    );
  }

  const admin = await upsertUser({ name: 'Demo Admin', email: 'demo.admin@campuscare.test', role: 'admin' });
  const itStaff = await upsertUser({ name: 'Demo Staff (IT)', email: 'demo.staff.it@campuscare.test', role: 'staff', department: dept['IT Services']._id });
  const elecStaff = await upsertUser({ name: 'Demo Staff (Electrical)', email: 'demo.staff.electrical@campuscare.test', role: 'staff', department: dept['Electrical Maintenance']._id });
  const cleanStaff = await upsertUser({ name: 'Demo Staff (Housekeeping)', email: 'demo.staff.cleaning@campuscare.test', role: 'staff', department: dept['Housekeeping']._id });
  const s1 = await upsertUser({ name: 'Demo Student One', email: 'demo.student1@campuscare.test', role: 'student', registrationNumber: 'DEMO-0001' });
  const s2 = await upsertUser({ name: 'Demo Student Two', email: 'demo.student2@campuscare.test', role: 'student', registrationNumber: 'DEMO-0002' });

  if (await Complaint.exists({ createdBy: { $in: [s1._id, s2._id] } })) {
    console.log('ℹ Demo complaints already exist - skipping sample complaint creation.');
  } else {
    // [title, description, category, location, student, ageHours, status, staff, dept, resolvedAfterHours, rating]
    const samples = [
      ['Complete power failure in Lab 3', 'The entire computer lab lost power and practical exams are scheduled tomorrow. Nothing works.', 'Electricity', 'Block B, Lab 3', s1, 30, 'in_progress', elecStaff, 'Electrical Maintenance'],
      ['Wi-Fi down in library reading hall', 'No internet at all on the second floor reading hall since morning.', 'IT and Wi-Fi', 'Library, 2nd floor', s2, 5, 'assigned', itStaff, 'IT Services'],
      ['Projector not working in Room 204', 'The projector does not turn on, which disrupts lectures.', 'Classroom Facilities', 'Room 204', s1, 52, 'under_review', null, null],
      ['Loose chair in seminar hall', 'A small issue: one chair is slightly loose and squeaks.', 'Classroom Facilities', 'Seminar Hall', s2, 2, 'submitted', null, null],
      ['Water leakage near washroom', 'Water is leaking in the corridor near the ground floor washroom, floor is slippery.', 'Water Supply', 'Block A, Ground floor', s1, 200, 'resolved', cleanStaff, 'Housekeeping', 20, 5],
      ['Lab PCs very slow', 'Several lab computers are faulty and crash during practicals.', 'Laboratory Equipment', 'Block C, Lab 1', s2, 300, 'closed', itStaff, 'IT Services', 40, 4],
      ['Canteen hygiene concern', 'Tables are not being cleaned properly during lunch hours.', 'Canteen', 'Main canteen', s1, 120, 'rejected', null, null],
      ['Fan not working in Room 101', 'The ceiling fan is not working and the room gets very hot.', 'Classroom Facilities', 'Room 101', s2, 400, 'resolved', elecStaff, 'Electrical Maintenance', 120, 3],
    ];

    for (const [title, description, catName, location, student, ageH, status, staff, deptName, resolvedAfter, rating] of samples) {
      const createdAt = ago(ageH);
      const sug = suggestPriority({ categoryName: catName, title, description });
      const target = computeTargetDate(createdAt, computeTargetHours(sug.priority, sla, cat[catName].defaultResolutionHours));
      const resolvedAt = resolvedAfter ? new Date(createdAt.getTime() + resolvedAfter * H) : null;

      const c = await Complaint.create({
        complaintNumber: await generateComplaintNumber(createdAt),
        title, description, location,
        category: cat[catName]._id,
        createdBy: student._id,
        priority: sug.priority,
        suggestedPriority: sug.priority,
        prioritySource: 'rules',
        status,
        assignedTo: staff?._id ?? null,
        assignedDepartment: deptName ? dept[deptName]._id : null,
        targetResolutionAt: target,
        resolvedAt,
        closedAt: status === 'closed' ? resolvedAt : null,
        resolutionNotes: resolvedAt ? 'Issue fixed and verified on site.' : status === 'rejected' ? 'Hygiene audit found no issue.' : '',
        createdAt,
        updatedAt: resolvedAt ?? createdAt,
      });

      const hist = [{ actor: student._id, action: 'created', newStatus: 'submitted', comment: 'Complaint submitted', createdAt }];
      if (status !== 'submitted') hist.push({ actor: admin._id, action: 'status_changed', previousStatus: 'submitted', newStatus: 'under_review', comment: '', createdAt: new Date(createdAt.getTime() + 1 * H) });
      if (staff) hist.push({ actor: admin._id, action: 'assigned', previousStatus: 'under_review', newStatus: 'assigned', comment: `Assigned to ${staff.name}`, createdAt: new Date(createdAt.getTime() + 2 * H) });
      if (['in_progress', 'resolved', 'closed'].includes(status)) hist.push({ actor: staff._id, action: 'status_changed', previousStatus: 'assigned', newStatus: 'in_progress', comment: '', createdAt: new Date(createdAt.getTime() + 3 * H) });
      if (resolvedAt) hist.push({ actor: staff._id, action: 'status_changed', previousStatus: 'in_progress', newStatus: 'resolved', comment: 'Issue fixed and verified on site.', createdAt: resolvedAt });
      if (status === 'closed') hist.push({ actor: admin._id, action: 'status_changed', previousStatus: 'resolved', newStatus: 'closed', comment: '', createdAt: new Date(resolvedAt.getTime() + H) });
      if (status === 'rejected') hist.push({ actor: admin._id, action: 'status_changed', previousStatus: 'under_review', newStatus: 'rejected', comment: 'Hygiene audit found no issue.', createdAt: new Date(createdAt.getTime() + 4 * H) });
      await ComplaintHistory.insertMany(hist.map((h) => ({ ...h, complaint: c._id })));

      if (rating) await Feedback.create({ complaint: c._id, student: student._id, cycle: 0, rating, comment: rating >= 4 ? 'Quick and clean fix, thank you.' : 'Fixed, but it took a while.' });
      await Notification.create({ recipient: student._id, complaint: c._id, title: `${c.complaintNumber}: ${status.replace('_', ' ')}`, message: `Your complaint "${title}" is now ${status.replace('_', ' ')}.` });
    }
    console.log(`✔ Created ${samples.length} sample complaints`);
  }

  console.log('\nDEMO accounts (development only, password for all: ' + DEMO_PASSWORD + ')');
  for (const u of [admin, itStaff, elecStaff, cleanStaff, s1, s2]) console.log(`  ${u.role.padEnd(8)} ${u.email}`);
} catch (err) {
  console.error('✖ Demo seeding failed:', err);
  process.exitCode = 1;
} finally {
  await disconnectDb();
}
