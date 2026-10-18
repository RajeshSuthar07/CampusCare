import { Category } from '../models/Category.js';
import { Department } from '../models/Department.js';
import { DEFAULT_CATEGORIES, DEFAULT_DEPARTMENTS } from '../utils/constants.js';

/** Idempotent: existing rows are left untouched (admins may have edited them). */
export async function seedBaseData() {
  const catOps = DEFAULT_CATEGORIES.map((c) => ({
    updateOne: { filter: { name: c.name }, update: { $setOnInsert: c }, upsert: true },
  }));
  const deptOps = DEFAULT_DEPARTMENTS.map((d) => ({
    updateOne: { filter: { name: d.name }, update: { $setOnInsert: d }, upsert: true },
  }));
  const [c, d] = await Promise.all([Category.bulkWrite(catOps), Department.bulkWrite(deptOps)]);
  return { categoriesAdded: c.upsertedCount, departmentsAdded: d.upsertedCount };
}

export function refuseInProduction(scriptName) {
  if (process.env.NODE_ENV === 'production') {
    console.error(`✖ ${scriptName} is development-only and refuses to run with NODE_ENV=production.`);
    console.error('  Run it from your own machine (NODE_ENV unset) with MONGODB_URI pointing at the target database.');
    process.exit(1);
  }
}
