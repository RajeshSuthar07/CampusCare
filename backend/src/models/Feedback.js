import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

/**
 * Policy: one rating per "resolution cycle". `cycle` equals the complaint's
 * reopenCount at the time of rating, so a complaint that is reopened and
 * resolved again may be rated once more, but never twice for the same cycle.
 */
const feedbackSchema = new mongoose.Schema(
  {
    complaint: { type: ObjectId, ref: 'Complaint', required: true },
    student: { type: ObjectId, ref: 'User', required: true },
    cycle: { type: Number, default: 0, min: 0 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

feedbackSchema.index({ complaint: 1, cycle: 1 }, { unique: true });
feedbackSchema.index({ createdAt: -1 });

export const Feedback = mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);
