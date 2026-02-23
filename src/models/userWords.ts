import mongoose from 'mongoose';
import dayjs from 'dayjs';

export interface UserLearningData {
  userId: mongoose.Types.ObjectId;
  wordId: mongoose.Types.ObjectId;
  easeFactor: number;
  lastLearned: string;
  interval: number;
  dueDate: string;
  repetition: number;
  favorited: boolean;
}

export const defaultUserLearningData = {
  easeFactor: 2.5,
  lastLearned: dayjs(Date.now()).toISOString(),
  interval: 0,
  dueDate: dayjs(Date.now()).toISOString(),
  repetition: 0,
  favorited: false,
};

const userWordSchema = new mongoose.Schema<UserLearningData>({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  wordId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Word' },
  easeFactor: { type: Number, required: true, default: 2.5 },
  lastLearned: { type: String, required: true, default: () => dayjs().toISOString() },
  interval: { type: Number, required: true, default: 0 },
  dueDate: { type: String, required: true, default: () => dayjs().toISOString() },
  repetition: { type: Number, required: true, default: 0 },
  favorited: { type: Boolean, required: true, default: false },
});

userWordSchema.index({ userId: 1, wordId: 1 }, { unique: true });

export default mongoose.model<UserLearningData>('UserWord', userWordSchema);
