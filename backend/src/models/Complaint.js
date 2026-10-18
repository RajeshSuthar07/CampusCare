import mongoose from 'mongoose';
import { PRIORITIES, STATUSES } from '../utils/constants.js';

const { ObjectId } = mongoose.Schema.Types;

const complaintSchema = new mongoose.Schema(
  {
    complaintNumber: { type: String, required: true, unique: true, immutable: true },
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 120 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    category: { type: ObjectId, ref: 'Category', required: true },
    location: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    imageUrl: { type: String, default: null },
    createdBy: { type: ObjectId, ref: 'User', required: true, immutable: true },
    assignedDepartment: { type: ObjectId, ref: 'Department', default: null },
    assignedTo: { type: ObjectId, ref: 'User', default: null },
    priority: { type: String, enum: PRIORITIES, required: true },
    suggestedPriority: { type: String, enum: PRIORITIES, required: true },
    prioritySource: { type: String, enum: ['student', 'rules', 'admin'], default: 'rules' },
    status: { type: String, enum: STATUSES, default: 'submitted', required: true },
    targetResolutionAt: { type: Date, required: true },
    resolutionNotes: { type: String, trim: true, maxlength: 2000, default: '' },
    resolvedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    // Number of times the student reopened this complaint (used by the feedback policy)
    reopenCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

complaintSchema.index({ createdBy: 1, createdAt: -1 });
complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ assignedTo: 1, status: 1 });
complaintSchema.index({ assignedDepartment: 1, status: 1 });
complaintSchema.index({ category: 1, location: 1, status: 1, createdAt: -1 });
complaintSchema.index({ status: 1, targetResolutionAt: 1 });

export const Complaint =
  mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);
