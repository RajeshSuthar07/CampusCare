import mongoose from 'mongoose';
import { ROLES } from '../utils/constants.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 120,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'student', required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    registrationNumber: { type: String, trim: true, maxlength: 40, default: undefined },
    phone: { type: String, trim: true, maxlength: 20, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Sparse: many users without a registration number are fine (the field is simply absent),
// but a given registration number can only be used once.
userSchema.index({ registrationNumber: 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ department: 1, role: 1 });

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);
