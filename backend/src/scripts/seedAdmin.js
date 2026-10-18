// Usage: npm run seed:admin   (reads ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD from .env)
import bcrypt from 'bcryptjs';
import { refuseInProduction, seedBaseData } from './seedLib.js';

refuseInProduction('seed:admin');

const { env } = await import('../config/env.js');
const { connectDb, disconnectDb } = await import('../config/db.js');
const { User } = await import('../models/User.js');
const { password: passwordSchema } = await import('../validators/schemas.js');

const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = env;
if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('✖ Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env first.');
  process.exit(1);
}
const pw = passwordSchema.safeParse(ADMIN_PASSWORD);
if (!pw.success || ADMIN_PASSWORD.length < 10) {
  console.error('✖ ADMIN_PASSWORD must be at least 10 characters and contain a letter and a number.');
  process.exit(1);
}

try {
  await connectDb();
  const email = ADMIN_EMAIL.trim().toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`ℹ A user with ${email} already exists (role: ${existing.role}). Nothing changed.`);
  } else {
    await User.create({
      name: ADMIN_NAME.trim(),
      email,
      role: 'admin',
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
    });
    console.log(`✔ Admin created: ${email}`);
  }
  const base = await seedBaseData();
  console.log(`✔ Base data ready (new categories: ${base.categoriesAdded}, new departments: ${base.departmentsAdded})`);
} catch (err) {
  console.error('✖ Seeding failed:', err.message);
  process.exitCode = 1;
} finally {
  await disconnectDb();
}
