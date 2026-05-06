import mongoose from 'mongoose';
import type { UserLearningData } from '../types.js';

const userWordSchema = new mongoose.Schema<UserLearningData>({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  wordId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Word' },
  english: { type: String, required: true },
  easeFactor: { type: Number, required: true, default: 2.5 },
  lastLearned: { type: String },
  interval: { type: Number, required: true, default: 0 },
  dueDate: { type: String },
  repetition: { type: Number, required: true, default: 0 },
  favorited: { type: Boolean, required: true, default: false },
});

userWordSchema.index({ userId: 1, wordId: 1 }, { unique: true });

export default mongoose.model<UserLearningData>('UserWord', userWordSchema);
