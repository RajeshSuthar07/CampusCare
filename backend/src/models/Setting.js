import mongoose from 'mongoose';
import { DEFAULT_SLA_HOURS } from '../utils/constants.js';

const settingSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export const Setting = mongoose.models.Setting || mongoose.model('Setting', settingSchema);

/** SLA hours per priority. Falls back to defaults when never configured. */
export async function getSlaHours() {
  const doc = await Setting.findById('sla').lean();
  return { ...DEFAULT_SLA_HOURS, ...(doc?.value || {}) };
}

export async function setSlaHours(hours) {
  const doc = await Setting.findByIdAndUpdate(
    'sla',
    { value: hours },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  ).lean();
  return { ...DEFAULT_SLA_HOURS, ...doc.value };
}
