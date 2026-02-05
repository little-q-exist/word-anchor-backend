import mongoose from 'mongoose';
import dayjs from 'dayjs';

import { supermemo } from '../algo/SM-2.js';

export interface UserLearningData {
  easeFactor: number;
  lastLearned: string;
  interval: number;
  dueDate: string;
  repetition: number;

  favorited: boolean;

  wordId: mongoose.Types.ObjectId;
}

export const defaultUserLearningData = {
  easeFactor: 2.5,
  lastLearned: dayjs(Date.now()).toISOString(),
  interval: 0,
  dueDate: dayjs(Date.now()).toISOString(),
  repetition: 0,
  favorited: false,
};

export interface LearnReturnItem {
  data: UserLearningData;
  shouldRepeat: boolean;
}

export const learn = (data: UserLearningData, quality: number): LearnReturnItem => {
  const { easeFactor, interval, repetition, shouldRepeat } = supermemo(data, quality);
  const lastLearned = dayjs(Date.now()).toISOString();
  const dueDate = dayjs(lastLearned).add(interval, 'day').toISOString();
  data.easeFactor = easeFactor;
  data.repetition = repetition;
  data.interval = interval;
  data.lastLearned = lastLearned;
  data.dueDate = dueDate;
  return { data, shouldRepeat };
};

export interface NewUser {
  username: string;
  email?: string;
  password: string;
}

export interface User {
  username: string;
  email?: string;
  passwordHash: string;
  userLearningData: UserLearningData[];
  isAdmin: boolean;
}

const userSchema = new mongoose.Schema<User>({
  username: { type: String, required: true, index: 1 },
  email: String,
  passwordHash: { type: String, required: true },
  userLearningData: {
    type: [
      {
        wordId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Word' },
        easeFactor: { type: Number, required: true, default: 2.5 },
        lastLearned: { type: String, required: true, default: dayjs().toISOString() },
        interval: { type: Number, required: true, default: 0 },
        dueDate: { type: String, required: true, default: dayjs().toISOString() },
        repetition: { type: Number, required: true, default: 0 },

        favorited: { type: Boolean, required: true, default: false },
      },
    ],
    default: [],
  },
  isAdmin: { type: Boolean, required: true, default: false },
});

export default mongoose.model<User>('User', userSchema);
