import mongoose from 'mongoose';
import { STATUSES } from '../utils/constants.js';

const { ObjectId } = mongoose.Schema.Types;

export const HISTORY_ACTIONS = [
  'created',
  'status_changed',
  'assigned',
  'priority_changed',
  'comment',
  'reopened',
  'feedback',
  'updated',
];

const historySchema = new mongoose.Schema(
  {
    complaint: { type: ObjectId, ref: 'Complaint', required: true, index: true },
    actor: { type: ObjectId, ref: 'User', required: true },
    action: { type: String, enum: HISTORY_ACTIONS, required: true },
    previousStatus: { type: String, enum: [...STATUSES, null], default: null },
    newStatus: { type: String, enum: [...STATUSES, null], default: null },
    comment: { type: String, trim: true, maxlength: 2000, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

historySchema.index({ complaint: 1, createdAt: 1 });

export const ComplaintHistory =
  mongoose.models.ComplaintHistory || mongoose.model('ComplaintHistory', historySchema);
