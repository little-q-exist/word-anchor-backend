import mongoose from 'mongoose';

export interface UserLearningData {
  userId: mongoose.Types.ObjectId;
  wordId: mongoose.Types.ObjectId;
  english: string;
  easeFactor: number;
  lastLearned?: string;
  interval: number;
  dueDate?: string;
  repetition: number;
  favorited: boolean;
}
