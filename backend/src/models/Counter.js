import mongoose from 'mongoose';

/** Atomic counters (used for complaint numbers: one counter per year). */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

/**
 * Atomically increment and return the next sequence value. Safe under concurrency.
 *
 * Two requests may try to create the very first counter document at the same moment;
 * the loser gets a duplicate-key error on _id. The document exists by then, so a
 * retry simply increments it.
 */
export async function nextSequence(key, attempts = 6) {
  for (let i = 0; ; i++) {
    try {
      const doc = await Counter.findOneAndUpdate(
        { _id: key },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: 'after' }
      );
      return doc.seq;
    } catch (err) {
      if (err?.code === 11000 && i < attempts) continue;
      throw err;
    }
  }
}
